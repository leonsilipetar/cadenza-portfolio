import React, { useEffect, useState, useCallback, useMemo } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import Navigacija from './navigacija';
import NavTop from './nav-top';
import ApiConfig from '../components/apiConfig.js';
import LoadingShell from '../components/LoadingShell';
import { showNotification } from '../components/Notifikacija';
import { useNotifications } from '../context/NotificationContext';
import './Obavijesti.css';

const Obavijesti = ({ user, unreadChatsCount }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState('all');
  const { markNotificationsAsRead } = useNotifications();

  // Filter options
  const filters = [
    { id: 'all', label: 'Sve', icon: 'solar:bell-broken' },
    { id: 'post', label: 'Objave', icon: 'solar:document-text-broken' },
    { id: 'schedule', label: 'Raspored', icon: 'solar:calendar-broken' }
  ];

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    if (!user?.id) return;
    let isMounted = true;

    try {
      setLoading(true);
      const response = await ApiConfig.api.get('/api/notifications');
      if (isMounted) {
        // The response.data is already the array of notifications
        setNotifications(Array.isArray(response.data) ? response.data : []);
      }
    } catch (error) {
      if (!axios.isCancel(error) && isMounted) {
        console.error('Error fetching notifications:', error);
        showNotification('error', 'Greška pri dohvaćanju obavijesti');
        // Set empty array on error
        setNotifications([]);
      }
    } finally {
      if (isMounted) {
        setLoading(false);
      }
    }
  }, [user?.id]);

  // Initial data fetch
  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    let isMounted = true;
    const fetchData = async () => {
      await fetchNotifications();
    };

    fetchData();
    return () => { isMounted = false; };
  }, [user?.id, fetchNotifications]);

  // Handle notification click
  const handleNotificationClick = async (notification) => {
    if (!notification || !notification.id) {
      console.error('Invalid notification:', notification);
      return;
    }

    try {
      // Mark as read
      await ApiConfig.api.put(`/api/notifications/${notification.id}/read`);

      // Update local state
      setNotifications(prev =>
        prev.map(n => n.id === notification.id ? {...n, read: true} : n)
      );

      // Navigate based on notification type
      switch (notification.type) {
        case 'post':
          navigate('/user');
          break;
        case 'schedule':
          navigate('/raspored');
          break;
        default:
          break;
      }
    } catch (error) {
      console.error('Error handling notification click:', error);
      showNotification('error', 'Greška pri označavanju obavijesti kao pročitane');
    }
  };

  // Mark all as read
  const handleMarkAllAsRead = async () => {
    try {
      await markNotificationsAsRead();
      // Update local state
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      showNotification('success', 'Sve obavijesti označene kao pročitane');
      // Refetch notifications to ensure sync with server
      fetchNotifications();
    } catch (error) {
      console.error('Error marking all as read:', error);
      showNotification('error', 'Greška pri označavanju obavijesti');
    }
  };

  // Filter notifications
  const filteredNotifications = useMemo(() => {
    if (!Array.isArray(notifications)) {
      console.warn('Notifications is not an array:', notifications);
      return [];
    }
    return notifications.filter(notification =>
      activeFilter === 'all' || notification.type === activeFilter
    );
  }, [notifications, activeFilter]);

  // Format date
  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleDateString('hr-HR', options);
  };

  if (loading) return <LoadingShell />;

  return (
    <>
      <Navigacija user={user} otvoreno="obavijesti" unreadChatsCount={unreadChatsCount}/>
      <NavTop user={user} naslov="Obavijesti" />

      <div className='main'>
        <div className="karticaZadatka">
          <div className="notification-filters">
            {filters.map(filter => (
              <button
                key={filter.id}
                className={`filter-btn ${activeFilter === filter.id ? 'active' : ''}`}
                onClick={() => setActiveFilter(filter.id)}
              >
                <Icon icon={filter.icon} />
                {filter.label}
              </button>
            ))}

            <button
              className="gumb action-btn saveBtn"
              onClick={handleMarkAllAsRead}
            >
              <Icon icon="solar:check-read-broken" />
              Označi sve kao pročitano
            </button>
          </div>

          <div className="notifications-list">
            {filteredNotifications.length > 0 ? (
              filteredNotifications.map(notification => (
                <div
                  key={notification.id}
                  className={`notification-item ${notification.read ? 'read' : 'unread'}`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="notification-icon">
                    <Icon
                      icon={
                        notification.type === 'post' ? 'solar:document-text-broken' :
                        notification.type === 'schedule' ? 'solar:calendar-broken' :
                        'solar:bell-broken'
                      }
                    />
                  </div>
                  <div className="notification-content">
                    <div className="notification-title">{notification.title}</div>
                    <div className="notification-message">{notification.message}</div>
                    <div className="notification-time">{formatDate(notification.createdAt)}</div>
                  </div>
                  {!notification.read && <div className="unread-indicator"></div>}
                </div>
              ))
            ) : (
              <div className="no-notifications">
                <Icon icon="solar:bell-off-broken" />
                <p>Nema obavijesti</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default Obavijesti;