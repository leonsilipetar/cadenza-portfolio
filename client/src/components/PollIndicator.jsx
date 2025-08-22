import React, { useState, useEffect, useRef } from 'react';
import { Icon } from '@iconify/react';
import { useNavigate } from 'react-router-dom';
import Draggable from 'react-draggable';
import moment from 'moment';
import './PollIndicator.css';

const getMinutesText = (minutes) => {
  if (minutes === 1) return 'minutu';
  if (minutes >= 2 && minutes <= 4) return 'minute';
  return 'minuta';
};

const formatEndDate = (date) => {
  const endDate = moment(date);
  const today = moment().startOf('day');
  
  if (endDate.isSame(today, 'day')) {
    return endDate.format('HH:mm');
  }
  return endDate.format('DD.MM. HH:mm');
};

const getRemainingVoteTime = (responses, userId) => {
  if (!responses) return null;
  const userResponse = responses.find(r => r.userId === userId);
  if (!userResponse) return null;

  const voteTime = new Date(userResponse.timestamp);
  const timeDiff = (new Date() - voteTime) / 1000 / 60; // Convert to minutes
  const remainingTime = Math.max(0, 10 - Math.floor(timeDiff));
  return remainingTime;
};

const PollIndicator = ({ user, polls, onHide }) => {
  const navigate = useNavigate();
  const [isMinimized, setIsMinimized] = useState(false);
  const nodeRef = useRef(null);

  const activePollsCount = polls.length;
  const totalResponses = polls.reduce((sum, poll) => sum + (poll.responses?.length || 0), 0);
  
  const calculateTotalPercentages = () => {
    let totalYes = 0;
    let totalVotes = 0;
    
    polls.forEach(poll => {
      const yesVotes = poll.responses?.filter(r => r.response === 'da').length || 0;
      totalYes += yesVotes;
      totalVotes += poll.responses?.length || 0;
    });
    
    return totalVotes > 0 ? Math.round((totalYes / totalVotes) * 100) : 0;
  };

  // Check if user has voted and can't change vote anymore
  const canUserStillVote = !user.isMentor && polls.some(poll => {
    const remainingTime = getRemainingVoteTime(poll.responses, user.id);
    const hasVoted = poll.responses?.some(r => r.userId === user.id);
    return !hasVoted || (hasVoted && remainingTime > 0);
  });

  // Return null if user has voted and can't change vote anymore
  if (activePollsCount === 0 || (!user.isMentor && !canUserStillVote)) return null;

  const handleClick = () => {
    if (isMinimized) {
      setIsMinimized(false);
    } else {
      navigate('/user');
    }
  };

  return (
    <Draggable bounds="parent" cancel=".poll-indicator-close" nodeRef={nodeRef}>
      <div ref={nodeRef} className={`poll-indicator ${isMinimized ? 'minimized' : ''}`}>
        <button className="poll-indicator-close" onClick={onHide}>
          <Icon icon="solar:close-circle-broken" />
        </button>
        <div className="poll-indicator-content" onClick={handleClick}>
          {!isMinimized ? (
            <>
              <div className="poll-indicator-header">
                <Icon icon="solar:chart-2-broken" className="poll-icon" />
                <span>Aktivne ankete</span>
              </div>
              <div className="poll-indicator-stats">
                <div className="stat-item">
                  <span className="stat-label">Ankete:</span>
                  <span className="stat-value">{activePollsCount}</span>
                </div>
                {user.isMentor ? (
                  <>
                    <div className="stat-item">
                      <span className="stat-label">Odgovori:</span>
                      <span className="stat-value">{totalResponses}</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Pozitivni:</span>
                      <span className="stat-value">{calculateTotalPercentages()}%</span>
                    </div>
                  </>
                ) : (
                  <div className="stat-item">
                    <span className="stat-label">Završava:</span>
                    <span className="stat-value">
                      {formatEndDate(polls[0]?.endDate)}
                    </span>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="poll-indicator-mini">
              <Icon icon="solar:chart-2-broken" />
              <span className="poll-count">{activePollsCount}</span>
            </div>
          )}
        </div>
        <button 
          className="poll-indicator-minimize" 
          onClick={() => setIsMinimized(!isMinimized)}
        >
          <Icon icon={isMinimized ? 'solar:maximize-2-broken' : 'solar:minimize-2-broken'} />
        </button>
      </div>
    </Draggable>
  );
};

export default PollIndicator; 