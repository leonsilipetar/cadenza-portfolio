import { useState, useEffect } from "react";
import '../../App.css';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch } from "react-redux";
import { authActions } from "../../store/index.js";
import ApiConfig from "../../components/apiConfig.js";
import { Icon } from '@iconify/react';

const NavTopAdmin = ({user, naslov}) => {
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const sendLogoutRequest = async () => {
      try {
        const res = await ApiConfig.api.post('/api/logout');
        console.log('Logout response:', res);
        if (res.status === 200) {
          return res;
        }
        throw new Error('Unable to logout. Try again');
      } catch (err) {
        console.error('Error during logout:', err.response ? err.response.data : err.message);
        throw err;
      }
    };

    const handleLogout = async () => {
      try {
        await sendLogoutRequest();
        dispatch(authActions.logout());
        navigate('/login');
      } catch (error) {
        console.error('Logout failed:', error.message);
        alert('Logout failed. Please try again.');
      }
    };

    const [theme, setTheme] = useState(
      localStorage.getItem('theme') || 'light'
    );

    const toggleTheme = () => {
      if (theme === 'light') {
        setTheme('dark');
      } else {
        setTheme('light');
      }
    };

    useEffect(() => {
      localStorage.setItem('theme', theme);
      document.body.className = theme;
    }, [theme]);

    return (
        <>
        <div className="nav-top">
            <div className="admin-gumb">
              <Link className='link' to="/user"><p>Aplikacija</p></Link>
            </div>
            <div>
                <button className="gumb-novo gumb-nav" onClick={toggleTheme}>
                  <Icon
                    icon={theme === 'dark' ? 'solar:sun-broken' : 'solar:moon-stars-broken'}
                    className="icon"
                  />
                </button>
            </div>
            <div>
                <Link className='link' to="/login" onClick={handleLogout}><p>Odjava</p></Link>
            </div>
        </div>
        </>
    );
}

export default NavTopAdmin;