import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import Navigacija from '../navigacija';
import NavTop from '../nav-top';
import ApiConfig from '../../components/apiConfig.js';
import { Icon } from '@iconify/react';
import PostEditor from '../../components/PostEditor.jsx';
import PostEditorOpened from '../../components/PostEditorOpened.jsx';
import LoadingShell from '../../components/LoadingShell';
import UserProfile from '../../components/UserProfile';
import "../../styles/Posts.css";
import { showNotification } from '../../components/Notifikacija';
import { useNavigate, useLocation } from 'react-router-dom';
import moment from 'moment';

axios.defaults.withCredentials = true;

const Naslovna = ({ user, unreadChatsCount }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [activeTab, setActiveTab] = useState('posts');
  const [showPostEditor, setShowPostEditor] = useState(false);
  const [showPostEditorOpened, setShowPostEditorOpened] = useState(false);
  const [currentPost, setCurrentPost] = useState(null);
  const [expandedPosts, setExpandedPosts] = useState(new Set());
  const [showUserProfile, setShowUserProfile] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [showPollForm, setShowPollForm] = useState(false);
  const [activePolls, setActivePolls] = useState([]);
  const [selectedPoll, setSelectedPoll] = useState(null);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['Da', 'Ne']);
  const [pollEndDate, setPollEndDate] = useState('');
  const [showPostDetails, setShowPostDetails] = useState(false);
  const [detailedPost, setDetailedPost] = useState(null);

  // Handle URL parameters and set active tab
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tabParam = params.get('tab');
    if (tabParam) {
      setActiveTab(tabParam);
    } else if (activePolls.length > 0 && (user.isMentor || user.pohadjaTeoriju)) {
      // Automatically set polls tab if there are active polls and user has access
      setActiveTab('polls');
      // Update URL without causing a navigation
      const newUrl = new URL(window.location);
      newUrl.searchParams.set('tab', 'polls');
      window.history.replaceState({}, '', newUrl);
    }
  }, [location.search, activePolls.length, user]);

  const otvoreno = 'naslovna';

  const fetchPosts = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await ApiConfig.cachedApi.get('/api/posts', {
        headers: { 'Cache-Control': 'no-cache' }
      });
      setPosts(response.posts || []);
    } catch (error) {
      console.error('Error fetching posts:', error);
      if (error.response) {
        console.log('Error response:', error.response.data);
      }
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadInitialData = async () => {
      await fetchPosts();
    };

    loadInitialData();
    return () => { isMounted = false; };
  }, [fetchPosts]);

  useEffect(() => {
    let pollInterval;
    const fetchActivePolls = async () => {
      try {
        const response = await ApiConfig.api.get('/api/polls/active');
        
        // Filter out expired polls
        const now = new Date();
        const activePolls = (response.data.polls || []).filter(poll => 
          new Date(poll.endDate) > now
        );

        setActivePolls(activePolls);

        // If no active polls, clear the interval
        if (activePolls.length === 0 && pollInterval) {
          console.log('No active polls in Naslovna, clearing interval');
          clearInterval(pollInterval);
          pollInterval = null;
        }
      } catch (error) {
        console.error('Error fetching active polls:', error);
        if (error.response?.status === 403) {
          showNotification('info', error.response.data.message);
        }
        // Clear interval on error
        if (pollInterval) {
          clearInterval(pollInterval);
          pollInterval = null;
        }
      }
    };

    if (user?.isMentor || user?.pohadjaTeoriju) {
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

  const isExpired = (endDate) => {
    return new Date(endDate) <= new Date();
  };

  const handleSearch = async (query) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      const response = await ApiConfig.cachedApi.get('/api/search/users', {
        params: { query }
      });
      setSearchResults(response.results || []);
    } catch (error) {
      console.error('Error searching:', error);
      showNotification('error', 'Error searching users');
    }
  };

  const handleCreatePost = () => {
    setShowPostEditor(true);
  };

  const handleEditPost = (post) => {
    setCurrentPost(post);
    setShowPostEditorOpened(true);
  };

  const handlePostSaved = async () => {
    await fetchPosts(); // Refresh posts after saving
  };

  const handleDeletePost = async (postId) => {
    if (!window.confirm('Jeste li sigurni da želite obrisati ovu objavu?')) {
      return;
    }

    try {
      await ApiConfig.api.delete(`/api/posts/${postId}`);
      showNotification('success', 'Objava uspješno obrisana');
      await fetchPosts();
    } catch (error) {
      console.error('Error deleting post:', error);
      showNotification('error', error.response?.data?.message || 'Greška pri brisanju objave');
    }
  };

  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleDateString('hr-HR', options);
  };

  const togglePostExpansion = (postId) => {
    setExpandedPosts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(postId)) {
        newSet.delete(postId);
      } else {
        newSet.add(postId);
      }
      return newSet;
    });
  };

  const handleOpenPost = (post) => {
    setDetailedPost(post);
    setShowPostDetails(true);
  };

  const handleClosePostDetails = () => {
    setShowPostDetails(false);
    setDetailedPost(null);
  };

  const handleCreatePoll = async () => {
    if (!pollQuestion || pollOptions.length < 2 || !pollEndDate) {
      showNotification('error', 'Molimo popunite sva polja');
      return;
    }

    try {
      await ApiConfig.api.post('/api/polls', {
        question: pollQuestion,
        options: pollOptions,
        type: 'teorija',
        endDate: pollEndDate
      });

      showNotification('success', 'Anketa je uspješno kreirana');
      setShowPollForm(false);
      setPollQuestion('');
      setPollOptions(['Da', 'Ne']);
      setPollEndDate('');
      const response = await ApiConfig.api.get('/api/polls/active');
      setActivePolls(response.data.polls || []);
    } catch (error) {
      console.error('Error creating poll:', error);
      showNotification('error', 'Greška pri kreiranju ankete');
    }
  };

  const handleVote = async (pollId, option) => {
    try {
      await ApiConfig.api.post(`/api/polls/${pollId}/vote`, { 
        response: option,
        userId: user.id,
        ime: user.ime,
        prezime: user.prezime,
        timestamp: new Date().toISOString()
      });
      
      // After successful vote, fetch the updated poll without cache
      const response = await ApiConfig.api.get('/api/polls/active', {
        headers: { 'Cache-Control': 'no-cache' }
      });
      const updatedPolls = response.data.polls || [];
      setActivePolls(updatedPolls);
      
      // Update the selected poll if it's currently open
      const updatedPoll = updatedPolls.find(p => p.id === pollId);
      if (updatedPoll) {
        setSelectedPoll(updatedPoll);
      }

      showNotification('success', 'Vaš odgovor je zabilježen');
    } catch (error) {
      console.error('Error submitting vote:', error);
      showNotification('error', error.response?.data?.message || 'Greška pri glasanju');
    }
  };

  const addPollOption = () => {
    setPollOptions([...pollOptions, '']);
  };

  const updatePollOption = (index, value) => {
    const newOptions = [...pollOptions];
    newOptions[index] = value;
    setPollOptions(newOptions);
  };

  const removePollOption = (index) => {
    if (pollOptions.length > 2) {
      const newOptions = pollOptions.filter((_, i) => i !== index);
      setPollOptions(newOptions);
    }
  };

  const calculatePercentage = (responses, option) => {
    if (!responses || responses.length === 0) return 0;
    const count = responses.filter(r => r.response === option).length;
    return Math.round((count / responses.length) * 100);
  };

  const handleDeletePoll = async (pollId) => {
    if (!window.confirm('Jeste li sigurni da želite obrisati ovu anketu?')) {
      return;
    }

    try {
      await ApiConfig.api.delete(`/api/polls/${pollId}`);
      showNotification('success', 'Anketa uspješno obrisana');
      const response = await ApiConfig.api.get('/api/polls/active');
      setActivePolls(response.data.polls || []);
    } catch (error) {
      console.error('Error deleting poll:', error);
      showNotification('error', error.response?.data?.message || 'Greška pri brisanju ankete');
    }
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

  const getMinutesText = (minutes) => {
    if (minutes === 1) return 'minutu';
    if (minutes >= 2 && minutes <= 4) return 'minute';
    return 'minuta';
  };

  if (loading) return <LoadingShell />;

  return (
    <>
      <Navigacija user={user} otvoreno={otvoreno} unreadChatsCount={unreadChatsCount} />
      <NavTop user={user} naslov={'Naslovna'} />

      <div className="main">
        <div className="karticaZadatka posts">
          <div className="notification-filters">
            <button
              className={`filter-btn ${activeTab === 'search' ? 'active' : ''}`}
              onClick={() => setActiveTab('search')}
            >
              <Icon icon="solar:card-search-broken" />
              Pretraži
            </button>
            <button
              className={`filter-btn ${activeTab === 'posts' ? 'active' : ''}`}
              onClick={() => setActiveTab('posts')}
            >
              <Icon icon="solar:document-text-broken" />
              Objave
            </button>
            {user?.isMentor && (
              <button
                className={`filter-btn ${activeTab === 'my-posts' ? 'active' : ''}`}
                onClick={() => setActiveTab('my-posts')}
              >
                <Icon icon="solar:clapperboard-edit-broken" />
                Moje objave
              </button>
            )}
            <button
              className={`filter-btn ${activeTab === 'polls' ? 'active' : ''}`}
              onClick={() => setActiveTab('polls')}
            >
              <Icon icon="solar:chart-2-broken" />
              Ankete {activePolls.length > 0 && <span className="poll-count">{activePolls.length}</span>}
            </button>
            <button className={`filter-btn`}>
              <a href="https://musicartincubator.com" target="_blank" rel="noopener noreferrer">
                Posjeti musicartincubator.com
              </a>
            </button>
          </div>

          {user?.isMentor && activeTab === 'polls' && (
            <button
              className="floating-action-btn"
              onClick={() => setShowPollForm(true)}
            >
              <Icon icon="solar:add-circle-broken" />
            </button>
          )}

          {user?.isMentor && activeTab !== 'polls' && (
            <button
              className="floating-action-btn"
              onClick={handleCreatePost}
            >
              <Icon icon="solar:add-circle-broken" />
            </button>
          )}
        </div>

        {loading ? (
          <div className="popup">
            <LoadingShell />
          </div>
        ) : (
          <>
            {activeTab === 'polls' ? (
              <div className="karticaZadatka polls posts">
                {!user.isMentor && !user.pohadjaTeoriju ? (
                  <div className="no-access-message">
                    <Icon icon="solar:lock-broken" style={{ fontSize: '2rem', marginBottom: '1rem' }} />
                    <p>Samo učenici koji pohađaju teorijsku nastavu mogu vidjeti ankete.</p>
                  </div>
                ) : activePolls.length > 0 ? (
                  activePolls.map(poll => (
                    <div key={poll.id} className="poll-card">
                      <div className="poll-header">
                        <h3>{poll.question}</h3>
                        {isExpired(poll.endDate) && (
                          <span className="expired-badge">Isteklo</span>
                        )}
                        {user.isMentor && poll.creatorId === user.id && (
                          <button 
                            className="action-btn abDelete"
                            onClick={() => handleDeletePoll(poll.id)}
                            aria-label="Delete poll"
                          >
                            <Icon icon="solar:trash-bin-trash-broken" />
                          </button>
                        )}
                      </div>
                      <div className="poll-meta">
                        <span>Završava: {moment(poll.endDate).format('DD.MM.YYYY. HH:mm')}</span>
                        <span>{poll.responses?.length || 0} odgovora</span>
                      </div>
                      <div className="poll-options">
                        <button
                          className={`poll-option-btn ${poll.responses?.find(r => r.userId === user.id)?.response === 'da' ? 'selected' : ''}`}
                          onClick={() => handleVote(poll.id, 'da')}
                          disabled={isExpired(poll.endDate) || getRemainingVoteTime(poll.responses, user.id) === 0}
                          style={poll.responses?.length > 0 ? {
                            '--percentage-width': `${calculatePercentage(poll.responses, 'da')}%`
                          } : {}}
                        >
                          <span>Da</span>
                          {poll.responses?.find(r => r.userId === user.id) && (
                            <span className="poll-percentage">
                              {calculatePercentage(poll.responses, 'da')}%
                            </span>
                          )}
                        </button>
                        <button
                          className={`poll-option-btn ${poll.responses?.find(r => r.userId === user.id)?.response === 'ne' ? 'selected' : ''}`}
                          onClick={() => handleVote(poll.id, 'ne')}
                          disabled={isExpired(poll.endDate) || getRemainingVoteTime(poll.responses, user.id) === 0}
                          style={poll.responses?.length > 0 ? {
                            '--percentage-width': `${calculatePercentage(poll.responses, 'ne')}%`
                          } : {}}
                        >
                          <span>Ne</span>
                          {poll.responses?.find(r => r.userId === user.id) && (
                            <span className="poll-percentage">
                              {calculatePercentage(poll.responses, 'ne')}%
                            </span>
                          )}
                        </button>
                      </div>
                      {poll.responses?.find(r => r.userId === user.id) && getRemainingVoteTime(poll.responses, user.id) > 0 && (
                        <div className="poll-vote-timer">
                          Možete promijeniti svoj glas još {getRemainingVoteTime(poll.responses, user.id)} {getMinutesText(getRemainingVoteTime(poll.responses, user.id))}
                        </div>
                      )}
                      {user.isMentor && (
                        <button 
                          className="poll-stats-btn"
                          onClick={() => setSelectedPoll(poll)}
                          aria-label="View poll statistics"
                        >
                          <span className="iconify" data-icon="mdi:chart-box"></span>
                          Statistika odgovora
                        </button>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="no-polls">Trenutno nema aktivnih anketa.</p>
                )}
              </div>
            ) : activeTab === 'search' ? (
              <div className="karticaZadatka">
                <input
                  className="input-login-signup "
                  type="text"
                  placeholder="Pretraži korisnike..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                />
                {searchResults && searchResults.length > 0 && (
                  searchResults.map((result) => (
                    <div key={result.id} className="search-result-item">
                      <div>
                        <div>
                          <p>{result.ime} {result.prezime}</p>
                          <p className='txt-min2'>{result.email}</p>
                        </div>
                        <p className='txt-min'>{result.school?.name} | {result.uloga}</p>
                      </div>
                      <div>
                        <button
                          className="action-btn"
                          onClick={() => {
                            setSelectedUserId(result.id);
                            setShowUserProfile(true);
                          }}
                          style={{ padding: '0.3rem 0.8rem' }}
                        >
                          <Icon icon="solar:user-id-broken" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : (
              <div className="karticaZadatka posts">
                {Array.isArray(posts) && posts.length > 0 ? (
                  posts
                    .filter(post => activeTab === 'my-posts' ? post.author.id === user.id : true)
                    .map((post) => (
                    <div key={post.id} className="post-card">
                      <div className="post-header">
                        <h3>{post.title}</h3>
                        {user?.id === post.author.id && (
                          <div className="post-actions">
                            <button
                              className="action-btn abEdit"
                              onClick={() => handleEditPost(post)}
                            >
                              <Icon icon="solar:pen-broken" />
                            </button>
                            <button
                              className="action-btn abDelete"
                              onClick={() => handleDeletePost(post.id)}
                            >
                              <Icon icon="solar:trash-bin-trash-broken" />
                            </button>
                            <button
                            className="action-btn abExpand"
                            onClick={() => handleOpenPost(post)}
                            title="Prikaži detalje"
                          >
                            <Icon icon="solar:eye-broken" />
                          </button>
                          </div>
                        )}
                      </div>
                      <div
                        className={`post-content ${expandedPosts.has(post.id) ? 'expanded' : ''}`}
                        dangerouslySetInnerHTML={{ __html: post.content }}
                      />
                      <button
                        className="show-more-btn"
                        onClick={() => togglePostExpansion(post.id)}
                      >
                        {expandedPosts.has(post.id) ? 'Prikaži manje' : 'Prikaži više'}
                      </button>
                      <div className="post-footer">
                        <span>
                          {formatDate(post.createdAt)}
                        </span>
                        <span>{post.author.ime} {post.author.prezime}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="no-posts">
                    {activeTab === 'my-posts'
                      ? 'Nemate objavljenih objava.'
                      : 'Nema objava za prikaz.'}
                  </p>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {showPostEditor && (
        <PostEditor
          onClose={() => setShowPostEditor(false)}
          onSave={handlePostSaved}
        />
      )}

      {showPostEditorOpened && currentPost && (
        <PostEditorOpened
          post={currentPost}
          onClose={() => {
            setShowPostEditorOpened(false);
            setCurrentPost(null);
          }}
          onSave={handlePostSaved}
        />
      )}

      {showPostDetails && detailedPost && (
        <div className="popup">
          <div
            style={{
              background: 'var(--iznad)',
              width: 'min(900px, 95vw)',
              maxHeight: '85vh',
              borderRadius: '12px',
              boxShadow: '0 12px 40px rgba(0,0,0,0.35)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '1rem 1.25rem',
                borderBottom: '1px solid rgba(255,255,255,0.08)',
                background: 'var(--pozadina)'
              }}
            >
              <h2 style={{ margin: 0, fontSize: '1.25rem' }}>{detailedPost.title}</h2>
            </div>

            <div
              style={{
                display: 'flex',
                gap: '1rem',
                padding: '.75rem 1.25rem',
                fontSize: '.85rem',
                color: 'rgb(var(--isticanje))'
              }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '.4rem' }}>
                <Icon icon="solar:user-id-broken" />
                {detailedPost.author?.ime} {detailedPost.author?.prezime}
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '.4rem' }}>
                <Icon icon="solar:calendar-broken" />
                {formatDate(detailedPost.createdAt)}
              </span>
            </div>

            <div style={{ padding: '1rem 1.25rem', overflow: 'auto' }}>
              <div
                className="post-content expanded"
                dangerouslySetInnerHTML={{ __html: detailedPost.content }}
              />
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '.5rem',
                padding: '.75rem 1.25rem',
                borderTop: '1px solid rgba(255,255,255,0.08)'
              }}
            >
              <button className="gumb action-btn zatvoriBtn" onClick={handleClosePostDetails}>
                Zatvori
              </button>
            </div>
          </div>
        </div>
      )}

      {showUserProfile && selectedUserId && (
        <UserProfile
          userId={selectedUserId}
          loggedInUser={user}
          onClose={() => {
            setShowUserProfile(false);
            setSelectedUserId(null);
          }}
        />
      )}

      {showPollForm && (
        <div className="popup">
          <div className="div div-clmn">
            <h2>Nova anketa</h2>
            <div className="poll-form">
              <input
                type="text"
                className="input-login-signup"
                placeholder="Pitanje ankete"
                value={pollQuestion}
                onChange={(e) => setPollQuestion(e.target.value)}
              />

              <div className="poll-options">
                {pollOptions.map((option, index) => (
                  <div key={index} className="poll-option">
                    <input
                      type="text"
                      className="input-login-signup"
                      placeholder={`Opcija ${index + 1}`}
                      value={option}
                      onChange={(e) => updatePollOption(index, e.target.value)}
                    />
                    {pollOptions.length > 2 && (
                      <button
                        className="remove-option"
                        onClick={() => removePollOption(index)}
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
                <button
                  className="gumb action-btn spremiBtn"
                  onClick={addPollOption}
                >
                  + Dodaj opciju
                </button>
              </div>

              <input
                type="datetime-local"
                className="input-login-signup"
                value={pollEndDate}
                onChange={(e) => setPollEndDate(e.target.value)}
                min={moment().format('YYYY-MM-DDTHH:mm')}
              />

              <div className="div-radio">
                <button
                  className="gumb action-btn zatvoriBtn"
                  onClick={() => setShowPollForm(false)}
                >
                  Odustani
                </button>
                <button
                  className="gumb action-btn spremiBtn"
                  onClick={handleCreatePoll}
                >
                  Kreiraj anketu
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedPoll && user.isMentor && (
        <div className="popup">
          <div className="div div-clmn">
            <h2>{selectedPoll.question}</h2>
            <div className="div">
              <div className="poll-stats-summary">
                <span>Ukupno odgovora: {selectedPoll.responses?.length || 0}</span>
                <span>Da: {calculatePercentage(selectedPoll.responses, 'da')}%</span>
                <span>Ne: {calculatePercentage(selectedPoll.responses, 'ne')}%</span>
              </div>
            </div>
            <div className="div">
              {selectedPoll.responses?.map((response, index) => (
                <div key={index} className="search-result-item">
                  <div>
                    <div>
                      <p>{response.ime} {response.prezime}</p>
                      <p className='txt-min2'>{moment(response.timestamp).format('DD.MM.YYYY. HH:mm')}</p>
                    </div>
                    <p className={`txt-min ${response.response === 'da' ? 'text-success' : 'text-danger'}`}>
                      {response.response === 'da' ? 'Pozitivan' : 'Negativan'} odgovor
                    </p>
                  </div>
                  <div className={`poll-response-badge ${response.response === 'da' ? 'success' : 'danger'}`}>
                    {response.response.toUpperCase()}
                  </div>
                </div>
              ))}
            </div>
            <div className="div-radio">
              <button className="gumb action-btn zatvoriBtn" onClick={() => setSelectedPoll(null)}>
                Zatvori
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Naslovna;