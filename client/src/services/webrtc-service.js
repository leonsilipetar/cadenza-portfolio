// WebRTC configuration optimized for music education
const rtcConfig = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
    // Add a free TURN server for better NAT traversal
    {
      urls: 'turn:openrelay.metered.ca:80',
      username: 'openrelayproject',
      credential: 'openrelayproject'
    },
    {
      urls: 'turn:openrelay.metered.ca:443',
      username: 'openrelayproject',
      credential: 'openrelayproject'
    },
  ],
  // Optimize for audio quality
  sdpSemantics: 'unified-plan',
  // Enable DSCP for QoS
  enableDscp: true,
  // Set ICE transport policy to all for better connectivity
  iceTransportPolicy: 'all',
  // Add ICE candidate pool size for faster connections
  iceCandidatePoolSize: 10
};

// Audio constraints optimized for music - but more compatible with browsers
const audioConstraints = {
  echoCancellation: false, // Disable echo cancellation for better music quality
  noiseSuppression: false, // Disable noise suppression
  autoGainControl: false,  // Disable automatic gain control
  // Remove the more advanced constraints that might not be supported
  channelCount: 2,        // Stereo audio
  // Use more reasonable defaults
  sampleRate: 44100      // Standard CD quality
  // Remove sampleSize and latency which are not well-supported
};

class WebRTCService {
  constructor(socket) {
    this.socket = socket;
    this.peerConnection = null;
    this.localStream = null;
    this.remoteStream = null;
    this.isInitiator = false;
    this.metronome = null;
    this.midiEnabled = false;
    this.onCallStarted = null;
    this.onCallEnded = null;
    this.onError = null;
    this.pendingCandidates = [];
  }

  // Initialize WebRTC with optimized settings
  async initialize(onCallStarted, onCallEnded, onError) {
    console.log('Initializing WebRTC service...');
    this.onCallStarted = onCallStarted;
    this.onCallEnded = onCallEnded;
    this.onError = onError;

    // Set up socket listeners for signaling
    this.socket.on('webrtc_offer', async (data) => {
      console.log('Received WebRTC offer:', data);
      try {
        await this.initializeMediaStream();
        if (!this.peerConnection) {
          await this.createPeerConnection();
        }
        this.remoteUserId = data.senderId;
        await this.handleOffer(data);
      } catch (error) {
        console.error('Error handling offer:', error);
        if (this.onError) {
          this.onError(error);
        }
      }
    });

    this.socket.on('webrtc_answer', async (data) => {
      console.log('Received WebRTC answer:', data);
      await this.handleAnswer(data);
    });

    this.socket.on('webrtc_ice_candidate', async (data) => {
      console.log('Received ICE candidate:', data);
      await this.handleNewICECandidate(data);
    });

    this.socket.on('webrtc_call_ended', () => {
      console.log('Received call end signal');
      this.endCall();
    });

    // Initialize media stream early
    try {
      await this.initializeMediaStream();
      console.log('Media stream initialized successfully');
    } catch (error) {
      console.error('Failed to initialize media stream:', error);
      if (this.onError) {
        this.onError(error);
      }
    }
  }

  // Initialize media stream
  async initializeMediaStream() {
    try {
      console.log('Initializing media stream with constraints:', JSON.stringify(audioConstraints));
      
      // Check if there's already a stream with tracks that are active
      if (this.localStream && this.localStream.getTracks().some(track => track.readyState === 'live')) {
        console.log('Using existing local stream with active tracks');
        return this.localStream;
      }
      
      // Stop any existing tracks if they exist
      if (this.localStream) {
        console.log('Stopping existing media tracks before requesting new ones');
        this.localStream.getTracks().forEach(track => {
          track.stop();
        });
      }
      
      // Get local stream with optimized audio settings
      console.log('Requesting new user media with audio and video');
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: audioConstraints,
        video: true
      });
      
      // Log the tracks we received
      console.log('Media stream initialized with tracks:', 
        this.localStream.getTracks().map(t => `${t.kind}:${t.readyState}`).join(', '));
      
