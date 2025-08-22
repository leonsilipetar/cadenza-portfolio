import React, { useEffect, useState } from "react";
import ApiConfig from "../../components/apiConfig.js";

const formatDate = (timestamp) => {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  return date.toLocaleDateString("hr-HR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

const formatTime = (timestamp) => {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  return date.toLocaleTimeString("hr-HR", { hour: "2-digit", minute: "2-digit" });
};

const ChatWindow = ({ user, recipientId, onSendMessage }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [error, setError] = useState(null);

  useEffect(() => {
    if (recipientId) {
      fetchMessages(recipientId);
    }
  }, [recipientId]);

  const fetchMessages = async (recipientId) => {
    try {
      const res = await ApiConfig.api.get(`/api/messages/${recipientId}`);
      setMessages(res.data);
      setError(null);
    } catch (error) {
      console.error("Error fetching messages:", error);
      setError("Greška pri dohvaćanju poruka");
    }
  };

  const handleSendMessage = async () => {
    if (newMessage.trim() === "" || !recipientId) return;
    
    try {
      await onSendMessage(newMessage, recipientId);
      setNewMessage("");
      setError(null);
    } catch (error) {
      console.error("Error sending message:", error);
      setError("Greška pri slanju poruke");
    }
  };

  return (
    <div className="">
      <div className="">
        {messages.reduce((acc, msg, index) => {
          const messageDate = formatDate(msg.createdAt);
          const prevMessageDate = index > 0 ? formatDate(messages[index - 1].createdAt) : null;

          // Insert a date separator if it's a new day
          if (messageDate !== prevMessageDate) {
            acc.push(
              <div key={`date-${messageDate}`} className="text-center text-gray-500 my-2 font-semibold">
                {messageDate}
              </div>
            );
          }

          // Display message
          acc.push(
            <div 
              key={msg.id} 
              className={`p-2 rounded mb-1 max-w-xs ${
                msg.senderId === user.id ? "bg-green-200 self-end" : "bg-gray-200 self-start"
              }`}
            >
              <div className="text-sm">{msg.text}</div>
              <div className="text-xs text-gray-600 text-right">
                {formatTime(msg.createdAt)}
              </div>
            </div>
          );

          return acc;
        }, [])}
      </div>

      {error && (
        <div className="text-red-500 text-sm mb-2">
          {error}
        </div>
      )}

      <div className="flex items-center mt-4">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Pošalji poruku..."
          className="flex-1 p-2 border border-gray-300 rounded"
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              handleSendMessage();
            }
          }}
        />
        <button 
          onClick={handleSendMessage} 
          className="ml-2 bg-blue-500 text-white px-4 py-2 rounded"
        >
          Pošalji
        </button>
      </div>
    </div>
  );
};

export default ChatWindow;
