import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { Icon } from '@iconify/react';

const InstallPWA = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showIOSPrompt, setShowIOSPrompt] = useState(false);
  const [showAndroidPrompt, setShowAndroidPrompt] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  const isAndroid = /Android/.test(navigator.userAgent);
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

  useEffect(() => {
    // Function to check if app is installed
    const checkInstalled = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const isIOSInstalled = window.navigator.standalone === true;
      const isAndroidInstalled = document.referrer.includes('android-app://');
      return isStandalone || isIOSInstalled || isAndroidInstalled;
    };

    // Handler for the beforeinstallprompt event (Android/Desktop)
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      
      // Show our custom prompt for Android
      if (isAndroid && !checkInstalled()) {
        setTimeout(() => {
          setShowAndroidPrompt(true);
          setIsVisible(true);
        }, 2000);
      }
    };

    // Show iOS prompt after a delay if conditions are met
    if (isIOS && isSafari && !checkInstalled()) {
      setTimeout(() => {
        setShowIOSPrompt(true);
        setIsVisible(true);
      }, 2000);
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', () => {
      setDeferredPrompt(null);
      setShowIOSPrompt(false);
      setShowAndroidPrompt(false);
      setIsVisible(false);
      toast.success('CADENZA je uspješno instalirana!', {
        position: "bottom-center",
        autoClose: 3000,
      });
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, [isIOS, isSafari, isAndroid]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        setShowAndroidPrompt(false);
        setIsVisible(false);
      }
    } catch (error) {
      console.error('Error showing install prompt:', error);
    }
  };

  if (!isVisible) return null;

  return (
    <>
      {(showIOSPrompt || showAndroidPrompt) && (
        <div className="install-prompt" style={{
          position: 'fixed',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: 'var(--iznad)',
          borderRadius: 'var(--radius)',
          border: '1px solid rgb(var(--isticanje))',
          padding: '16px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
          zIndex: 1000,
          width: '90%',
          maxWidth: '400px',
          animation: 'slideUp 0.3s ease-out'
        }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'flex-start',
            gap: '12px' 
          }}>
            <Icon 
              icon="solar:smartphone-broken" 
              style={{ 
                fontSize: '24px',
                color: 'rgb(var(--isticanje))'
              }} 
            />
            <div style={{ flex: 1 }}>
              <h3 style={{ 
                margin: '0 0 8px 0',
                fontSize: '16px',
                fontWeight: 'bold'
              }}>
                Instaliraj CADENZA aplikaciju
              </h3>
              <p style={{ 
                margin: '0 0 12px 0',
                fontSize: '14px',
                lineHeight: '1.4'
              }}>
                Za brži pristup i bolje iskustvo, instaliraj CADENZA na svoj uređaj:
              </p>
              {showIOSPrompt ? (
                <ol style={{ 
                  margin: '0',
                  paddingLeft: '20px',
                  fontSize: '14px',
                  lineHeight: '1.4'
                }}>
                  <li>Pritisni <Icon icon="solar:share-bold" style={{ verticalAlign: 'middle' }}/> Share ikonu</li>
                  <li>Odaberi "Add to Home Screen"</li>
                  <li>Pritisni "Add" za instalaciju</li>
                </ol>
              ) : (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}>
                  <p style={{
                    margin: '0',
                    fontSize: '14px',
                    lineHeight: '1.4'
                  }}>
                    Pritisni gumb ispod za instalaciju:
                  </p>
                  <button
                    onClick={handleInstallClick}
                    style={{
                      background: 'rgb(var(--isticanje))',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 'var(--radius)',
                      padding: '8px 16px',
                      fontSize: '14px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      justifyContent: 'center'
                    }}
                  >
                    <Icon icon="solar:download-minimalistic-broken" />
                    Instaliraj aplikaciju
                  </button>
                </div>
              )}
            </div>
          </div>
          <button
            onClick={() => setIsVisible(false)}
            style={{
              position: 'absolute',
              top: '12px',
              right: '12px',
              background: 'none',
              border: 'none',
              padding: '4px',
              cursor: 'pointer',
              color: 'var(--text)'
            }}
          >
            <Icon icon="solar:close-circle-broken" style={{ fontSize: '20px' }} />
          </button>
        </div>
      )}

      <style>
        {`
          @keyframes slideUp {
            from {
              transform: translate(-50%, 100%);
              opacity: 0;
            }
            to {
              transform: translate(-50%, 0);
              opacity: 1;
            }
          }

          .install-prompt {
            font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          }

          @media (display-mode: standalone) {
            .install-prompt {
              display: none;
            }
          }
        `}
      </style>
    </>
  );
};

export default InstallPWA; 