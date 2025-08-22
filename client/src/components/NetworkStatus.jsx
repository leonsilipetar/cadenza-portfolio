import React from 'react';
import { Icon } from '@iconify/react';

const NetworkStatus = ({ isOnline }) => {
  if (isOnline) return null; // Don't show anything when online

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      background: '#dc3545',
      color: 'white',
      padding: '12px 16px',
      textAlign: 'center',
      fontSize: '14px',
      fontWeight: 600,
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
      boxShadow: '0 2px 8px rgba(220, 53, 69, 0.3)',
      animation: 'pulse 2s infinite'
    }}>
      <Icon icon="mdi:wifi-off" style={{ fontSize: '18px' }} />
      <span>Offline mod - Nema internetske veze</span>
      <Icon icon="mdi:information" style={{ fontSize: '16px', opacity: 0.8 }} />
    </div>
  );
};

export default NetworkStatus; 