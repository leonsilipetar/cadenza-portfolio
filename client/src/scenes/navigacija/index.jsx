import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { useNotifications } from '../../context/NotificationContext';
import ApiConfig from '../../components/apiConfig';

const Navigacija = ({ user, chat, otvoreno, unreadChatsCount = 0 }) => {
  const [activeItem, setActiveItem] = useState(otvoreno);
  const { notifications } = useNotifications();
  const location = useLocation();

  // We don't need to check for unpaid invoices here since it's already in the user object
  // and will update automatically when the user object updates

  const handleItemClick = (item) => {
    if (item === activeItem) return;
    setActiveItem(item);
  };

  // Check for unread items
  const hasUnreadNotifications = notifications.length > 0;

  const navItems = [
    {
      id: 'naslovna',
      path: '/user',
      icon: 'solar:music-notes-broken',
      label: 'Naslovna',
      hasUnread: false
    },
    {
      id: 'raspored',
      path: '/raspored',
      icon: 'solar:calendar-broken',
      label: 'Raspored',
      hasUnread: false
    },
    {
      id: 'obavijesti',
      path: '/obavijesti',
      icon: 'solar:bell-broken',
      label: 'Obavijesti',
      hasUnread: hasUnreadNotifications
    },
    {
      id: 'chat',
      path: '/chat',
      icon: 'solar:chat-line-broken',
      label: 'Chat',
      hasUnread: unreadChatsCount > 0
    },
    {
      id: 'racuni',
      path: '/racuni',
      icon: 'solar:bill-list-broken',
      label: 'Računi',
      hasUnread: user?.isStudent && user.hasUnpaidInvoice
    },
    {
      id: 'dokumenti',
      path: '/dokumenti',
      icon: 'solar:document-text-broken',
      label: 'Dokumenti',
      hasUnread: false
    },
    {
      id: 'profil',
      path: '/profil',
      icon: 'solar:user-circle-broken',
      label: 'Profil',
      hasUnread: false
    }
  ];

  return (
    <header className={chat ? 'chat-active' : ''}>
      <nav role="navigation" aria-label="Glavna navigacija">
        {navItems.map((item) => (
          <div 
            key={item.id}
            className={activeItem === item.id ? 'otvoreno' : ''} 
            onClick={() => handleItemClick(item.id)}
          >
            <Link 
              className="link" 
              to={item.path}
              aria-label={`${item.label}${item.hasUnread ? ' (ima nove poruke)' : ''}`}
              aria-current={activeItem === item.id ? 'page' : undefined}
            >
              <Icon className="icon" icon={item.icon} aria-hidden="true" />
              {item.hasUnread && (
                <div 
                  className="dot" 
                  style={{ position: 'absolute', top: '-2px', right: '-2px' }}
                  aria-label="Nove poruke"
                ></div>
              )}
            </Link>
          </div>
        ))}
      </nav>
    </header>
  );
};

export default Navigacija;
