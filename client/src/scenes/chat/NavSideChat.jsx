import React, { useEffect, useState } from 'react';
import { Icon } from '@iconify/react';
import { onMessageListener } from '../../firebase-config';

const NavSideChat = ({ chats, onChatClick, user, onUpdate, onCreateGroupClick }) => {
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    // Handle custom chat update events
    const handleChatUpdate = (event) => {
      console.log('Chat update received in NavSideChat:', event.detail);
      if (typeof onUpdate === 'function') {
        onUpdate();
      }
    };

    // Set up continuous message listener for Firebase updates
    const messageListener = () => {
      onMessageListener()
        .then(payload => {
          console.log('Firebase message received in NavSideChat:', payload);
          if (typeof onUpdate === 'function') {
            onUpdate();
          }
          // Continue listening
          messageListener();
        })
        .catch(err => {
          console.log('Failed to receive message in NavSideChat:', err);
          // Continue listening even after error
          messageListener();
        });
    };

    // Add event listener for custom chat updates
    window.addEventListener('chatUpdate', handleChatUpdate);

    // Start Firebase message listener
    messageListener();

    return () => {
      window.removeEventListener('chatUpdate', handleChatUpdate);
      // Firebase listener cleanup happens automatically
    };
  }, [onUpdate]);

  // Sort chats:
  // 1. Unread messages first
  // 2. Then by last message timestamp (most recent first)
  // 3. Finally alphabetically if no messages
  const sortedChats = [...chats].sort((a, b) => {
    // First sort by unread count (descending)
    if (a.unreadCount > 0 && b.unreadCount === 0) return -1;
    if (a.unreadCount === 0 && b.unreadCount > 0) return 1;

    // Then sort by last message timestamp (most recent first)
    if (a.lastMessageAt && b.lastMessageAt) {
      return new Date(b.lastMessageAt) - new Date(a.lastMessageAt);
    }

    // If one has a message and the other doesn't, prioritize the one with a message
    if (a.lastMessageAt && !b.lastMessageAt) return -1;
    if (!a.lastMessageAt && b.lastMessageAt) return 1;

    // Finally sort alphabetically by name
    return a.name.localeCompare(b.name, 'hr');
  });

  // Filter chats based on active tab
  const filteredChats = sortedChats.filter(chat => {
    if (activeTab === 'all') return true;
    if (activeTab === 'direct') return !chat.isGroup;
    if (activeTab === 'groups') return chat.isGroup;
    return true;
  });

  // Format last message timestamp
  const formatLastMessageTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diffInDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    const time = date.toLocaleTimeString('hr', { hour: '2-digit', minute: '2-digit' });

    if (diffInDays === 0) {
      // Today - show only time
      return time;
    } else if (diffInDays === 1) {
      // Yesterday - show "Jučer" and time
      return `Jučer ${time}`;
    } else if (diffInDays < 7) {
      // This week - show day name and time
      return `${date.toLocaleDateString('hr', { weekday: 'short' })} ${time}`;
    } else {
      // Older - show date and time
      return `${date.toLocaleDateString('hr', { day: '2-digit', month: '2-digit' })} ${time}`;
    }
  };

  // Tab options
  const tabs = [
    { id: 'all', label: 'Sve', icon: 'solar:chat-round-dots-broken' },
    { id: 'direct', label: 'Poruke', icon: 'solar:user-speak-broken' },
    { id: 'groups', label: 'Grupe', icon: 'solar:users-group-rounded-broken' }
  ];

  return (
    <div className="raspored-lista">
      <div className="rl-items">
        <div className="rl moj-raspored">
          <p>Razgovori</p>
          {user.isMentor && (
            <div className="new-group-btn" onClick={onCreateGroupClick}>
              <Icon icon="solar:user-plus-broken" className="icon" />
            </div>
          )}
        </div>

        {/* Chat Tabs */}
        <div className="rl notification-filters-chat">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`filter-btn-chat ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <Icon icon={tab.icon} />
              {tab.label}
            </button>
          ))}
        </div>

        {filteredChats.length === 0 ? (
          <div className="rl">
            <div className="empty-state">
              {activeTab === 'all' ? 'Trenutno nema razgovora' :
               activeTab === 'direct' ? 'Trenutno nema direktnih poruka' :
               'Trenutno nema grupa'}
            </div>
          </div>
        ) : (
          filteredChats.map((chat) => (
            <div
              className="rl chat-item"
              key={chat.id}
              onClick={() => onChatClick(chat.id, chat.name)}
            >
              <div className={`chat-item-content ${chat.unreadCount > 0 ? 'fw-bold' : ''}`}>
                <div>
                  <div className="profilePicture">
                    {chat.isGroup ? (
                      chat.profilePicture ? (
                        <img src={chat.profilePicture} alt={`${chat.name} group`} className="profile-img" />
                      ) : (
                        <Icon icon="solar:users-group-rounded-broken" className="icon" />
                      )
                    ) : chat.profilePicture ? (
                      <img src={chat.profilePicture} alt={chat.name} className="profile-img" />
                    ) : (
                      <Icon icon="solar:user-broken" className="icon" />
                    )}
                  </div>
                </div>
                <div className="chat-header">
                  <div className="m-info">
                      <div>
                        <span className="chat-name" title={chat.name}>
                          {chat.name}
                        </span>
                      </div>

                  <div className='m-info-last-message'>
                      {chat.lastMessageAt && (
                        <span className="last-message">
                          {formatLastMessageTime(chat.lastMessageAt)}
                        </span>
                      )}

                        {chat.lastMessage && (
                        <span
                          className="last-message"
                          title={chat.isGroup && chat.lastMessageSender ? `${chat.lastMessageSender}: ${chat.lastMessage}` : chat.lastMessage}
                        >
                          {chat.isGroup && chat.lastMessageSender ? (
                            `${chat.lastMessageSender}: ${chat.lastMessage}`
                          ) : (
                            chat.lastMessage
                          )}
                        </span>
                      )}
                    </div>
                  </div>


                </div>
                {chat.unreadCount > 0 && (
                  <span className="unread-count">
                    {chat.unreadCount}
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default NavSideChat;