import React from 'react';
import { toast } from 'react-toastify';
import { Icon } from '@iconify/react';
import '../App.css';

// Helper to show toast with icon
export const showNotification = (type, message, duration = 5000) => {
  // Map type to Toastify method
  const toastFn = toast[type] || toast.info;
  toastFn(message, {
    autoClose: duration,
    icon: type === 'success'
      ? <Icon icon="solar:check-circle-broken" />
      : type === 'error'
      ? <Icon icon="solar:danger-triangle-broken" />
      : <Icon icon="solar:info-circle-broken" />,
  });
};

// Component version: triggers toast on mount/update
const Notifikacija = ({ type, message, duration = 5000 }) => {
  React.useEffect(() => {
    if (type && message) {
      showNotification(type, message, duration);
    }
    // eslint-disable-next-line
  }, [type, message, duration]);
  return null;
};

export default Notifikacija;
