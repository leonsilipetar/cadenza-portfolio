import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Routes, Route, useNavigate, Navigate, Outlet } from 'react-router-dom';
import { authActions } from './store/index.js';
import ApiConfig from './components/apiConfig.js';
import Login from './components/Login.jsx';
import Welcome from './components/Welcome.jsx';
import SignUpForm from './scenes/SignUpForm.jsx';
import Naslovna from './scenes/naslovna/Naslovna.jsx';
import Profil from './scenes/Profile.jsx';
import Chat from './scenes/Chat.jsx';
import Racuni from './scenes/Racuni.jsx';
import Raspored from './scenes/Raspored.jsx';
import Admin from './scenes/administracija/Admin.jsx';
import Korisnici from './scenes/administracija/Korisnici.jsx';
import RacuniAdmin from './scenes/administracija/RacuniAdmin.jsx';
import Mentori from './scenes/administracija/Mentori.jsx';
import Classrooms from './scenes/administracija/Classroom.jsx';
import Delete from './scenes/administracija/Delete.jsx';
import Obavijesti from './scenes/Obavijesti.jsx';
import Documents from './scenes/Documents.jsx';
import { isPWA, setPWAUser, getPWAUser, clearPWAUser } from './utils/pwaUtils.js';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import { io } from 'socket.io-client';
import Programs from './scenes/administracija/Programs.jsx';
import { initializeApp } from 'firebase/app'; // Correct import
import { getMessaging, getToken, onMessage } from 'firebase/messaging'; // Correct imports
import Error from './components/Error.jsx';
import LoadingShell from './components/LoadingShell.jsx';
import Notifikacija, { showNotification } from './components/Notifikacija';
import { ToastContainer, toast } from 'react-toastify';
import { messaging } from './firebase-config';
import 'react-toastify/dist/ReactToastify.css';
import About from './scenes/About';
import CookieConsent from './components/CookieConsent';
import TermsAndWelcome from './components/TermsAndWelcome';
import { NotificationProvider } from './context/NotificationContext';
import InstallPWA from './components/InstallPWA';
import ReportProblem from './scenes/ReportProblem';
import { sendAnalytics } from './utils/analytics';
import AnalyticsDashboard from './components/AnalyticsDashboard.jsx';
import { getMessagingInstance } from './firebase-config';
import PollIndicator from './components/PollIndicator';
import DriveIntegration from './scenes/administracija/DriveIntegration';
import DriveCallback from './scenes/administracija/DriveCallback';
import PendingUsers from './scenes/administracija/PendingUsers.jsx';
import SpecialOccasionPopup from './components/SpecialOccasionPopup';
import ResetPassword from './components/ResetPassword.jsx';
import DriveDocs from './scenes/DriveDocs.jsx';
import EnrollmentConfirm from './scenes/EnrollmentConfirm.jsx';
import EnrollmentDashboard from './scenes/administracija/EnrollmentDashboard.jsx';
import MentorSignUpForm from './scenes/MentorSignUpForm.jsx';
import NetworkStatus from './components/NetworkStatus.jsx';

// Initialize socket outside component
let socket = io(ApiConfig.socketUrl, {
  withCredentials: true,
  transports: ['websocket', 'polling'],
  autoConnect: false // Don't connect automatically
});

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCulVokylkRYHA6wXnQkcEbO9b0pgON00w",
  authDomain: "cadenza-d5776.firebaseapp.com",
  projectId: "cadenza-d5776",
  storageBucket: "cadenza-d5776.appspot.com",
  messagingSenderId: "975125523948",
  appId: "1:975125523948:web:86c084bdc5e3d7ae30a4c9",
  measurementId: "G-DZT5CQ2WL3"
};

const app = initializeApp(firebaseConfig);

