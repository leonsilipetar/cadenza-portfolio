import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { authActions } from '../store';
import axios from 'axios';
import ApiConfig from './apiConfig';
import { Icon } from '@iconify/react';
import './auth-pages.css';

const Error = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const [emailSent, setEmailSent] = useState(false);
  const isLoggedIn = useSelector(state => state.isLoggedIn);
  const currentUser = useSelector(state => state.user);

  const error = location.state?.error || 'An unexpected error occurred';
  const errorDetails = location.state?.details || {};
  const isCriticalError = location.state?.isCritical || false;
  const [showDetails, setShowDetails] = useState(false);
  const [errorClassification, setErrorClassification] = useState('unknown');

  const getBrowserInfo = () => {
    const userAgent = navigator.userAgent;
    let browserInfo = {};

    // Get browser name and version
    if (userAgent.includes('Firefox/')) {
      browserInfo.browser = 'Firefox';
      browserInfo.version = userAgent.split('Firefox/')[1];
    } else if (userAgent.includes('Chrome/')) {
      browserInfo.browser = 'Chrome';
      browserInfo.version = userAgent.split('Chrome/')[1].split(' ')[0];
    } else if (userAgent.includes('Safari/') && !userAgent.includes('Chrome/')) {
      browserInfo.browser = 'Safari';
      browserInfo.version = userAgent.split('Version/')[1].split(' ')[0];
    } else if (userAgent.includes('Edge/')) {
      browserInfo.browser = 'Edge';
      browserInfo.version = userAgent.split('Edge/')[1];
    } else {
      browserInfo.browser = 'Unknown';
      browserInfo.version = 'Unknown';
    }

    return browserInfo;
  };

  const getDeviceInfo = () => {
    const userAgent = navigator.userAgent;
    let deviceInfo = {
      type: 'Unknown',
      os: 'Unknown',
      osVersion: 'Unknown',
      screenSize: `${window.screen.width}x${window.screen.height}`,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      pixelRatio: window.devicePixelRatio
    };

    // Detect device type
    if (/Mobi|Android|iPhone|iPad|iPod/i.test(userAgent)) {
      deviceInfo.type = 'Mobile';

      // Detect specific mobile OS
      if (/iPhone|iPad|iPod/i.test(userAgent)) {
        deviceInfo.os = 'iOS';
        const match = userAgent.match(/OS (\d+_\d+)/);
        deviceInfo.osVersion = match ? match[1].replace('_', '.') : 'Unknown';
      } else if (/Android/i.test(userAgent)) {
        deviceInfo.os = 'Android';
        const match = userAgent.match(/Android (\d+(\.\d+)*)/);
        deviceInfo.osVersion = match ? match[1] : 'Unknown';
      }
    } else {
      deviceInfo.type = 'Desktop';

      // Detect desktop OS
      if (/Windows/i.test(userAgent)) {
        deviceInfo.os = 'Windows';
        const match = userAgent.match(/Windows NT (\d+\.\d+)/);
        deviceInfo.osVersion = match ? match[1] : 'Unknown';
      } else if (/Macintosh/i.test(userAgent)) {
        deviceInfo.os = 'macOS';
        const match = userAgent.match(/Mac OS X (\d+[._]\d+)/);
        deviceInfo.osVersion = match ? match[1].replace('_', '.') : 'Unknown';
      } else if (/Linux/i.test(userAgent)) {
        deviceInfo.os = 'Linux';
      }
    }

    return deviceInfo;
  };

  const getPWAInfo = () => {
    return {
      isPWA: window.matchMedia('(display-mode: standalone)').matches ||
             window.navigator.standalone ||
             document.referrer.includes('android-app://'),
      isOnline: navigator.onLine,
      serviceWorkerSupported: 'serviceWorker' in navigator,
      serviceWorkerActive: navigator.serviceWorker?.controller ? true : false
    };
  };

  const getRouteHistory = () => {
    try {
      const routeHistory = sessionStorage.getItem('routeHistory');
      return routeHistory ? JSON.parse(routeHistory) : [];
    } catch (e) {
      return [];
    }
  };

  const getComponentStack = () => {
    return {
      componentName: location.state?.details?.componentStack || 'Unknown',
      props: location.state?.details?.props || {},
      parentComponent: location.state?.details?.parentComponent || 'Unknown'
    };
  };

  const getReduxSnapshot = () => {
    try {
      return {
        isLoggedIn: isLoggedIn,
        currentRoute: location.pathname,
        user: currentUser ? {
          id: currentUser.id,
          role: currentUser.role,
          lastActive: currentUser.lastActive
        } : null
      };
    } catch (e) {
      return { error: 'Failed to get Redux state' };
    }
  };

  const classifyError = (error) => {
    const classifications = {
      network: ['NetworkError', 'Failed to fetch', 'Network request failed', 'NETWORK_ERROR'],
      auth: ['Unauthorized', 'Token expired', 'Authentication failed', 'AUTH_ERROR'],
      data: ['Cannot read property', 'undefined is not an object', 'null is not an object', 'DATA_ERROR'],
      render: ['React', 'Render', 'Component', 'RENDER_ERROR'],
      pwa: ['ServiceWorker', 'Cache', 'Install', 'PWA_ERROR'],
      resource: ['Loading chunk', 'Loading CSS', 'Loading script', 'RESOURCE_ERROR'],
      api: ['API', 'Endpoint', 'Request failed', 'API_ERROR'],
      validation: ['Validation', 'Invalid input', 'Required field', 'VALIDATION_ERROR']
    };

    for (const [type, patterns] of Object.entries(classifications)) {
      if (patterns.some(pattern => error.toString().toLowerCase().includes(pattern.toLowerCase()))) {
        return type;
      }
    }
    return 'unknown';
  };

  const getResourceStatus = () => {
    try {
      if (!window.performance) return null;

      const resources = performance.getEntriesByType('resource');
      const navigationEntries = performance.getEntriesByType('navigation');

      return {
        failedResources: resources.filter(r => !r.responseEnd).map(r => ({
          name: r.name,
          type: r.initiatorType,
          startTime: r.startTime
        })),
        slowResources: resources.filter(r => r.duration > 3000).map(r => ({
          name: r.name,
          duration: r.duration,
          type: r.initiatorType
        })),
        navigationTiming: navigationEntries.length > 0 ? {
          dnsTime: navigationEntries[0].domainLookupEnd - navigationEntries[0].domainLookupStart,
          connectTime: navigationEntries[0].connectEnd - navigationEntries[0].connectStart,
          responseTime: navigationEntries[0].responseEnd - navigationEntries[0].responseStart,
          domLoadTime: navigationEntries[0].domContentLoadedEventEnd - navigationEntries[0].domContentLoadedEventStart
        } : null
      };
    } catch (e) {
      return null;
    }
  };

  useEffect(() => {
    const sendErrorEmail = async () => {
      try {
        if (emailSent) return;

        // Do not send if error is empty or generic
        const errorString = error?.toString().trim().toLowerCase();
        if (!errorString || errorString === 'unknown' || errorString === 'an unexpected error occurred') {
          setEmailSent(true);
          return;
        }

        // Set the classification first, so it's available before using it
        const currentErrorClassification = classifyError(error);
        setErrorClassification(currentErrorClassification);

        // Debounce: Only send if not sent in the last 60 seconds for this error
        const errorKey = `${errorString}_${currentErrorClassification}`;
        const errorHistory = JSON.parse(localStorage.getItem('errorHistory') || '{}');
        const now = Date.now();

        // Clean up old errors (older than 24 hours)
        Object.keys(errorHistory).forEach(key => {
          if (now - errorHistory[key].timestamp > 24 * 60 * 60 * 1000) {
            delete errorHistory[key];
          }
        });

        // Debounce: Only send if not sent in the last 60 seconds
        if (errorHistory[errorKey] && now - errorHistory[errorKey].timestamp < 60 * 1000) {
          setEmailSent(true);
          return;
        }

        // Check rate limit (max 10 errors per hour)
        const recentErrors = Object.values(errorHistory).filter(
          e => now - e.timestamp < 60 * 60 * 1000
        );
        if (recentErrors.length >= 10) {
          setEmailSent(true);
          return;
        }

        const userInfo = currentUser || (localStorage.getItem('user') ?
          JSON.parse(localStorage.getItem('user')) :
          { id: 'Not logged in' });

        const browserInfo = getBrowserInfo();
        const deviceInfo = getDeviceInfo();
        const pwaInfo = getPWAInfo();
        const routeHistory = getRouteHistory();
        const componentStack = getComponentStack();
        const reduxSnapshot = getReduxSnapshot();
        const resourceStatus = getResourceStatus();

        // Only send error report to analytics, not email
        const errorData = {
          category: 'system',
          subcategory: currentErrorClassification,
          description: error.toString(),
          steps: JSON.stringify({
            stack: location.state?.stack,
            componentStack: componentStack,
            routeHistory: routeHistory.slice(-5),
            reduxState: reduxSnapshot
          }, null, 2),
          userRole: userInfo.isMentor ? 'Mentor' : 'Student',
          userId: userInfo.isMentor ? null : userInfo.id,
          mentorId: userInfo.isMentor ? userInfo.id : null,
          userEmail: userInfo.email,
          deviceInfo: {
            ...deviceInfo,
            ...browserInfo,
            ...pwaInfo,
            resourceStatus
          },
          url: window.location.href,
          previousUrl: document.referrer,
          occurrences: (errorHistory[errorKey]?.count || 0) + 1
        };

        // Send the error report
        await ApiConfig.api.post('/api/error/report', { errorData });

        // Update error history in localStorage
        errorHistory[errorKey] = {
          timestamp: now,
          count: (errorHistory[errorKey]?.count || 0) + 1
        };
        localStorage.setItem('errorHistory', JSON.stringify(errorHistory));

        setEmailSent(true);
      } catch (emailError) {
        console.error('Failed to send error report:', emailError);
      }
    };

    sendErrorEmail();
  }, [error, emailSent, errorDetails, location.state, currentUser, isLoggedIn]);

  const handleBackToLogin = () => {
    dispatch(authActions.logout());
    navigate('/login');
  };

  const handleTryAgain = () => {
    const previousPath = location.state?.previousPath || '/user';
    navigate(previousPath);
  };

  const handleGoHome = () => {
    navigate('/user');
  };

  return (
    <div className="auth-page" style={{ minHeight: '100vh', background: '#f7f8fa' }}>
      <div className="auth-container" style={{ maxWidth: 480, margin: '0 auto', padding: '2rem 1.5rem', borderRadius: 16, boxShadow: '0 4px 24px rgba(0,0,0,0.08)', background: '#fff', marginTop: 64 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Icon icon="solar:danger-triangle-broken" width={72} height={72} color="#e57373" style={{ marginBottom: 16 }} />
          <h2 style={{ fontWeight: 700, fontSize: 28, marginBottom: 8, color: '#222' }}>Oops! Nešto je pošlo po zlu</h2>
          <p className="error-message" style={{ color: '#e57373', fontWeight: 500, fontSize: 18, marginBottom: 8, textAlign: 'center' }}>{error}</p>
          <p className="error-help" style={{ color: '#555', marginBottom: 24, textAlign: 'center' }}>
            Ne brinite! Naš tim je obaviješten i istražit ćemo problem.<br />
            Možete pokušati ponovno ili se vratiti na početnu stranicu.
          </p>
          <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', justifyContent: 'center' }}>
            {!isCriticalError && isLoggedIn && (
              <button className="auth-welcome-btn auth-welcome-btn-primary" onClick={handleTryAgain}>
                <Icon icon="solar:refresh-broken" /> Pokušaj ponovno
              </button>
            )}
            {isLoggedIn && (
              <button className="auth-welcome-btn auth-welcome-btn-secondary" onClick={handleGoHome}>
                <Icon icon="solar:home-2-broken" /> Početna
              </button>
            )}
            {(!isLoggedIn || isCriticalError) && (
              <button className="auth-welcome-btn auth-welcome-btn-primary" onClick={handleBackToLogin}>
                <Icon icon="solar:login-2-broken" /> Prijava
              </button>
            )}
          </div>
          <button
            className="auth-welcome-btn auth-welcome-btn-secondary"
            style={{ fontSize: 14, padding: '6px 16px', marginBottom: 8 }}
            onClick={() => setShowDetails(d => !d)}
          >
            {showDetails ? 'Sakrij detalje' : 'Prikaži tehničke detalje'}
          </button>
          {showDetails && (
            <div style={{ width: '100%', background: '#f5f5f5', borderRadius: 8, padding: 16, marginTop: 8, fontSize: 13, color: '#333', textAlign: 'left', wordBreak: 'break-all' }}>
              <strong>Detalji greške:</strong>
              <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{JSON.stringify(errorDetails, null, 2)}</pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Error;