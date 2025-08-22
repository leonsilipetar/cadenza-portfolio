import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Icon } from '@iconify/react';
// Add global polyfill
if (typeof global === 'undefined') {
  window.global = window;
}
import Peer from 'simple-peer/simplepeer.min.js';
import styles from './VideoCall.module.css';
import { toast } from 'react-toastify';

// Add this CSS at the start of the file as a style tag
const callMessageStyles = `
.call-message {
  background-color: #f0f7ff;
  border: 1px solid #cce5ff;
  border-radius: 8px;
  padding: 10px;
  transition: all 0.2s ease;
}

.call-message:hover {
  background-color: #e0f0ff;
  transform: scale(1.02);
}

.call-action-hint {
  color: #0066cc;
  font-weight: bold;
  margin-top: 5px;
  font-size: 0.85em;
  text-align: center;
}

.audioOnlyIndicator {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  background-color: #000;
  color: #fff;
  font-weight: bold;
  border-radius: 8px;
}

.audioIcon {
  font-size: 3em;
  margin-bottom: 10px;
  color: #4CAF50;
}

.errorOverlay {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.7);
  color: #fff;
  border-radius: 8px;
  padding: 20px;
  text-align: center;
}

.errorIcon {
  font-size: 3em;
  color: #ff5252;
  margin-bottom: 20px;
}

.errorMessage {
  margin-bottom: 20px;
  font-weight: bold;
}

.loadingSpinner {
  border: 5px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top: 5px solid #fff;
  width: 50px;
  height: 50px;
  animation: spin 1s linear infinite;
  margin-bottom: 20px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
`;

