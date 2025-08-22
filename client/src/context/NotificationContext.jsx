import React, { createContext, useContext, useState, useEffect } from 'react';
import ApiConfig from '../components/apiConfig';

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      const response = await ApiConfig.cachedApi.get('/api/notifications');
      console.log('Notifications response:', response); // Debug log

      // Ensure we're working with the correct data structure
      let notificationsArray;
      
      if (response?.notifications) {
        notificationsArray = response.notifications;
      } else if (Array.isArray(response)) {
        notificationsArray = response;
      } else if (typeof response === 'object' && response !== null) {
        notificationsArray = [response];
      } else {
        notificationsArray = [];
      }

      console.log('Processed notifications array:', notificationsArray); // Debug log
      
      // Filter for unread notifications only
      const unreadNotifications = notificationsArray.filter(notif => notif.read === false);
      console.log('Unread notifications:', unreadNotifications); // Debug log
      
      setNotifications(unreadNotifications);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      console.error('Full error object:', JSON.stringify(error, null, 2)); // Debug log
      setNotifications([]); // Set empty array on error
    }
  };

  // Initial fetch and polling for notifications only
  useEffect(() => {
    fetchNotifications();

    // Set up polling for notifications updates every minute
    const interval = setInterval(() => {
      fetchNotifications();
    }, 60000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  // Method to mark notifications as read
  const markNotificationsAsRead = async () => {
    try {
      const response = await ApiConfig.api.put('/api/notifications/read-all');
      if (response.data.success) {
        // Clear notifications since they're all read now
        setNotifications([]);
        // Invalidate the cache since we modified data
        await ApiConfig.invalidateCache();
      }
      // Refetch notifications using cachedApi to ensure sync with server
      await fetchNotifications();
    } catch (error) {
      console.error('Error marking notifications as read:', error);
      // Refetch notifications to ensure sync with server even on error
      await fetchNotifications();
    }
  };

  // Method to update notification count
  const updateNotificationCount = async (count) => {
    setNotifications(prev => [...prev, ...count]);
    // Invalidate cache and refetch to ensure sync
    await ApiConfig.invalidateCache();
    await fetchNotifications();
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        markNotificationsAsRead,
        updateNotificationCount,
        fetchNotifications
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

// Custom hook to use the notification context
export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}; 