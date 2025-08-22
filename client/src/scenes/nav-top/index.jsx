import { useState, useEffect } from "react";
import '../../App.css';
import { Link } from 'react-router-dom';
import { Icon } from '@iconify/react';
import axios from "axios";
import { useDispatch } from "react-redux";
import { authActions } from "../../store";
import ApiConfig from "../../components/apiConfig.js";

const NavTop = ({user, naslov, chat, group, onAddMembers, onRemoveMembers}) => {
  const [theme, setTheme] = useState(
    localStorage.getItem('theme') || 'light'
  );

  useEffect(() => {
    localStorage.setItem('theme', theme);
    document.body.className = theme;
  }, [theme]);



  // Check if the current user is the admin of the group
  const isGroupAdmin = group && user && group.adminId === user.id;

  // Check if the current user is a member of the group
  const isGroupMember = group && (
    (group.members && group.members.some(member => member.id === user.id)) ||
    (group.mentorMembers && group.mentorMembers.some(mentor => mentor.id === user.id))
  );

  // Check if the current user is a member but NOT the admin
  const isRegularMember = group && isGroupMember && !isGroupAdmin;



  return (
    <>
      <div className="nav-top">
        {user && user.isAdmin && !chat && (
          <div className="admin-gumb">
            <Link className='link' to="/admin">
              <p>Admin</p>
            </Link>
          </div>
        )}
        <h1>
          {naslov}
        </h1>
        <div className="nav-top-actions">
          {!chat && (
            <Link
              to="/report-problem"
              className="action-btn spremiBtn"
              title="Prijavi problem"
            >
              <Icon icon="solar:info-square-broken" />
            </Link>
          )}
          {chat && naslov &&(
            <div className="group-actions">
              {/*
            <button
              className="action-btn spremiBtn"
              onClick={() => chat.onStartVideoCall && chat.onStartVideoCall()}
              title="Start video call"
              disabled={!chat.canStartCall}
            >
              <Icon icon="mdi:video" />
            </button>*/}
            </div>
          )}
              
          {group && (
            <div className="group-actions">
              <button
                className="action-btn spremiBtn"
                onClick={onAddMembers}
                title="Detalji grupe"
              >
                 <Icon icon="solar:menu-dots-bold" />
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default NavTop;