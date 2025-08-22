import React, { createContext, useContext, useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { authActions } from '../store';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const user = useSelector(state => state.user);
    const isLoggedIn = useSelector(state => state.isLoggedIn);
    const dispatch = useDispatch();
    const [loading, setLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    useEffect(() => {
        // Check if token exists in localStorage
        const token = localStorage.getItem('token');
        if (token) {
            setIsAuthenticated(true);
        } else {
            setIsAuthenticated(false);
        }
        setLoading(false);
    }, []);

    // Update authentication state when Redux state changes
    useEffect(() => {
        setIsAuthenticated(isLoggedIn);
    }, [isLoggedIn]);

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');

        // Dispatch to Redux
        dispatch(authActions.logout());

        // Update local state
        setIsAuthenticated(false);

        // Force redirect to login
        window.location.href = '/login';
    };

    return (
        <AuthContext.Provider value={{
            user,
            isAuthenticated,
            loading,
            logout
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    return useContext(AuthContext);
};