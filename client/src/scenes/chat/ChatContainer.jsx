import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import ApiConfig from '../../components/apiConfig';
import { Icon } from '@iconify/react';
import { io } from 'socket.io-client';
import _ from 'lodash';
import { decryptMessage, getChatKey } from '../../utils/encryption';
import { onMessageListener } from '../../firebase-config';
import { toast } from 'react-toastify';
import { showNotification } from '../../components/Notifikacija';
import { onMessage } from 'firebase/messaging';
import { messaging } from '../../firebase-config';
import styles from './ChatContainer.module.css';
import DocumentDetailsPopup from '../documents/DocumentDetailsPopup';
import VideoCall from '../../components/VideoCall';
import * as emoji from 'node-emoji';
import moment from 'moment';

// Add call message styles
const callMessageStyles = `
.call-message {
  border-radius: 8px;
  padding: 10px;
  transition: all 0.2s ease;
}

.call-action-hint {
  color: var(--tekst);
  font-weight: bold;
  margin-top: 5px;
  font-size: 0.85em;
  text-align: center;
}
`;

const formatTimeShort = (timestamp) => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString("hr-HR", { hour: "2-digit", minute: "2-digit" });
};

const formatTimeFull = (timestamp) => {
  const date = new Date(timestamp);
  return date.toLocaleString("hr-HR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
};

const ChatContainer = ({
  messages = [],
  handleSendMessage,
  selectedChat,
  user,
  setMessages,
  onMessageUpdate,
  onSendMessage,
  messagesEndRef,
  isRateLimited,
  setIsRateLimited,
  rateLimitTimer,
  setRateLimitTimer,
  socket: externalSocket,
  showVideoCall,
  onEndVideoCall,
  onCallMessageClick
}) => {
  const [socket, setSocket] = useState(externalSocket);
  const [hoveredMessage, setHoveredMessage] = useState(null);
  const [clickedMessage, setClickedMessage] = useState(null);
  const [replyTo, setReplyTo] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [deleteModal, setDeleteModal] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef(null);
  const [notification, setNotification] = useState(null);
  const inputRef = useRef(null);
  const [displayMessages, setDisplayMessages] = useState([]);
  const [firstUnreadIndex, setFirstUnreadIndex] = useState(-1);
  const [showDocumentDetails, setShowDocumentDetails] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [documentCache, setDocumentCache] = useState({});

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Initialize socket connection
  useEffect(() => {
    if (!user?.id || socket) return;

    const socketUrl = import.meta.env.PROD
      ? 'https://musicartincubator-cadenza.onrender.com'
      : 'http://localhost:5000';

    const newSocket = io(socketUrl, {
      withCredentials: true,
      transports: ['polling', 'websocket'],
      path: '/socket.io/',
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      autoConnect: true,
      auth: { userId: user.id }
    });

    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);

      // Only try transport fallback once
      if (!newSocket.recovered && newSocket.io.opts.transports[0] === 'websocket') {
        console.log('Falling back to polling transport');
        newSocket.io.opts.transports = ['polling', 'websocket'];
      }
    });

    newSocket.on('connect', () => {
      console.log('Socket connected successfully');
      newSocket.emit('join', user.id);
    });

    newSocket.on('newMessage', (message) => {
      console.log('Received new message:', message);
      // Ensure message has all required properties
      const formattedMessage = {
        ...message,
        sender: message.senderType === 'Mentor' ? null : message.sender,
        senderMentor: message.senderType === 'Mentor' ? message.senderMentor : null,
        read: message.senderId === user.id
      };
      setMessages(prev => [...prev, formattedMessage]);
    });

    newSocket.on('newGroupMessage', (message) => {
      console.log('Received new group message:', message);
      // Handle both wrapped and unwrapped message formats
      const messageData = message.message || message;
      // Ensure group message has all required properties
      const formattedMessage = {
        ...messageData,
        sender: messageData.senderType === 'Mentor' ? null : messageData.sender,
        senderMentor: messageData.senderType === 'Mentor' ? messageData.senderMentor : null,
        read: messageData.senderId === user.id,
        groupName: message.groupName // Preserve group name from socket data
      };
      setMessages(prev => [...prev, formattedMessage]);
    });

    newSocket.on('error', (error) => {
      console.error('Socket error:', error);
      // Attempt to reconnect after error
      setTimeout(() => {
        newSocket.connect();
      }, 1000);
    });

    newSocket.on('reconnect', (attemptNumber) => {
      console.log('Reconnected after', attemptNumber, 'attempts');
      if (user?.id) {
        newSocket.emit('join', user.id);
      }
    });

    newSocket.on('reconnect_error', (error) => {
      console.error('Reconnection error:', error);
    });

    newSocket.on('reconnect_failed', () => {
      console.error('Failed to reconnect');
    });

    setSocket(newSocket);

    // Debounce typing events
    const debouncedTyping = _.debounce(() => {
      if (socket && selectedChat) {
        socket.emit('typing', {
          senderId: user.id,
          recipientId: selectedChat.id
        });
      }
    }, 300);

    // Handle input change with debouncing
    const handleInputChange = (e) => {
      setNewMessage(e.target.value);
      debouncedTyping();
    };

    return () => {
      if (newSocket) {
        newSocket.removeAllListeners();
        newSocket.close();
      }
      debouncedTyping.cancel();
    };
  }, [user?.id, socket]);

  // Update socket when external socket changes
  useEffect(() => {
    if (externalSocket) {
      setSocket(externalSocket);
    }
  }, [externalSocket]);

  // Modify the typing event handlers
  const handleTyping = () => {
    if (!socket || !selectedChat) return;

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Only emit if not already typing
    if (!isTyping) {
      socket.emit('typing', {
        senderId: user.id,
        recipientId: selectedChat.id
      });
      setIsTyping(true);
    }

    // Set new timeout
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('stopTyping', {
        senderId: user.id,
        recipientId: selectedChat.id
      });
      setIsTyping(false);
    }, 2000);
  };

  // Update the input handler
  const handleInputChange = (e) => {
    const value = e.target.value;
    setNewMessage(value);
    handleTyping();

    // Check for @dokument mention
    const words = value.split(' ');
    const lastWord = words[words.length - 1];

    if (lastWord.startsWith('@dokument:')) {
      setIsSearchingDocuments(true);
      const searchTerm = lastWord.replace('@dokument:', '').trim();
      if (searchTerm) {
        fetchDocumentSuggestions(searchTerm);
      } else {
        setShowDocumentSuggestions(true);
        fetchRecentDocuments();
      }
    } else {
      setShowDocumentSuggestions(false);
      setIsSearchingDocuments(false);
    }
  };

  // Clean up typing timeout on unmount or chat change
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (socket) {
        socket.emit('stopTyping', {
          senderId: user.id,
          recipientId: selectedChat?.id
        });
      }
    };
  }, [selectedChat, socket, user.id]);

  // Update the socket event listeners
  useEffect(() => {
    if (!socket || !selectedChat) return;

    const handleUserTyping = ({ senderId }) => {
      if (senderId === selectedChat.id) {
        setIsTyping(true);
      }
    };

    const handleUserStoppedTyping = ({ senderId }) => {
      if (senderId === selectedChat.id) {
        setIsTyping(false);
      }
    };

    socket.on('userTyping', handleUserTyping);
    socket.on('userStoppedTyping', handleUserStoppedTyping);

    return () => {
      socket.off('userTyping', handleUserTyping);
      socket.off('userStoppedTyping', handleUserStoppedTyping);
    };
  }, [socket, selectedChat]);

  const handleDeleteMessage = async (messageId) => {
    try {
      const token = localStorage.getItem('token');
      await ApiConfig.api.delete(`/api/messages/${messageId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      onMessageUpdate(messageId, 'delete');
      setClickedMessage(null);
      setDeleteModal(null);
    } catch (error) {
      console.error('Error deleting message:', error);
    }
  };

  const handleReply = (message) => {
    const replyData = onMessageUpdate(message.id, 'reply', message);
    if (replyData) {
      setReplyTo({
        id: message.id,
        text: message.text,
        sender: message.sender
      });
      // Focus the input field
      inputRef.current?.focus();
    }
  };

  const handleSend = async () => {
    const trimmedMessage = newMessage.trim();
    if (!trimmedMessage) {
      toast.error('Message cannot be empty');
      return;
    }

    if (trimmedMessage.length > 2000) {
      toast.error('Message cannot be longer than 2000 characters');
      return;
    }

    try {
      const messageText = trimmedMessage;
      setNewMessage('');

      // Use replyTo.id as the replyToId if replying
      const sentMessage = await handleSendMessage(
        messageText,
        replyTo ? replyTo.id : null
      );

      // Clear reply state after sending
      setReplyTo(null);

      // Scroll to bottom after sending
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (error) {
      console.error('Error sending message:', error);

      // Check if it's a rate limit error
      if (error.response?.data?.error?.includes('Too many messages')) {
        setIsRateLimited(true);
        toast.error('Prekoračili ste limit poruka. Sačekajte minutu prije slanja novih poruka.', {
          autoClose: 60000 // Show for full minute
        });

        // Start a timer to re-enable sending after 1 minute
        const timer = setTimeout(() => {
          setIsRateLimited(false);
          toast.success('Možete ponovo slati poruke.');
        }, 60000);

        setRateLimitTimer(timer);
      } else {
        toast.error('Greška pri slanju poruke');
      }
    }
  };

  const getSenderName = (sender) => {
    // If sender is just an ID
    if (typeof sender === 'number') {
      return sender === user?.id
        ? `${user.ime} ${user.prezime}`
        : `${sender?.ime} ${sender?.prezime}` || 'Unknown';
    }

    // If sender is an object with id
    if (sender?.id) {
      return sender.id === user?.id
        ? `${user.ime} ${user.prezime}`
        : `${sender?.ime} ${sender?.prezime}` || 'Unknown';
    }

    // If sender is an object without id
    if (sender) {
      return sender === user?.id
        ? `${user.ime} ${user.prezime}`
        : `${sender?.ime} ${sender?.prezime}` || 'Unknown';
    }

    return 'Unknown';
  };

  const handleDeleteClick = (message) => {
    setDeleteModal(message);
    setClickedMessage(null);
  };

  const Message = ({ message, currentUser, onReply, onDelete, onCallMessageClick }) => {
    const [showActions, setShowActions] = useState(false);
    const [showFullTime, setShowFullTime] = useState(false);
    const isSentByCurrentUser = message.senderId === currentUser.id;

    // Check if this is a call message
    const isCallMessage = message.text && message.text.includes('Incoming video call');
    
    return (
      <div
        className={`message ${isSentByCurrentUser ? 'sent' : 'received'} ${message.isDeleted ? 'deleted' : ''}`}
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => setShowActions(false)}
        onClick={() => isCallMessage && !isSentByCurrentUser ? onCallMessageClick(message) : null}
        style={{ cursor: isCallMessage && !isSentByCurrentUser ? 'pointer' : 'default' }}
      >
        <div className="message-header">
          <time className="message-time">
            {showFullTime ? formatTimeFull(message.createdAt) : formatTimeShort(message.createdAt)}
          </time>
        </div>

        {message.replyTo && (
          <div className={isSentByCurrentUser ? 'reply-toSender' : 'reply-to'}>
            <div className="sender-name">
              {getSenderName(message.replyTo.sender)}
            </div>
            <div className="reply-text">{message.replyTo.text}</div>
          </div>
        )}

        <div className="message-content">
          {message.isDeleted ? (
            <p className="deleted-message-text">This message was deleted</p>
          ) : (
            <>
              {message.replyTo && (
                <div className="reply-preview">
                  <p>{message.replyTo.text}</p>
                </div>
              )}
              <div className={isCallMessage ? 'call-message' : ''}>
                <div dangerouslySetInnerHTML={{ __html: formatMessage(message.text) }} />
                {isCallMessage && !isSentByCurrentUser && (
                  <div className="call-action-hint">Click to join call</div>
                )}
              </div>
            </>
          )}
        </div>

        <div className="message-sender">
          {message.senderType === 'Mentor' && message.senderMentor
            ? `${message.senderMentor.ime} ${message.senderMentor.prezime}`
            : message.sender
              ? `${message.sender.ime} ${message.sender.prezime}`
              : 'Unknown'
          }
        </div>

        {showActions && (
          <div className="message-actions">
            <button
              className="action-btn reply-btn"
              onClick={(e) => {
                e.stopPropagation(); // Prevent triggering the time toggle
                onReply(message);
              }}
            >
              <Icon icon="solar:reply-broken" />
            </button>
            {isSentByCurrentUser && (
              <button
                className="action-btn delete-btn"
                onClick={(e) => {
                  e.stopPropagation(); // Prevent triggering the time toggle
                  onDelete(message);
                }}
              >
                <Icon icon="solar:trash-bin-trash-broken" />
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  // Add this function to decrypt messages
  const decryptMessages = (messages, chatId) => {
    const chatKey = getChatKey(chatId);
    if (!chatKey) return messages;

    return messages.map(message => {
      if (message.encrypted && !message.decrypted) {
        try {
          const decryptedText = decryptMessage(message.text, chatKey);
          return {
            ...message,
            originalText: message.text, // Keep encrypted version
            text: decryptedText, // Replace with decrypted text
            decrypted: true
          };
        } catch (error) {
          console.error('Error decrypting message:', error);
          return message;
        }
      }
      return message;
    });
  };

  // In your useEffect for messages
  useEffect(() => {
    if (messages.length > 0 && selectedChat) {
      const decryptedMessages = decryptMessages(messages, selectedChat);
      setDisplayMessages(decryptedMessages);
    } else {
      setDisplayMessages([]);
    }
  }, [messages, selectedChat]);

  // Only show typing indicator if it's the OTHER person typing
  const showTypingIndicator = isTyping && selectedChat?.id !== user.id;

  useEffect(() => {
    const messageHandler = (payload) => {
      console.log('Message received:', payload);
      const messageData = payload.data;
      const currentChatId = selectedChat?.id?.toString();

      if (messageData.chatId !== currentChatId) {
        toast.info(payload.notification.body, {
          position: "top-right",
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          progress: undefined,
          theme: "light",
          style: {
            background: 'var(--iznad)',
            color: 'var(--tekst)',
          }
        });
      }
    };

    const unsubscribe = onMessageListener().then(payload => {
      if (payload) {
        messageHandler(payload);
      }
    });

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [selectedChat]);

  // Find first unread message when messages change
  useEffect(() => {
    if (messages.length > 0) {
      const index = messages.findIndex(msg => !msg.read);
      setFirstUnreadIndex(index);
    }
  }, [messages]);

  // Mark messages as read when scrolled to bottom
  const handleScroll = (e) => {
    const element = e.target;
    if (element.scrollHeight - element.scrollTop === element.clientHeight) {
      // At bottom, mark messages as read
      markMessagesAsRead();
    }
  };

  const markMessagesAsRead = async () => {
    try {
      if (selectedChat && messages.length > 0) {
        // Get chatId from the first message
        const chatId = messages[0].chatId;

        // Only mark messages as read if there are unread messages where we are the recipient
        const unreadMessages = messages.filter(m => !m.read && m.recipientId === user.id);

        console.log('Marking messages as read:', {
          selectedChat,
          firstMessage: messages[0],
          chatId,
          currentUserId: user.id,
          unreadMessages
        });

        if (!chatId || unreadMessages.length === 0) {
          console.log('No unread messages to mark as read');
          return;
        }

        const response = await ApiConfig.api.post('/api/messages/mark-read', {
          chatId: chatId
        });

        console.log('Mark as read response:', response.data);

        // Update local message state only for messages where we are the recipient
        setMessages(messages.map(msg => ({
          ...msg,
          read: msg.recipientId === user.id ? true : msg.read
        })));
      }
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  const formatMessage = (text) => {
    if (!text) return '';
    
    // Special handling for call messages
    if (text.includes('Incoming video call')) {
      return `<div class="call-message-content">
        <strong>📞 Video Call</strong><br/>
        ${text}
      </div>`;
    }

    // Regular message formatting
    let formattedText = text
      .replace(/\n/g, '<br>') // Replace newlines with HTML line breaks
      .replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'); // Make links clickable

    // Replace emoji shortcodes with actual emojis
    formattedText = formattedText.replace(/:([\w+-]+):/g, (match, code) => {
      const em = emoji.get(code);
      return em !== `:${code}:` ? em : match;
    });

    return formattedText;
  };

  // Helper function to handle document links
  const handleDocumentLink = (docId, index) => {
    const doc = documentCache[docId];

    // If document is not in cache and not currently fetching
    if (!doc && !documentCache[`loading_${docId}`]) {
      // Mark as loading to prevent duplicate requests
      setDocumentCache(prev => ({
        ...prev,
        [`loading_${docId}`]: true
      }));

      ApiConfig.api.get(`/api/documents/${docId}`)
        .then(response => {
          const foundDoc = response.data;
          if (foundDoc) {
            setDocumentCache(prev => ({
              ...prev,
              [docId]: foundDoc,
              [`loading_${docId}`]: false
            }));
          }
        }).catch(error => {
          console.error('Error fetching document:', error);
          // Clear loading state on error
          setDocumentCache(prev => ({
            ...prev,
            [`loading_${docId}`]: false
          }));
        });

      // Return loading state
      return <span key={index}>Loading document... </span>;
    }

    // If currently loading
    if (documentCache[`loading_${docId}`]) {
      return <span key={index}>Loading document... </span>;
    }

    // If document is in cache
    return (
      <React.Fragment key={index}>
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            handleDocumentClick(doc);
          }}
          className={styles['cadenza-doc-link']}
        >
          <div className={styles['doc-preview']}>
            <Icon
              icon={doc.type === 'notation' ? "solar:music-notes-broken" :
                   doc.type === 'folder' ? "solar:folder-broken" :
                   "solar:document-broken"}
              className={styles['doc-icon']}
            />
            <div className={styles['doc-info']}>
              <span className={styles['doc-name']}>{doc.name}</span>
              <span className={styles['doc-meta']}>
                {doc.type === 'notation' ? 'Notacija' :
                 doc.type === 'folder' ? 'Mapa' :
                 doc.type === 'text' ? 'Tekst' : 'Dokument'}
                {' • '}
                {doc.mentorCreator ?
                  `${doc.mentorCreator.ime} ${doc.mentorCreator.prezime}` :
                  (doc.userCreator ?
                    `${doc.userCreator.ime} ${doc.userCreator.prezime}` :
                    doc.creatorName || 'Unknown')}
              </span>
            </div>
          </div>
        </a>
        {' '}
      </React.Fragment>
    );
  };

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (rateLimitTimer) {
        clearTimeout(rateLimitTimer);
      }
    };
  }, [rateLimitTimer]);

  // Add document mention functionality
  const [showDocumentSuggestions, setShowDocumentSuggestions] = useState(false);
  const [documentSuggestions, setDocumentSuggestions] = useState([]);
  const [isSearchingDocuments, setIsSearchingDocuments] = useState(false);

  const fetchDocumentSuggestions = async (searchTerm) => {
    try {
      const response = await ApiConfig.api.get('/api/documents', {
        params: {
          search: searchTerm,
          type: 'all'
        }
      });

      // Filter and sort documents by relevance
      const documents = response.data;
      const sortedDocuments = documents.sort((a, b) => {
        // Exact matches first
        if (a.name.toLowerCase() === searchTerm.toLowerCase()) return -1;
        if (b.name.toLowerCase() === searchTerm.toLowerCase()) return 1;

        // Then starts with
        if (a.name.toLowerCase().startsWith(searchTerm.toLowerCase())) return -1;
        if (b.name.toLowerCase().startsWith(searchTerm.toLowerCase())) return 1;

        // Then contains
        const aContains = a.name.toLowerCase().includes(searchTerm.toLowerCase());
        const bContains = b.name.toLowerCase().includes(searchTerm.toLowerCase());
        if (aContains && !bContains) return -1;
        if (!aContains && bContains) return 1;

        // Finally sort by name length (shorter names first)
        return a.name.length - b.name.length;
      });

      setDocumentSuggestions(sortedDocuments);
      setShowDocumentSuggestions(true);
    } catch (error) {
      console.error('Error fetching document suggestions:', error);
    }
  };

  const fetchRecentDocuments = async () => {
    try {
      // Fetch user's documents
      const response = await ApiConfig.api.get('/api/documents', {
        params: { type: 'all' }
      });
      setDocumentSuggestions(response.data);
      setShowDocumentSuggestions(true);
    } catch (error) {
      console.error('Error fetching user documents:', error);
    }
  };

  const handleDocumentClick = async (doc) => {
    setSelectedDocument(doc);
    setShowDocumentDetails(true);
  };

  const handleDocumentLinkClick = async (docId) => {
    try {
      const response = await ApiConfig.api.get(`/api/documents/${docId}`);
      setSelectedDocument(response.data);
      setShowDocumentDetails(true);
    } catch (error) {
      console.error('Error fetching document details:', error);
      toast.error('Greška pri dohvaćanju detalja dokumenta');
    }
  };

  const insertDocumentLink = (document) => {
    const documentUrl = `cadenza.com.hr/documents/${document.id}`;
    const mentionText = `@dokument:[${documentUrl}]`;
    const words = newMessage.split(' ');
    words.pop(); // Remove the @dokument part
    const newText = [...words, mentionText].join(' ');
    setNewMessage(newText);
    setShowDocumentSuggestions(false);
    setIsSearchingDocuments(false);
    inputRef.current?.focus();
  };

  useEffect(() => {
    // Add styles to head
    const styleElement = document.createElement('style');
    styleElement.innerHTML = callMessageStyles;
    document.head.appendChild(styleElement);
    
    return () => {
      document.head.removeChild(styleElement);
    };
  }, []);

  return (
    <div className={styles.chatContainer}>
      {/* Video Call Container - Updated to handle state better */}
      {showVideoCall && socket && user && (
        <div className={styles.videoCallWrapper} style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 9999,
          background: 'var(--iznad)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100vw',
          height: '100vh'
        }}>
          <VideoCall
            key={`video-call-${selectedChat}`}
            socket={socket}
            user={user}
            recipientId={selectedChat?.id || selectedChat}
            onClose={() => {
              console.log('Video call closing...');
              onEndVideoCall();
            }}
            handleSendMessage={handleSendMessage}
          />
        </div>
      )}
      {selectedChat ? (
        <div className="chat-window">
          <div className="chat-messages" onScroll={handleScroll}>
            {Array.isArray(messages) &&
              messages.map((message, index) => {
                // Show unread marker before first unread message
                const showUnreadMarker = index === firstUnreadIndex && !message.read;

                const isHovered = hoveredMessage === index;
                const isClicked = clickedMessage === index;
                const showActions = isHovered || isClicked;
                const showFullTime = isHovered || isClicked;
                const isSentByMe = message.senderId === user?.id;

                // Display the decrypted text if available, otherwise show the original
                const displayText = message.decrypted ? message.text :
                  (message.encrypted ? 'Encrypted message' : message.text);

                return (
                  <React.Fragment key={message.id || index}>
                    {showUnreadMarker && (
                      <div className="unread-marker">
                        <h4>Nepročitano</h4>
                      </div>
                    )}
                    <Message
                      message={message}
                      currentUser={user}
                      onReply={handleReply}
                      onDelete={handleDeleteClick}
                      onCallMessageClick={onCallMessageClick}
                    />
                  </React.Fragment>
                );
              })}
            <div ref={messagesEndRef} />
          </div>

          {replyTo && (
            <div className="reply-preview">
              <div className="reply-content">
                <div className="reply-header">
                  Odgovor za {getSenderName(replyTo.sender)}
                </div>
                <div className="reply-text">{replyTo.text}</div>
              </div>
              <button onClick={() => setReplyTo(null)} className="cancel-reply">
                ×
              </button>
            </div>
          )}

          <div className="chat-input-container">

            {isSearchingDocuments && (
              <div className={styles['typing-hint']}>
                Upiši ime dokumenta...
              </div>
            )}

            {showDocumentSuggestions && documentSuggestions.length > 0 && (
              <div className={styles['document-suggestions']}>
                {documentSuggestions.map(doc => (
                  <div
                    key={doc.id}
                    className={styles['document-suggestion']}
                    onClick={() => insertDocumentLink(doc)}
                  >
                    <Icon
                      icon={doc.type === 'notation' ? "solar:music-notes-broken" :
                           doc.type === 'folder' ? "solar:folder-broken" :
                           "solar:document-broken"}
                      className={styles['suggestion-icon']}
                    />
                    <div className={styles['suggestion-info']}>
                      <span className={styles['suggestion-name']}>{doc.name}</span>
                      <span className={styles['suggestion-meta']}>
                        {doc.type === 'notation' ? 'Notacija' :
                         doc.type === 'folder' ? 'Mapa' :
                         doc.type === 'text' ? 'Tekst' : 'Dokument'}
                        {' • '}
                        {doc.mentorCreator ?
                          `${doc.mentorCreator.ime} ${doc.mentorCreator.prezime}` :
                          doc.userCreator ?
                          `${doc.userCreator.ime} ${doc.userCreator.prezime}` :
                          doc.creatorName}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {showDocumentSuggestions && documentSuggestions.length === 0 && (
              <div className={styles['no-suggestions']}>
                Nema pronađenih dokumenata
              </div>
            )}

            <textarea
              value={newMessage}
              onChange={handleInputChange}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (!showDocumentSuggestions) {
                    handleSend();
                  } else if (documentSuggestions.length === 1) {
                    insertDocumentLink(documentSuggestions[0]);
                  }
                } else if (e.key === 'Escape') {
                  setShowDocumentSuggestions(false);
                  setIsSearchingDocuments(false);
                }
              }}
              placeholder={isRateLimited ? "Sačekajte minutu prije slanja novih poruka..." : "Pošalji poruku..."}
              className={`chat-input ${isRateLimited ? styles['rate-limited'] : ''}`}
              disabled={isRateLimited}
              ref={inputRef}
            />
            <button
              onClick={handleSend}
              className={`send-button ${isRateLimited ? styles['rate-limited'] : ''}`}
              disabled={isRateLimited || !newMessage.trim()}
            >
              {isRateLimited ? 'Sačekajte...' : 'Pošalji'}
            </button>
          </div>

          {deleteModal && (
            <div className="modal-overlay">
              <div className="delete-modal">
                <h3>Obriši poruku</h3>
                <p>Jeste li sigurni da želite obrisati ovu poruku?</p>
                <div className="modal-text">{deleteModal.text}</div>
                <div className="modal-actions">
                  <button
                    onClick={() => handleDeleteMessage(deleteModal.id)}
                    className="gumb action-btn zatvoriBtn"
                  >
                    Obriši
                  </button>
                  <button
                    onClick={() => setDeleteModal(null)}
                    className="gumb action-btn abDelete"
                  >
                    Odustani
                  </button>
                </div>
              </div>
            </div>
          )}

          {showTypingIndicator && (
            <div className="typing-indicator">
              upiši @dokument: za pristup dokumentima...
            </div>
          )}
        </div>
      ) : (
        <div className="empty-chat">
          <p>Odaberi razgovor s liste</p>
        </div>
      )}

      {showDocumentDetails && selectedDocument && (
        <DocumentDetailsPopup
          document={selectedDocument}
          onClose={() => {
            setShowDocumentDetails(false);
            setSelectedDocument(null);
          }}
        />
      )}
    </div>
  );
};

export default ChatContainer;