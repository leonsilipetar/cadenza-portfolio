import React, { useEffect, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSelector, useDispatch } from 'react-redux';
import ApiConfig from './apiConfig';
import { authActions } from '../store';
import LoadingShell from './LoadingShell';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();
  const user = useSelector(state => state.user);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(isAuthenticated);
  const [userData, setUser] = useState(user);
  
  // Only fetch user data if we're authenticated but don't have user data
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await ApiConfig.cachedApi.get('/api/user');
        if (response) {
          setUser(response);
          setIsLoggedIn(true);
        }
      } catch (error) {
        console.error('Error checking auth:', error);
        setUser(null);
        setIsLoggedIn(false);
        navigate('/login');
      }
    };

    checkAuth();
  }, [isAuthenticated, user, dispatch, navigate]);

  // Show loading state while checking authentication
  if (loading) {
    return <LoadingShell />;
  }

  // Redirect to login if not authenticated
  if (!isLoggedIn) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If we're authenticated but still loading user data, show loading
  if (isLoggedIn && !userData) {
    return <LoadingShell />;
  }

  return children;
};

export default ProtectedRoute; 