export const isPWA = () => {
  return window.matchMedia('(display-mode: standalone)').matches || 
         window.navigator.standalone || 
         document.referrer.includes('android-app://');
};

let deferredPrompt;

export const initInstallPrompt = () => {
  window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent Chrome 67 and earlier from automatically showing the prompt
    e.preventDefault();
    // Stash the event so it can be triggered later
    deferredPrompt = e;
  });
};

export const showInstallPrompt = async () => {
  if (deferredPrompt) {
    // Show the prompt
    deferredPrompt.prompt();
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    // Clear the saved prompt
    deferredPrompt = null;
    return outcome;
  }
  return null;
};

export const setPWAUser = (user) => {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('pwa_user', JSON.stringify(user));
  }
};

export const clearPWAUser = () => {
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem('pwa_user');
  }
};

export const getPWAUser = () => {
  if (typeof localStorage !== 'undefined') {
    const user = localStorage.getItem('pwa_user');
    return user ? JSON.parse(user) : null;
  }
  return null;
}; 