// Error boundary implementation
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        // Process error details first
        const isCritical = this.isCriticalError(error);
        const errorDetails = {
            componentStack: errorInfo?.componentStack,
            type: 'React Component Error',
            time: new Date().toISOString(),
            props: this.props.componentProps || {}
        };
        
        // Then navigate to error page with processed data
        this.props.navigate('/error', {
            state: {
                error: error?.message || 'Component Error',
                stack: error?.stack,
                details: errorDetails,
                previousPath: window.location.pathname,
                isCritical
            }
        });
    }

    isCriticalError(error) {
        const criticalErrors = [
            'token expired',
            'unauthorized',
            'authentication failed'
        ];

        return criticalErrors.some(criticalError =>
            error.message?.toLowerCase().includes(criticalError.toLowerCase())
        );
    }

    render() {
        if (this.state.hasError) {
            return null; // Return null since we're navigating to error page
        }
        return this.props.children;
    }
}

const App = () => {
    const month = getCurrentSchoolYear();
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const isLoggedIn = useSelector(state => state.isLoggedIn);
    const user = useSelector(state => state.user);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [notification, setNotification] = useState(null);
    const [unreadChatsCount, setUnreadChatsCount] = useState(0);
    const [activePolls, setActivePolls] = useState([]);
    const [showPollIndicator, setShowPollIndicator] = useState(true);
    const [showSpecialPopup, setShowSpecialPopup] = useState(false);
    const [specialPopupData, setSpecialPopupData] = useState({
        title: '',
        message: '',
        image: ''
    });
    const [enrollmentChecked, setEnrollmentChecked] = useState(false);
    const [needsEnrollment, setNeedsEnrollment] = useState(false);
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [networkNotification, setNetworkNotification] = useState(null);

    // Theme detection effect
    useEffect(() => {
        const savedTheme = localStorage.getItem('theme');
        const savedColors = {
            isticanje: localStorage.getItem('isticanje'),
            isticanje2: localStorage.getItem('isticanje2'),
            isticanje3: localStorage.getItem('isticanje3'),
            pozadina: localStorage.getItem('pozadina')
        };

        if (savedTheme) {
            document.body.className = savedTheme;
        } else {
            // Check system preference
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            const initialTheme = prefersDark ? 'dark' : 'light';
            document.body.className = initialTheme;
            localStorage.setItem('theme', initialTheme);
        }

        // Apply saved colors if they exist
        if (savedColors.isticanje) {
            document.documentElement.style.setProperty('--isticanje', savedColors.isticanje);
            document.documentElement.style.setProperty('--isticanje2', savedColors.isticanje2);
            document.documentElement.style.setProperty('--isticanje3', savedColors.isticanje3);
            document.documentElement.style.setProperty('--pozadina', savedColors.pozadina);
        }

        // Listen for system theme changes
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleThemeChange = (e) => {
            if (!localStorage.getItem('theme')) { // Only auto-switch if user hasn't manually set a theme
                const newTheme = e.matches ? 'dark' : 'light';
                document.body.className = newTheme;
                localStorage.setItem('theme', newTheme);
            }
        };

        mediaQuery.addEventListener('change', handleThemeChange);
        return () => mediaQuery.removeEventListener('change', handleThemeChange);
    }, []);

    // Network status monitoring
    useEffect(() => {
        const handleOnline = () => {
            console.log('Network: Online detected');
            setIsOnline(true);
        };
        
        const handleOffline = () => {
            console.log('Network: Offline detected');
            setIsOnline(false);
        };

        // Check initial network status
        if (!navigator.onLine) {
            console.log('Network: Initial check - offline');
            handleOffline();
        }

        // Add periodic network check for better reliability
        const checkNetworkStatus = () => {
            const currentStatus = navigator.onLine;
            if (currentStatus !== isOnline) {
                console.log(`Network: Status changed from ${isOnline} to ${currentStatus}`);
                if (currentStatus) {
                    handleOnline();
                } else {
                    handleOffline();
                }
            }
        };

        // Check every 5 seconds
        const networkCheckInterval = setInterval(checkNetworkStatus, 5000);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            clearInterval(networkCheckInterval);
        };
    }, [isOnline]);

    // Global error handler for uncaught promises
    useEffect(() => {
        const handleUnhandledRejection = (event) => {
            console.error('Unhandled promise rejection:', event.reason);

            const isCriticalError = criticalErrors.some(criticalError =>
                event.reason?.message?.toLowerCase().includes(criticalError.toLowerCase())
            );

            navigate('/error', {
                state: {
                    error: event.reason?.message || 'An unexpected error occurred',
                    stack: event.reason?.stack,
                    details: {
                        type: 'Unhandled Promise Rejection',
                        additionalInfo: event.reason
                    },
                    previousPath: window.location.pathname,
                    isCritical: isCriticalError
                }
            });
            event.preventDefault();
        };

        const criticalErrors = [
            'Token expired',
            'Invalid token',
            'Unauthorized',
            'Authentication failed',
            'Token validation failed'
        ];

        window.addEventListener('unhandledrejection', handleUnhandledRejection);
        return () => window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    }, [navigate]);

    useEffect(() => {
        const initializeAppFunction = async () => {
            setLoading(true);
            try {
                const token = localStorage.getItem('token');

                if (!token) {
                    dispatch(authActions.logout());
                    setLoading(false);
                    return;
                }

                // Send analytics data
                await sendAnalytics();

                // Verify token and get user data with caching
                const response = await ApiConfig.cachedApi.get('/api/user');

                if (response?.user) {
                    dispatch(authActions.updateUser(response.user));
                    console.log("User Data:", response.user)

                    // Handle FCM token if needed
                    try {
                        const messagingInstance = getMessagingInstance();
                        if (messagingInstance) {
                            const fcmToken = await getToken(messagingInstance, {
                                vapidKey: "BB3Wbtcy5tB6mujuv50L9AVzlhE7kgq6pACMtQ-UZjWeY9MCMPHaFqpiCf6Iz5Tkk35YsLfOPTg4tGprkZRAGsU"
                            });
                            // Only update if token is different and not null
                            if (fcmToken && fcmToken !== response.user.fcmToken) {
                                console.log('FCM token changed, updating...');
                                await ApiConfig.api.post('/api/users/fcm-token',
                                    { fcmToken },
                                    {
                                        headers: {
                                            'Authorization': `Bearer ${token}`
                                        }
                                    }
                                );
                            } else {
                                console.log('FCM token unchanged, skipping update');
                            }
                        } else {
                            console.log('Push notifications are not supported on this device/browser');
                        }
                    } catch (fcmError) {
                        console.warn('FCM token update failed:', fcmError);
                    }
                } else {
                    dispatch(authActions.logout());
                    navigate('/login');
                }
            } catch (error) {
                console.error('App initialization error:', error);
                dispatch(authActions.logout());
                navigate('/login');
            } finally {
                setLoading(false);
            }
        };

        initializeAppFunction();
    }, [dispatch, navigate]);

    // Add cache invalidation on logout
    useEffect(() => {
        if (!isLoggedIn) {
            ApiConfig.invalidateCache();
        }
    }, [isLoggedIn]);

    useEffect(() => {
        const requestNotification = async () => {
            if (isLoggedIn) {
                try {
                    if (!('Notification' in window)) {
                        console.log('This browser does not support notifications');
                        toast.info('Vaš preglednik ne podržava push notifikacije. Nećete primati obavijesti o novim porukama.', {
                            position: "top-right",
                            autoClose: 8000,
                            hideProgressBar: false,
                            closeOnClick: true,
                            pauseOnHover: true,
                            draggable: true,
                            progress: undefined,
                            theme: "light",
                            style: {
                                background: 'var(--iznad)',
                                color: 'var(--tekst)',
                            }
                        });
                        return;
                    }

                    const permission = await Notification.requestPermission();
                    if (permission === 'granted') {
                        console.log('Notification permission granted');
                        // Get FCM token after permission is granted
                        try {
                            const messagingInstance = getMessagingInstance();
                            if (messagingInstance) {
                                const fcmToken = await getToken(messagingInstance, {
                                    vapidKey: "BB3Wbtcy5tB6mujuv50L9AVzlhE7kgq6pACMtQ-UZjWeY9MCMPHaFqpiCf6Iz5Tkk35YsLfOPTg4tGprkZRAGsU"
                                });
                                if (fcmToken) {
                                    console.log('FCM Token obtained');
                                    await ApiConfig.api.post('/api/users/fcm-token', { fcmToken });
                                }
                            } else {
                                console.log('Push notifications are not supported on this device/browser');
                                toast.info('Vaš preglednik ne podržava push notifikacije. Nećete primati obavijesti o novim porukama.', {
                                    position: "top-right",
                                    autoClose: 8000,
                                    hideProgressBar: false,
                                    closeOnClick: true,
                                    pauseOnHover: true,
                                    draggable: true,
                                    progress: undefined,
                                    theme: "light",
                                    style: {
                                        background: 'var(--iznad)',
                                        color: 'var(--tekst)',
                                    }
                                });
                            }
                        } catch (tokenError) {
                            console.error('Error getting or sending FCM token:', tokenError);
                        }
                    } else {
                        console.warn('Notification permission denied');
                    }
                } catch (error) {
                    console.error('Error requesting notification permission:', error);
                }
            }
        };

        requestNotification();
    }, [isLoggedIn]);

    // Socket connection effect
    useEffect(() => {
        console.log('Socket effect triggered:', { isLoggedIn, userId: user?.id });

        if (isLoggedIn && user?.id) {
            // Configure socket auth
            socket.auth = { userId: user.id };
            console.log('Configuring socket with userId:', user.id);

            // Connect socket if not connected
            if (!socket.connected) {
                console.log('Connecting socket...');
                socket.connect();
            }

            // Socket event listeners
            socket.on('connect', () => {
                console.log('Socket connected:', socket.id);
            });

            socket.on('connect_error', (error) => {
                console.error('Socket connection error:', error);
            });

            // Clean up on unmount
            return () => {
                console.log('Cleaning up socket connections...');
                socket.off('connect');
                socket.off('connect_error');
                if (socket.connected) {
                    socket.disconnect();
                }
            };
        } else if (!isLoggedIn && socket.connected) {
            console.log('User not logged in, disconnecting socket');
            socket.disconnect();
        }
    }, [isLoggedIn, user]);

    // Add this effect to update unread count when chat data changes
    useEffect(() => {
        const updateUnreadCount = async () => {
            try {
                const response = await ApiConfig.api.get('/api/chats');
                if (Array.isArray(response.data)) {
                    const totalUnread = response.data.reduce((total, chat) => {
                        if (chat.participant) {
                            return total + (parseInt(chat.unreadCount || 0, 10));
                        }
                        if (chat.groupId) {
                            return total + (parseInt(user?.isMentor ? chat.unreadCountMentor : chat.unreadCountUser, 10) || 0);
                        }
                        return total;
                    }, 0);
                    setUnreadChatsCount(totalUnread);
                }
            } catch (error) {
                console.error('Error fetching unread count:', error);
            }
        };

        if (isLoggedIn && user) {
            updateUnreadCount();
        }
    }, [isLoggedIn, user]);

    // Update the socket effect to handle unread count updates and notifications
    useEffect(() => {
        try {
            if (user && user.id && socket) {
                socket.on('newMessage', async (newMessage) => {
                    console.log('New message received:', newMessage);

                    // Update unread count when new message arrives
                    const response = await ApiConfig.api.get('/api/chats');
                    if (Array.isArray(response.data)) {
                        const totalUnread = response.data.reduce((total, chat) => {
                            if (chat.participant) {
                                return total + (parseInt(chat.unreadCount || 0, 10));
                            }
                            if (chat.groupId) {
                                return total + (parseInt(user.isMentor ? chat.unreadCountMentor : chat.unreadCountUser, 10) || 0);
                            }
                            return total;
                        }, 0);
                        setUnreadChatsCount(totalUnread || 1); // Ensure it's at least 1 if we got a new message
                    } else {
                        // If we can't get the exact count, just increment by 1
                        setUnreadChatsCount(prev => prev + 1);
                    }

                    // Always broadcast event for NavSideChat update
                    const chatUpdateEvent = new CustomEvent('chatUpdate', {
                        detail: newMessage
                    });
                    window.dispatchEvent(chatUpdateEvent);

                    // Only show toast notification if not in chat
                    const isOnChatRoute = window.location.pathname === '/chat';
                    if (!isOnChatRoute) {
                        toast.info(`Nova poruka od ${newMessage.sender.ime + ' ' + newMessage.sender.prezime || newMessage.senderMentor.ime + ' ' + newMessage.senderMentor.prezime }`, {
                            position: "top-right",
                            autoClose: 5000,
                            hideProgressBar: false,
                            closeOnClick: true,
                            pauseOnHover: true,
                            draggable: true,
                            progress: undefined,
                            theme: "light",
                            style: {
                                background: 'var(--iznad)',
                                color: 'var(--tekst)',
                            },
                            onClick: () => {
                                window.focus();
                                navigate('/chat');
                            }
                        });
                    }
                });

                socket.on('newGroupMessage', async (newMessage) => {
                    console.log('New group message received:', newMessage);

                    // Update unread count when new group message arrives
                    const response = await ApiConfig.api.get('/api/chats');
                    if (Array.isArray(response.data)) {
                        const totalUnread = response.data.reduce((total, chat) => {
                            if (chat.participant) {
                                return total + (parseInt(chat.unreadCount || 0, 10));
                            }
                            if (chat.groupId) {
                                return total + (parseInt(user.isMentor ? chat.unreadCountMentor : chat.unreadCountUser, 10) || 0);
                            }
                            return total;
                        }, 0);
                        setUnreadChatsCount(totalUnread || 1); // Ensure it's at least 1 if we got a new message
                    } else {
                        // If we can't get the exact count, just increment by 1
                        setUnreadChatsCount(prev => prev + 1);
                    }

                    // Always broadcast event for NavSideChat update
                    const chatUpdateEvent = new CustomEvent('chatUpdate', {
                        detail: newMessage
                    });
                    window.dispatchEvent(chatUpdateEvent);

                    // Only show toast notification if not in chat
                    const isOnChatRoute = window.location.pathname === '/chat';
                    if (!isOnChatRoute) {
                        const senderName = newMessage.senderName || newMessage.senderMentor?.ime || 'korisnik';
                        toast.info(`${senderName} je poslao/la poruku u grupi ${newMessage.groupName || 'Grupa'}`, {
                            position: "top-right",
                            autoClose: 5000,
                            hideProgressBar: false,
                            closeOnClick: true,
                            pauseOnHover: true,
                            draggable: true,
                            progress: undefined,
                            theme: "light",
                            style: {
                                background: 'var(--iznad)',
                                color: 'var(--tekst)',
                            },
                            onClick: () => {
                                window.focus();
                                navigate('/chat');
                            }
                        });
                    }
                });

                return () => {
                    socket.off('newMessage');
                    socket.off('newGroupMessage');
                };
            }
        } catch (error) {
            console.error('Error setting up socket:', error);
        }
    }, [user, socket, navigate]);

    // Firebase messaging effect for in-app notifications
    useEffect(() => {
        if (!messaging) {
            console.log('Messaging not initialized');
            return;
        }

        const messageHandler = (payload) => {
            console.log('Received message:', payload);
            const { notification } = payload.data || {};

            if (notification) {
                try {
                    const notificationData = JSON.parse(notification);
                    toast(notificationData.body, {
                        type: notificationData.type || 'info'
                    });

                    // Update unread count if it's a chat message
                    if (notificationData.type === 'chat') {
                        fetchUnreadCount();  // Use this instead of updateUnreadCount
                    }
                } catch (error) {
                    console.error('Error parsing notification:', error);
                }
            }
        };

        // Function to fetch unread count
        const fetchUnreadCount = async () => {
            try {
                const response = await ApiConfig.api.get('/api/chats');
                if (response.data) {
                    const unreadCount = response.data.reduce((acc, chat) =>
                        acc + (chat.unreadCount || 0), 0);
                    setUnreadChatsCount(unreadCount);
                }
            } catch (error) {
                console.error('Error fetching unread count:', error);
            }
        };

        if (isLoggedIn) {
            // Initial fetch of unread count
            fetchUnreadCount();

            // Set up message handler
            if (messaging) {
                onMessage(messaging, messageHandler);
            }
        }
    }, [isLoggedIn]);

    // Update the active polls effect to use cached API
    useEffect(() => {
        let pollInterval;
        const fetchActivePolls = async () => {
            try {
                const response = await ApiConfig.cachedApi.get('/api/polls/active');
                console.log('Polls response:', response);

                // Filter out expired polls
                const now = new Date();
                const activePolls = (response.data?.polls || []).filter(poll => 
                    new Date(poll.endDate) > now
                );

                setActivePolls(activePolls);

                // If no active polls, clear the interval
                if (activePolls.length === 0 && pollInterval) {
                    console.log('No active polls, clearing interval');
                    clearInterval(pollInterval);
                    pollInterval = null;
                }
            } catch (error) {
                console.error('Error fetching active polls:', error);
                setActivePolls([]); 
                // Clear interval on error
                if (pollInterval) {
                    clearInterval(pollInterval);
                    pollInterval = null;
                }
            }
        };

        if (user && (user.isMentor || user.pohadjaTeoriju)) {
            // Initial fetch
            fetchActivePolls();
            
            // Only set up interval if not already running
            if (!pollInterval) {
                pollInterval = setInterval(fetchActivePolls, 30000);
            }

            return () => {
                if (pollInterval) {
                    clearInterval(pollInterval);
                }
            };
        }
    }, [user]);

    // Special occasion popup check
    useEffect(() => {
        const checkSpecialOccasions = () => {
            const today = new Date();
            const month = today.getMonth() + 1; // 0-indexed, so add 1
            const day = today.getDate();
            const year = today.getFullYear();
            const todayString = `${year}-${month}-${day}`;
            
            // Get the popup history from localStorage
            let popupHistory = {};
            try {
                const storedHistory = localStorage.getItem('popupHistory');
                if (storedHistory) {
                    popupHistory = JSON.parse(storedHistory);
                }
            } catch (error) {
                console.error('Error parsing popup history:', error);
                popupHistory = {};
            }
            
            // Function to check if a popup type has been shown today
            const hasShownToday = (popupType) => {
                return popupHistory[popupType] === todayString;
            };
            
            // Function to mark a popup as shown
            const markPopupShown = (popupType) => {
                popupHistory[popupType] = todayString;
                localStorage.setItem('popupHistory', JSON.stringify(popupHistory));
            };
            
            // For testing - show popup when user logs in
            const forceShowPopup = false; // Set to true to test popup
            if (forceShowPopup && isLoggedIn) {
                setSpecialPopupData({
                    title: 'Sretan Uskrs!',
                    message: 'Želimo vam sretan Uskrs ispunjen radošću i mirom.',
                    image: '/images/cadenza-easter.png',
                    type: 'test'
                });
                setShowSpecialPopup(true);
                return;
            }
            
            // Birthday check (if user is logged in and has birthday data)
            if (isLoggedIn && user?.datumRodjenja && !hasShownToday('birthday')) {
                try {
                    const birthDate = new Date(user.datumRodjenja);
                    if (!isNaN(birthDate.getTime())) { // Check if date is valid
                        const birthMonth = birthDate.getMonth() + 1;
                        const birthDay = birthDate.getDate();
                        
                        if (month === birthMonth && day === birthDay) {
                            if (user?.ime) { // Make sure we have the user's name
                                setSpecialPopupData({
                                    title: 'Sretan Rođendan!',
                                    message: `${user.ime}, želimo Vam sve najbolje povodom rođendana!`,
                                    image: '/images/cadenza-birthday.png',  // Using birthday image
                                    type: 'birthday'
                                });
                                setShowSpecialPopup(true);
                                markPopupShown('birthday');
                                return; // Return early to prioritize birthday over other occasions
                            }
                        }
                    }
                } catch (error) {
                    console.error('Error processing birthday data:', error);
                    // Just continue to other checks if there's an error
                }
            }
            
            // Easter check
            const isEaster = 
                (month === 3 && day === 31 && year === 2024) || 
                (month === 4 && day === 20 && year === 2025);
                
            if (isEaster && !hasShownToday('easter')) {
                setSpecialPopupData({
                    title: 'Sretan Uskrs!',
                    message: 'Želimo vam sretan Uskrs ispunjen radošću i mirom.',
                    image: '/images/cadenza-easter.png',  // Using specific Easter image
                    type: 'easter'
                });
                setShowSpecialPopup(true);
                markPopupShown('easter');
                return;
            }
            
            // Christmas
            if (month === 12 && day === 25 && !hasShownToday('christmas')) {
                setSpecialPopupData({
                    title: 'Sretan Božić!',
                    message: 'Želimo vam Božić ispunjen radošću, mirom i ljubavlju.',
                    image: '/images/cadenza-christmas.png',  // Using Christmas image
                    type: 'christmas'
                });
                setShowSpecialPopup(true);
                markPopupShown('christmas');
                return;
            }
            
            // New Year
            if (month === 1 && day === 1 && !hasShownToday('newYear')) {
                setSpecialPopupData({
                    title: 'Sretna Nova Godina!',
                    message: 'Želimo vam puno sreće, zdravlja i uspjeha u novoj godini.',
                    image: '/images/cadenza-newyear.png',  // Using New Year image
                    type: 'newYear'
                });
                setShowSpecialPopup(true);
                markPopupShown('newYear');
            }
        };

        checkSpecialOccasions();
    }, [isLoggedIn, user]);

    function getCurrentSchoolYear() {
        const now = new Date();
        const month = now.getMonth();
        return month;
      }

    // Enrollment check effect
    useEffect(() => {
        const checkEnrollment = async () => {
            if (isLoggedIn && user) {
                try {
                    const res = await ApiConfig.api.get('/api/enrollment/current');
                    if (!res.data.enrollment || !res.data.enrollment.agreementAccepted) {
                        setNeedsEnrollment(true);
                    } else {
                        setNeedsEnrollment(false);
                    }
                } catch (err) {
                    setNeedsEnrollment(true);
                } finally {
                    setEnrollmentChecked(true);
                }
            } else {
                setEnrollmentChecked(true);
                setNeedsEnrollment(false);
            }
        };
        checkEnrollment();
    }, [isLoggedIn, user]);

    // Make socket available globally
    window.socket = socket;
    
    // Add network status check function for testing
    window.checkNetworkStatus = () => {
        console.log('Manual network check:', {
            navigatorOnLine: navigator.onLine,
            currentState: isOnline,
            userAgent: navigator.userAgent
        });
        return {
            navigatorOnLine: navigator.onLine,
            currentState: isOnline
        };
    };

    if (loading || !enrollmentChecked) {
        return <LoadingShell />;
    }

    if (isLoggedIn && needsEnrollment && user.isStudent && month >= 9) {
        return <EnrollmentConfirm user={user} />;
    }

    return (
        <ErrorBoundary navigate={navigate}>
            <Routes>
                <Route path="/" element={<Welcome />} />
                <Route path="/login" element={
                    isLoggedIn ? <Navigate to="/user" /> : <Login />
                } />
                <Route path="/signup" element={
                    isLoggedIn ? <Navigate to="/user" /> : <SignUpForm />
                } />
                <Route path="/signup/f8h3k2j9d5m7n1p4q6r8s0t2u4v6w8x0" element={<MentorSignUpForm />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/enroll" element={<EnrollmentConfirm user={user} />} />

                {/* Protected Routes with NotificationProvider */}
                <Route element={
                    isLoggedIn && user ? (
                        <NotificationProvider>
                            <ProtectedRoute>
                                <Outlet />
                            </ProtectedRoute>
                        </NotificationProvider>
                    ) : (
                        <Navigate to="/login" replace />
                    )
                }>
                    <Route path="/user" element={
                            <Naslovna user={user} unreadChatsCount={unreadChatsCount}/>
                    } />
                    <Route path="/profil" element={<Profil user={user} unreadChatsCount={unreadChatsCount}/>} />
                    <Route path="/chat" element={
                        <Chat
                            user={user}
                            socket={socket}
                            chat={true}
                            unreadChatsCount={unreadChatsCount}
                            onMessagesRead={async (count) => {
                                // Update the unread count
                                setUnreadChatsCount(prev => Math.max(0, prev - count));

                                // Fetch fresh chat data to update NavSideChat
                                try {
                                    const response = await ApiConfig.api.get('/api/chats');
                                    if (Array.isArray(response.data)) {
                                        const totalUnread = response.data.reduce((total, chat) => {
                                            if (chat.participant) {
                                                return total + (parseInt(chat.unreadCount || 0, 10));
                                            }
                                            if (chat.groupId) {
                                                return total + (parseInt(user?.isMentor ? chat.unreadCountMentor : chat.unreadCountUser, 10) || 0);
                                            }
                                            return total;
                                        }, 0);
                                        setUnreadChatsCount(totalUnread);
                                    }

                                    // Trigger NavSideChat update
                                    const chatUpdateEvent = new CustomEvent('chatUpdate');
                                    window.dispatchEvent(chatUpdateEvent);
                                } catch (error) {
                                    console.error('Error updating chat data:', error);
                                }
                            }}
                        />
                    } />
                    <Route path="/racuni" element={<Racuni user={user} unreadChatsCount={unreadChatsCount}/>} />
                    <Route path="/raspored" element={<Raspored user={user} unreadChatsCount={unreadChatsCount}/>} />
                    <Route path="/obavijesti" element={<Obavijesti user={user} unreadChatsCount={unreadChatsCount}/>} />
                    {/* 
                    <Route path="/documents" element={<Documents user={user} unreadChatsCount={unreadChatsCount}/>} />
                    <Route path="/documents/:documentId" element={<Documents user={user} unreadChatsCount={unreadChatsCount}/>} />*/}
                    <Route path="/dokumenti" element={<DriveDocs user={user} unreadChatsCount={unreadChatsCount}/>} />
                    <Route path="/report-problem" element={<ReportProblem />} />

                    {/* Admin routes */}
                    {user?.isAdmin && (
                        <>
                            <Route path="/admin/*" element={<Admin user={user} />} />
                            <Route path="/korisnici" element={<Korisnici user={user} />} />
                            <Route path="/mentori" element={<Mentori user={user} />} />
                            <Route path="/pending-users" element={<PendingUsers user={user} />} />
                            <Route path="/racuni-admin" element={<RacuniAdmin user={user} />} />
                            <Route path="/programi" element={<Programs user={user} />} />
                            <Route path="/classrooms" element={<Classrooms user={user} />} />
                            <Route path="/delete" element={<Delete user={user} />} />
                            <Route path='/analytics' element={<AnalyticsDashboard />} />
                            <Route path='/enrollments' element={<EnrollmentDashboard />} />
                        </>
                    )}

                    <Route path='/drive-integration' element={
                        <ProtectedRoute isAllowed={isLoggedIn && user?.isAdmin} redirectPath="/login">
                            <DriveIntegration user={user} />
                        </ProtectedRoute>
                    } />
                    <Route path='/drive-callback' element={<DriveCallback />} />
                </Route>

                <Route path="/error" element={<Error />} />
                <Route path="/about" element={<About />} />
                <Route path="*" element={
                    <Navigate to="/error" replace state={{
                        error: "Page not found",
                        details: {
                            type: "404",
                            path: window.location.pathname
                        }
                    }} />
                } />
            </Routes>
            <CookieConsent />
            <TermsAndWelcome />
            <InstallPWA />
            <ToastContainer
                position="top-right"
                autoClose={5000}
                hideProgressBar={false}
                newestOnTop={false}
                closeOnClick
                rtl={false}
                pauseOnFocusLoss
                draggable
                pauseOnHover
            />
            {notification && (
                <Notifikacija
                    message={notification.message}
                    type={notification.type}
                    onClose={() => setNotification(null)}
                />
            )}
            {networkNotification && (
                <Notifikacija
                    message={networkNotification.message}
                    type={networkNotification.type}
                    duration={networkNotification.duration}
                    onClose={() => setNetworkNotification(null)}
                />
            )}
            {user && showPollIndicator && (user.isMentor || user.pohadjaTeoriju) && (
                <PollIndicator
                    user={user}
                    polls={activePolls}
                    onHide={() => setShowPollIndicator(false)}
                />
            )}
            <SpecialOccasionPopup
                isOpen={showSpecialPopup}
                onClose={() => setShowSpecialPopup(false)}
                title={specialPopupData.title}
                message={specialPopupData.message}
                image={specialPopupData.image}
            />
            <NetworkStatus isOnline={isOnline} />
            {/* Network test component - hidden per user request */}
            {/* {process.env.NODE_ENV === 'development' && <NetworkTest />} */}
        </ErrorBoundary>
    );
};

export default App;