      return this.localStream;
    } catch (error) {
      console.error('Error getting user media:', error);
      
      // Try fallback constraints if the optimized ones fail
      if (error.name === 'OverconstrainedError' || error.name === 'NotReadableError') {
        console.log('Trying fallback constraints for audio');
        try {
          this.localStream = await navigator.mediaDevices.getUserMedia({
            audio: true, // Use default constraints
            video: true
          });
          console.log('Media stream initialized with fallback constraints');
          return this.localStream;
        } catch (fallbackError) {
          console.error('Fallback media request also failed:', fallbackError);
          if (this.onError) {
            this.onError(new Error('Failed to access camera and microphone even with fallback settings.'));
          }
          throw fallbackError;
        }
      }
      
      if (this.onError) {
        this.onError(new Error('Failed to access camera and microphone. Please ensure they are connected and permissions are granted.'));
      }
      throw error;
    }
  }

  // Create peer connection with optimized settings
  async createPeerConnection() {
    try {
      console.log('Creating peer connection...');
      // Ensure we have a media stream before creating the peer connection
      if (!this.localStream) {
        await this.initializeMediaStream();
      }

      this.peerConnection = new RTCPeerConnection(rtcConfig);

      // Set up data channel for initiator
      if (this.isInitiator) {
        console.log('Creating data channel as initiator');
        this.dataChannel = this.peerConnection.createDataChannel('musicDataChannel', {
          ordered: false,
          maxRetransmits: 0 // Low latency for MIDI and metronome
        });
        this.setupDataChannel(this.dataChannel);
      } else {
        // For the receiver, wait for the data channel
        this.peerConnection.ondatachannel = (event) => {
          console.log('Received data channel from remote peer');
          this.dataChannel = event.channel;
          this.setupDataChannel(this.dataChannel);
        };
      }

      // Handle ICE candidates
      this.peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          console.log('Generated local ICE candidate:', event.candidate.candidate?.substring(0, 50) + '...');
          this.socket.emit('webrtc_ice_candidate', {
            candidate: event.candidate,
            recipientId: this.remoteUserId,
            senderId: this.socket.auth?.userId || this.socket.id
          });
        } else {
          console.log('ICE candidate gathering complete');
        }
      };

      // Track ICE gathering state more explicitly
      this.peerConnection.onicegatheringstatechange = () => {
        console.log('ICE gathering state changed to:', this.peerConnection.iceGatheringState);
      };

      // Track ICE connection state
      this.peerConnection.oniceconnectionstatechange = () => {
        console.log('ICE connection state changed to:', this.peerConnection.iceConnectionState);
        if (this.peerConnection.iceConnectionState === 'failed' || 
            this.peerConnection.iceConnectionState === 'disconnected') {
          console.warn('ICE connection failed or disconnected, attempting restart...');
          // Only restart if we're the initiator to avoid collisions
          if (this.isInitiator && this.peerConnection.restartIce) {
            this.peerConnection.restartIce();
          }
        }
      };

      // Handle connection state changes with more detail
      this.peerConnection.onconnectionstatechange = () => {
        console.log('Connection state changed to:', this.peerConnection.connectionState);
        if (this.peerConnection.connectionState === 'connected') {
          console.log('Peers connected! Media should start flowing.');
          this.startLatencyMeasurement();
        } else if (this.peerConnection.connectionState === 'failed') {
          console.error('Connection failed - check network and TURN server');
          if (this.onError) {
            this.onError(new Error('Connection failed. Please check your network connection.'));
          }
        } else if (this.peerConnection.connectionState === 'closed') {
          console.log('Connection closed');
          if (this.onCallEnded) {
            this.onCallEnded();
          }
        }
      };

      // Handle remote stream with more detail
      this.peerConnection.ontrack = (event) => {
        console.log('Received remote track:', event.track.kind);
        this.remoteStream = event.streams[0];
        console.log('Remote stream tracks:', 
          this.remoteStream.getTracks().map(t => `${t.kind}:${t.enabled}`).join(', '));
        if (this.onCallStarted) {
          this.onCallStarted(this.remoteStream);
        }
      };

      // Add local stream tracks to peer connection
      this.localStream.getTracks().forEach(track => {
        console.log('Adding local track to peer connection:', track.kind);
        this.peerConnection.addTrack(track, this.localStream);
      });

      // Apply any pending ICE candidates that were received before the connection was ready
      if (this.pendingCandidates && this.pendingCandidates.length > 0) {
        console.log(`Applying ${this.pendingCandidates.length} pending ICE candidates`);
        for (const candidate of this.pendingCandidates) {
          try {
            await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (error) {
            console.error('Error applying pending ICE candidate:', error);
          }
        }
        this.pendingCandidates = [];
      }

      console.log('Peer connection created successfully');
    } catch (error) {
      console.error('Error creating peer connection:', error);
      if (this.onError) {
        this.onError(error);
      }
      throw error;
    }
  }

  // Start a call
  async startCall(recipientId) {
    try {
      console.log('Starting call to recipient:', recipientId);
      this.remoteUserId = recipientId;
      this.isInitiator = true;

      // Initialize media stream first
      await this.initializeMediaStream();
      await this.createPeerConnection();

      // Create and send offer
      console.log('Creating offer...');
      const offer = await this.peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
        iceRestart: true // Enable ICE restart for better connectivity
      });
      
      console.log('Setting local description...');
      await this.peerConnection.setLocalDescription(offer);

      console.log('Sending offer to recipient:', recipientId);
      this.socket.emit('webrtc_offer', {
        offer: offer,
        recipientId: recipientId,
        senderId: this.socket.auth?.userId || this.socket.id // Ensure sender ID is included even if auth is not available
      });

    } catch (error) {
      console.error('Error starting call:', error);
      if (this.onError) {
        this.onError(error);
      }
    }
  }

  // Handle incoming offer
  async handleOffer(data) {
    try {
      console.log('Handling offer from sender:', data.senderId);
      this.remoteUserId = data.senderId; // Ensure remoteUserId is set
      
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
      
      console.log('Creating answer...');
      const answer = await this.peerConnection.createAnswer();
      
      console.log('Setting local description...');
      await this.peerConnection.setLocalDescription(answer);

      console.log('Sending answer to:', data.senderId);
      this.socket.emit('webrtc_answer', {
        answer: answer,
        recipientId: data.senderId,
        senderId: this.socket.auth?.userId || this.socket.id
      });

    } catch (error) {
      console.error('Error handling offer:', error);
      if (this.onError) {
        this.onError(error);
      }
    }
  }

  // Handle incoming answer
  async handleAnswer(data) {
    try {
      console.log('Processing answer from:', data.senderId);
      
      if (!this.peerConnection) {
        console.error('No peer connection available to handle answer');
        return;
      }
      
      console.log('Setting remote description from answer');
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
      console.log('Remote description set successfully');
    } catch (error) {
      console.error('Error handling answer:', error);
      if (this.onError) {
        this.onError(error);
      }
    }
  }

  // Handle new ICE candidate
  async handleNewICECandidate(data) {
    try {
      if (!data || !data.candidate) {
        console.log('Received empty ICE candidate, ignoring');
        return;
      }
      
      // If peer connection doesn't exist yet, buffer the candidates
      if (!this.peerConnection) {
        console.log('Peer connection not ready, buffering ICE candidate');
        if (!this.pendingCandidates) {
          this.pendingCandidates = [];
        }
        this.pendingCandidates.push(data.candidate);
        return;
      }

      console.log('Adding received ICE candidate:', data.candidate.candidate?.substring(0, 50) + '...');
      await this.peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
      console.log('Successfully added ICE candidate');
    } catch (error) {
      console.error('Error handling ICE candidate:', error);
      if (this.onError) {
        this.onError(error);
      }
    }
  }

  // Start metronome sync
  startMetronome(bpm) {
    if (!this.metronome) {
      this.metronome = new AudioContext();
      // Implementation of metronome sync
      // This would include precise timing using Web Audio API
      // and sending sync signals through data channel
    }
  }

  // Enable MIDI support
  async enableMIDI() {
    if (navigator.requestMIDIAccess) {
      try {
        const midiAccess = await navigator.requestMIDIAccess();
        this.midiEnabled = true;
        // Set up MIDI input/output handling
        midiAccess.inputs.forEach(input => {
          input.onmidimessage = this.handleMIDIMessage.bind(this);
        });
      } catch (error) {
        console.error('MIDI access denied:', error);
      }
    }
  }

  // Handle MIDI messages
  handleMIDIMessage(message) {
    // Send MIDI messages through data channel
    if (this.dataChannel && this.dataChannel.readyState === 'open') {
      this.dataChannel.send(JSON.stringify({
        type: 'midi',
        data: Array.from(message.data)
      }));
    }
  }

  // Measure and adjust latency
  startLatencyMeasurement() {
    setInterval(() => {
      const start = performance.now();
      this.dataChannel.send(JSON.stringify({
        type: 'ping',
        timestamp: start
      }));
    }, 1000);
  }

  // End call
  endCall() {
    console.log('Ending WebRTC call...');
    
    // Notify remote peer
    if (this.remoteUserId) {
      this.socket.emit('webrtc_call_ended', {
        recipientId: this.remoteUserId
      });
    }
    
    // Stop local tracks
    if (this.localStream) {
      console.log('Stopping local media tracks...');
      this.localStream.getTracks().forEach(track => {
        track.stop();
        console.log('Stopped track:', track.kind);
      });
    }
    
    // Close data channel
    if (this.dataChannel) {
      console.log('Closing data channel...');
      this.dataChannel.close();
      this.dataChannel = null;
    }
    
    // Close peer connection
    if (this.peerConnection) {
      console.log('Closing peer connection...');
      this.peerConnection.close();
    }
    
    // Reset state
    this.peerConnection = null;
    this.localStream = null;
    this.remoteStream = null;
    
    // Close audio context if needed
    if (this.metronome) {
      console.log('Closing metronome...');
      this.metronome.close();
      this.metronome = null;
    }
    
    // Notify application
    if (this.onCallEnded) {
      console.log('Notifying application of call end...');
      this.onCallEnded();
    }
  }

  // Add method to set up data channel
  setupDataChannel(dataChannel) {
    dataChannel.onopen = () => {
      console.log('Data channel opened');
    };

    dataChannel.onclose = () => {
      console.log('Data channel closed');
    };

    dataChannel.onerror = (error) => {
      console.error('Data channel error:', error);
    };

    dataChannel.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === 'ping') {
          // Send back a pong for latency measurement
          dataChannel.send(JSON.stringify({
            type: 'pong',
            original: message.timestamp
          }));
        } else if (message.type === 'pong') {
          // Calculate latency
          const latency = performance.now() - message.original;
          console.log('Measured latency:', latency, 'ms');
        } else if (message.type === 'midi') {
          // Handle MIDI message
          console.log('Received MIDI message:', message.data);
        }
      } catch (error) {
        console.error('Error processing data channel message:', error);
      }
    };
  }
}

export default WebRTCService;