const VideoCall = React.memo(({ socket, user, recipientId, onClose, sendMessageFunction, isReceivingCall = false }) => {
  const [isCallStarted, setIsCallStarted] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [bpm, setBpm] = useState(120);
  const [isMetronomeOn, setIsMetronomeOn] = useState(false);
  const [isMidiEnabled, setIsMidiEnabled] = useState(false);
  const [latency, setLatency] = useState(0);
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState(null);
  const [callState, setCallState] = useState(isReceivingCall ? 'receiving' : 'pre-call'); // 'pre-call', 'receiving', 'calling', 'in-call'
  const [stream, setStream] = useState(null);

  const localVideoRef = useRef();
  const remoteVideoRef = useRef();
  const peerRef = useRef();
  const isComponentMounted = useRef(true);
  const hasStartMessageSent = useRef(false);
  const hasEndMessageSent = useRef(false);
  const isCallActive = useRef(false);

  // Cleanup function
  const cleanupCall = useCallback(() => {
    console.log('Cleaning up call resources...');
    
    if (stream) {
      stream.getTracks().forEach(track => {
        track.stop();
        console.log('Cleaned up media track:', track.kind);
      });
    }

    if (peerRef.current) {
      try {
        peerRef.current.destroy();
      } catch (err) {
        console.error('Error destroying peer:', err);
      }
      peerRef.current = null;
    }

    isCallActive.current = false;
  }, [stream]);

  // Initialize media stream
  const initializeStream = useCallback(async () => {
    try {
      // First try to get both audio and video
      const constraints = {
        video: {
          width: { ideal: 640, max: 1280 },
          height: { ideal: 480, max: 720 },
          frameRate: { ideal: 24, max: 30 }
        },
        audio: {
          // Balanced audio settings for music
          sampleRate: { ideal: 48000, min: 44100 },
          channelCount: { ideal: 2 },
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        }
      };

      try {
        console.log('Requesting audio/video stream...');
        const newStream = await navigator.mediaDevices.getUserMedia(constraints);
        if (localVideoRef.current && isComponentMounted.current) {
          localVideoRef.current.srcObject = newStream;
        }
        setStream(newStream);
        return newStream;
      } catch (err) {
        console.warn('Video request failed:', err.name, err.message);
        // If video fails, try audio only
        const audioOnlyConstraints = {
          video: false,
          audio: {
            sampleRate: { ideal: 48000, min: 44100 },
            channelCount: { ideal: 2, min: 1 },
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false
          }
        };
        
        console.log('Falling back to audio only...');
        const audioOnlyStream = await navigator.mediaDevices.getUserMedia(audioOnlyConstraints);
        
        if (localVideoRef.current && isComponentMounted.current) {
          localVideoRef.current.srcObject = audioOnlyStream;
        }
        setIsVideoOff(true); // Indicate that video is off
        setStream(audioOnlyStream);
        return audioOnlyStream;
      }
    } catch (err) {
      console.error('Error accessing media devices:', err);
      // Use setTimeout to avoid React state update race conditions
      setTimeout(() => {
        try {
          if (err.name === 'NotAllowedError') {
            toast.error('Please allow access to your microphone to start the call');
          } else if (err.name === 'NotFoundError') {
            toast.error('No microphone found. Please connect a microphone and try again.');
          } else {
            toast.error('Could not access audio: ' + (err.message || err.name || 'Unknown error'));
          }
        } catch (toastError) {
          console.error('Error showing toast:', toastError);
        }
      }, 0);
      throw err;
    }
  }, []);

  // Create peer connection with optimized audio settings
  const createPeer = useCallback((targetId, stream, initiator = true) => {
    console.log('Creating peer connection:', { targetId, initiator });
    
    try {
      const peer = new Peer({
        initiator,
        trickle: true, // Enable ICE trickle for faster connections
        stream,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' },
            { urls: 'stun:global.stun.twilio.com:3478' }
          ],
          iceCandidatePoolSize: 10,
          iceTransportPolicy: 'all'
        },
        sdpTransform: (sdp) => {
          try {
            // Split SDP into lines
            const lines = sdp.split('\n');
            
            // Find the audio m-line
            const audioMLineIndex = lines.findIndex(line => line.startsWith('m=audio'));
            if (audioMLineIndex === -1) return sdp;
            
            // Find the Opus payload type
            let opusPayloadType = null;
            for (let i = audioMLineIndex; i < lines.length; i++) {
              if (lines[i].includes('opus/48000')) {
                const match = lines[i].match(/a=rtpmap:(\d+)/);
                if (match && match[1]) {
                  opusPayloadType = match[1];
                  break;
                }
              }
            }
              
            if (!opusPayloadType) return sdp;
            
            // Use more conservative audio settings for better compatibility
            const fmtpLine = `a=fmtp:${opusPayloadType} minptime=10;useinbandfec=1;stereo=1;maxaveragebitrate=96000\r`;
            
            // Find existing fmtp line for Opus
            const existingFmtpIndex = lines.findIndex(line => 
              line.startsWith(`a=fmtp:${opusPayloadType}`));
              
            if (existingFmtpIndex !== -1) {
              // Replace existing fmtp line
              lines[existingFmtpIndex] = fmtpLine;
            } else {
              // Add new fmtp line after the rtpmap line
              const rtpmapIndex = lines.findIndex(line => 
                line.startsWith(`a=rtpmap:${opusPayloadType}`));
              if (rtpmapIndex !== -1) {
                lines.splice(rtpmapIndex + 1, 0, fmtpLine);
              }
            }
            
            return lines.join('\n');
          } catch (error) {
            console.error('Error in SDP transform:', error);
            return sdp; // Return original SDP if there's an error
          }
        }
      });

      // Handle ICE candidates
      peer.on('signal', data => {
        if (!isComponentMounted.current) return;
        console.log('Peer signal generated:', data.type || 'candidate');
        socket.emit('sending signal', {
          userToSignal: targetId,
          callerID: user.id,
          signal: data
        });
      });

      peer.on('connect', () => {
        if (!isComponentMounted.current) return;
        console.log('Peer connection established');
        setIsCallStarted(true);
        setTimeout(() => {
          try {
            toast.success('Call connected successfully');
          } catch (err) {
            console.warn('Error showing toast:', err);
          }
        }, 0);
      });

      peer.on('stream', remoteStream => {
        if (!isComponentMounted.current) return;
        console.log('Received remote stream');
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStream;
        }
      });

      peer.on('error', err => {
        if (!isComponentMounted.current) return;
        console.error('Peer connection error:', err);
        setTimeout(() => {
          try {
            toast.error('Connection error: ' + err.message);
          } catch (toastErr) {
            console.warn('Error showing toast:', toastErr);
          }
        }, 0);
      });

      peer.on('close', () => {
        if (!isComponentMounted.current) return;
        console.log('Peer connection closed');
        cleanupCall();
        onClose();
      });

      return peer;
    } catch (err) {
      console.error('Error creating peer:', err);
      throw err;
    }
  }, [socket, user.id, onClose, cleanupCall]);

  // Add peer when receiving a call
  const addPeer = useCallback((incomingSignal, callerId, stream) => {
    console.log('Adding peer for incoming call:', { callerId });
    
    try {
      const peer = new Peer({
        initiator: false,
        trickle: true, // Enable ICE trickle for faster connections
        stream,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' },
            { urls: 'stun:global.stun.twilio.com:3478' }
          ],
          iceCandidatePoolSize: 10,
          iceTransportPolicy: 'all'
        }
      });

      peer.on('signal', signal => {
        if (!isComponentMounted.current) return;
        console.log('Returning signal to caller:', signal.type || 'candidate');
        socket.emit('returning signal', { signal, callerID: callerId });
      });

      peer.on('connect', () => {
        if (!isComponentMounted.current) return;
        console.log('Peer connection established');
        setIsCallStarted(true);
        setTimeout(() => {
          try {
            toast.success('Call connected successfully');
          } catch (err) {
            console.warn('Error showing toast:', err);
          }
        }, 0);
      });

      peer.on('stream', remoteStream => {
        if (!isComponentMounted.current) return;
        console.log('Received remote stream from caller');
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStream;
        }
      });

      peer.on('error', err => {
        if (!isComponentMounted.current) return;
        console.error('Peer connection error:', err);
        setTimeout(() => {
          try {
            toast.error('Connection error: ' + err.message);
          } catch (toastErr) {
            console.warn('Error showing toast:', toastErr);
          }
        }, 0);
      });

      peer.signal(incomingSignal);
      return peer;
    } catch (err) {
      console.error('Error adding peer:', err);
      throw err;
    }
  }, [socket]);

  // Socket event listeners
  useEffect(() => {
    if (!socket || !user || !recipientId) return;

    const handleUserJoined = ({ signal, callerID }) => {
      console.log('User joined with signal:', { callerID, type: signal.type });
      if (callerID === recipientId && stream) {
        peerRef.current = addPeer(signal, callerID, stream);
      }
    };

    const handleReceivingReturnedSignal = ({ signal, id }) => {
      console.log('Received return signal:', { id, type: signal.type });
      if (id === recipientId && peerRef.current) {
        peerRef.current.signal(signal);
      }
    };

    const handleCallAccepted = async (data) => {
      console.log('Call accepted:', data);
      if (data.recipientId === recipientId || data.senderId === recipientId) {
        setCallState('in-call');
        isCallActive.current = true;
        toast.success('Call connected');
      }
    };

    const handleCallRejected = (data) => {
      if (data.recipientId === recipientId || data.senderId === recipientId) {
        toast.info('Call was rejected');
        cleanupCall();
        onClose();
      }
    };

    const handleCallCancelled = (data) => {
      if (data.senderId === recipientId) {
        toast.info('Call was cancelled');
        cleanupCall();
        onClose();
      }
    };

    const handleCallEnded = (data) => {
      if (data.senderId === recipientId) {
        toast.info('Call ended by other user');
        cleanupCall();
        onClose();
      }
    };

    socket.on('user joined', handleUserJoined);
    socket.on('receiving returned signal', handleReceivingReturnedSignal);
    socket.on('call_accepted', handleCallAccepted);
    socket.on('call_rejected', handleCallRejected);
    socket.on('call_cancelled', handleCallCancelled);
    socket.on('webrtc_call_ended', handleCallEnded);

    // Ping to keep connection alive
    const pingInterval = setInterval(() => {
      if (peerRef.current && isCallActive.current) {
        socket.emit('ping');
      }
    }, 5000);

    return () => {
      socket.off('user joined', handleUserJoined);
      socket.off('receiving returned signal', handleReceivingReturnedSignal);
      socket.off('call_accepted', handleCallAccepted);
      socket.off('call_rejected', handleCallRejected);
      socket.off('call_cancelled', handleCallCancelled);
      socket.off('webrtc_call_ended', handleCallEnded);
      clearInterval(pingInterval);
    };
  }, [socket, user, recipientId, stream, addPeer, cleanupCall, onClose]);

  // Start call function
  const startCall = async () => {
    if (callState !== 'pre-call') return;
    
    try {
      setIsInitializing(true);
      
      // Send chat message first
      if (sendMessageFunction && !hasStartMessageSent.current) {
        try {
          hasStartMessageSent.current = true;
          await sendMessageFunction('📞 Incoming video call... Click to respond.');
        } catch (msgError) {
          console.warn('Error sending call message:', msgError);
          // Continue with call even if message fails
        }
      }
      
      setCallState('calling');
      
      // Initialize stream
      const newStream = await initializeStream();
      
      // Only proceed if component is still mounted
      if (!isComponentMounted.current) return;
      
      // Create peer connection
      peerRef.current = createPeer(recipientId, newStream);
      
      // Send call request
      socket.emit('call_request', {
        recipientId,
        senderId: user.id
      });
      
      // Set call as active while waiting for response
      isCallActive.current = true;
      
    } catch (error) {
      console.error('Error starting call:', error);
      if (isComponentMounted.current) {
        setTimeout(() => {
          try {
            toast.error('Failed to start call: ' + (error.message || 'Unknown error'));
          } catch (toastError) {
            console.error('Error showing toast:', toastError);
          }
        }, 0);
        cleanupCall();
        onClose();
      }
    } finally {
      if (isComponentMounted.current) {
        setIsInitializing(false);
      }
    }
  };

  // Handle call cancellation
  const cancelCall = () => {
    console.log('Cancelling call...');
    socket.emit('cancel_call', { 
      recipientId,
      senderId: user.id 
    });
    
    // Send cancellation message
    if (sendMessageFunction) {
      try {
        sendMessageFunction('📞 Call cancelled');
      } catch (error) {
        console.warn('Error sending cancellation message:', error);
      }
    }
    
    cleanupCall();
    onClose();
  };

  // Accept call function
  const acceptCall = async () => {
    try {
      setIsInitializing(true);
      
      // Initialize stream
      const newStream = await initializeStream();
      
      // Only proceed if component is still mounted
      if (!isComponentMounted.current) return;
      
      // Create peer connection as receiver
      peerRef.current = createPeer(recipientId, newStream, false);
      
      // Send acceptance
      socket.emit('call_accepted', {
        recipientId: recipientId,
        senderId: user.id
      });
      
      setCallState('in-call');
      isCallActive.current = true;
      
    } catch (error) {
      console.error('Error accepting call:', error);
      if (isComponentMounted.current) {
        setTimeout(() => {
          try {
            toast.error('Failed to accept call: ' + (error.message || 'Unknown error'));
          } catch (toastError) {
            console.error('Error showing toast:', toastError);
          }
        }, 0);
        cleanupCall();
        onClose();
      }
    } finally {
      if (isComponentMounted.current) {
        setIsInitializing(false);
      }
    }
  };

  // Reject call function
  const rejectCall = () => {
    socket.emit('call_rejected', {
      recipientId: recipientId,
      senderId: user.id
    });
    cleanupCall();
    onClose();
  };

  // End call function
  const endCall = async () => {
    socket.emit('webrtc_call_ended', {
      recipientId,
      senderId: user.id
    });
    
    if (sendMessageFunction && !hasEndMessageSent.current) {
      hasEndMessageSent.current = true;
      try {
        await sendMessageFunction('📞 Video poziv je završio');
      } catch (error) {
        console.warn('Error sending end call message:', error);
      }
    }
    
    cleanupCall();
    onClose();
  };

  // Media control functions
  const toggleMute = () => {
    if (stream) {
      stream.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (stream) {
      stream.getVideoTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsVideoOff(!isVideoOff);
    }
  };

  const toggleMetronome = () => {
    if (isMetronomeOn) {
      // Stop metronome
      if (peerRef.current?.metronome) {
        peerRef.current.metronome.close();
      }
    } else {
      // Start metronome
      peerRef.current?.startMetronome(bpm);
    }
    setIsMetronomeOn(!isMetronomeOn);
  };

  const handleBpmChange = (e) => {
    const newBpm = parseInt(e.target.value);
    setBpm(newBpm);
    if (isMetronomeOn && peerRef.current?.metronome) {
      peerRef.current.startMetronome(newBpm);
    }
  };

  const toggleMidi = async () => {
    if (!isMidiEnabled) {
      await peerRef.current?.enableMIDI();
      setIsMidiEnabled(true);
    }
  };

  // Update video grid rendering to handle no-video case
  const renderVideoGrid = () => {
    if (!stream) return null;

    return (
      <div className={styles.videoGrid}>
        <div className={styles.videoBox}>
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className={styles.remoteVideo}
          />
          <div className={styles.videoLabel}>
            {isVideoOff ? "Audio Only" : "Sugovornik"}
          </div>
        </div>
        <div className={styles.videoBox}>
          {stream.getVideoTracks().length > 0 ? (
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className={styles.localVideo}
            />
          ) : (
            <div className={styles.audioOnlyIndicator}>
              <Icon icon="mdi:microphone" className={styles.audioIcon} />
              <span>Audio Only</span>
            </div>
          )}
          <div className={styles.videoLabel}>Vi</div>
        </div>
      </div>
    );
  };

  // Pre-call state UI
  if (callState === 'pre-call') {
    return (
      <div className={styles.videoCallContainer}>
        <div className={styles.loadingOverlay}>
          <h2>Započni video poziv</h2>
          <p>Jeste li spremni započeti video poziv?</p>
          <div className={styles.controls}>
            <button
              onClick={startCall}
              className={`${styles.controlButton} ${styles.startCall}`}
            >
              <Icon icon="mdi:phone" />
              <span className={styles.buttonLabel}>Započni poziv</span>
            </button>
            <button
              onClick={onClose}
              className={`${styles.controlButton} ${styles.endCall}`}
            >
              <Icon icon="mdi:close" />
              <span className={styles.buttonLabel}>Odustani</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Receiving call state UI
  if (callState === 'receiving') {
    return (
      <div className={styles.videoCallContainer}>
        <div className={styles.loadingOverlay}>
          <h2>Dolazni poziv</h2>
          <p>Netko vas zove</p>
          <div className={styles.controls}>
            <button
              onClick={acceptCall}
              className={`${styles.controlButton} ${styles.startCall}`}
            >
              <Icon icon="mdi:phone" />
              <span className={styles.buttonLabel}>Prihvati</span>
            </button>
            <button
              onClick={rejectCall}
              className={`${styles.controlButton} ${styles.endCall}`}
            >
              <Icon icon="mdi:phone-hangup" />
              <span className={styles.buttonLabel}>Odbij</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Calling state UI
  if (callState === 'calling') {
    return (
      <div className={styles.videoCallContainer}>
        <div className={styles.loadingOverlay}>
          <div className={styles.loadingSpinner} />
          <p>Pozivanje u tijeku...</p>
          <button
            onClick={cancelCall}
            className={`${styles.controlButton} ${styles.endCall}`}
          >
            <Icon icon="mdi:close" />
            <span className={styles.buttonLabel}>Odustani</span>
          </button>
        </div>
      </div>
    );
  }

  // Show loading state during initialization
  if (isInitializing) {
    return (
      <div className={styles.videoCallContainer}>
        <div className={styles.loadingOverlay}>
          <div className={styles.loadingSpinner} />
          <p>Initializing video call...</p>
          <button
            onClick={() => {
              console.log('Cancelling video call initialization...');
              if (stream) {
                stream.getTracks().forEach(track => {
                  track.stop();
                  console.log('Stopped track:', track.kind);
                });
              }
              if (peerRef.current) {
                peerRef.current.destroy();
              }
              onClose();
            }}
            className={`${styles.controlButton} ${styles.endCall}`}
          >
            <Icon icon="mdi:close" />
            <span className={styles.buttonLabel}>Cancel</span>
          </button>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className={styles.videoCallContainer}>
        <div className={styles.errorOverlay}>
          <Icon icon="mdi:error" className={styles.errorIcon} />
          <p className={styles.errorMessage}>{error}</p>
          <button
            className={`${styles.controlButton} ${styles.endCall}`}
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isComponentMounted.current = false;
      cleanupCall();
    };
  }, [cleanupCall]);

  return (
    <div className={styles.videoCallContainer}>
      {renderVideoGrid()}
      <div className={styles.controls}>
        <div className={styles.mainControls}>
          <button
            onClick={toggleMute}
            className={`${styles.controlButton} ${isMuted ? styles.active : ''}`}
            title={isMuted ? "Uključi mikrofon" : "Isključi mikrofon"}
          >
            <Icon icon={isMuted ? "mdi:microphone-off" : "mdi:microphone"} />
            <span className={styles.buttonLabel}>{isMuted ? "Uključi mikrofon" : "Isključi mikrofon"}</span>
          </button>

          <button
            onClick={endCall}
            className={`${styles.controlButton} ${styles.endCall}`}
            title="Završi poziv"
          >
            <Icon icon="mdi:phone-hangup" />
            <span className={styles.buttonLabel}>Završi poziv</span>
          </button>

          <button
            onClick={toggleVideo}
            className={`${styles.controlButton} ${isVideoOff ? styles.active : ''}`}
            title={isVideoOff ? "Uključi kameru" : "Isključi kameru"}
          >
            <Icon icon={isVideoOff ? "mdi:video-off" : "mdi:video"} />
            <span className={styles.buttonLabel}>{isVideoOff ? "Uključi kameru" : "Isključi kameru"}</span>
          </button>
        </div>

        <div className={styles.musicControls}>
          <div className={styles.metronomeControl}>
            <button
              onClick={toggleMetronome}
              className={`${styles.controlButton} ${isMetronomeOn ? styles.active : ''}`}
              title={isMetronomeOn ? "Zaustavi metronom" : "Pokreni metronom"}
            >
              <Icon icon="mdi:metronome" />
              <span className={styles.buttonLabel}>{isMetronomeOn ? "Zaustavi" : "Pokreni"} metronom</span>
            </button>
            <input
              type="number"
              min="40"
              max="208"
              value={bpm}
              onChange={handleBpmChange}
              className={styles.bpmInput}
              title="Metronom BPM"
            />
            <span className={styles.bpmLabel}>BPM</span>
          </div>

          <button
            onClick={toggleMidi}
            className={`${styles.controlButton} ${isMidiEnabled ? styles.active : ''}`}
            title={isMidiEnabled ? "MIDI uključen" : "Uključi MIDI"}
          >
            <Icon icon="mdi:midi" />
            <span className={styles.buttonLabel}>{isMidiEnabled ? "MIDI uključen" : "Uključi MIDI"}</span>
          </button>
        </div>

        {latency > 0 && (
          <div className={styles.latencyIndicator}>
            Kašnjenje: {Math.round(latency)}ms
          </div>
        )}
      </div>
    </div>
  );
});

export default VideoCall;