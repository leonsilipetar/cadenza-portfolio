const socketIo = require('socket.io');
const { addConnectedUser, removeConnectedUser } = require('./controllers/chat-controller');

const setupSocket = (server) => {
  const io = socketIo(server, {
    cors: {
      origin: process.env.NODE_ENV === 'production'
        ? ['https://cadenza.com.hr']
        : ['http://localhost:5173'],
      methods: ['GET', 'POST'],
      credentials: true
    },
    pingTimeout: 60000,
    pingInterval: 25000,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000
  });

  io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);
    const userId = socket.handshake.auth.userId;

    if (userId) {
      addConnectedUser(userId, socket.id);
      console.log(`User ${userId} connected with socket ${socket.id}`);
      
      // Join a room specific to this user
      socket.join(`user_${userId}`);
    }

    // Handle new messages
    socket.on('new_message', (message) => {
      console.log('New message received:', message);
      if (message.recipientId) {
        // Emit to recipient's room
        io.to(`user_${message.recipientId}`).emit('newMessage', message);
      }
    });

    // WebRTC signaling
    socket.on('webrtc_offer', (data) => {
      console.log(`WebRTC offer from ${userId} to ${data.recipientId}`, 
        data.offer ? `sdpType:${data.offer.type}` : 'no offer data');
      
      // Ensure we have all necessary data
      if (!data.recipientId || !data.offer) {
        console.error('Invalid WebRTC offer data:', data);
        return;
      }
      
      io.to(`user_${data.recipientId}`).emit('webrtc_offer', {
        offer: data.offer,
        senderId: userId || data.senderId,
        recipientId: data.recipientId
      });
      console.log(`WebRTC offer forwarded to recipient ${data.recipientId}`);
    });

    socket.on('webrtc_answer', (data) => {
      console.log(`WebRTC answer from ${userId} to ${data.recipientId}`, 
        data.answer ? `sdpType:${data.answer.type}` : 'no answer data');
      
      // Ensure we have all necessary data
      if (!data.recipientId || !data.answer) {
        console.error('Invalid WebRTC answer data:', data);
        return;
      }
      
      io.to(`user_${data.recipientId}`).emit('webrtc_answer', {
        answer: data.answer,
        senderId: userId || data.senderId,
        recipientId: data.recipientId
      });
      console.log(`WebRTC answer forwarded to recipient ${data.recipientId}`);
    });

    socket.on('webrtc_ice_candidate', (data) => {
      console.log(`WebRTC ICE candidate from ${userId} to ${data.recipientId}`, 
        data.candidate ? 'has candidate' : 'no candidate data');
      
      // Ensure we have all necessary data
      if (!data.recipientId || !data.candidate) {
        console.error('Invalid WebRTC ICE candidate data:', data);
        return;
      }
      
      io.to(`user_${data.recipientId}`).emit('webrtc_ice_candidate', {
        candidate: data.candidate,
        senderId: userId || data.senderId,
        recipientId: data.recipientId
      });
      console.log(`WebRTC ICE candidate forwarded to recipient ${data.recipientId}`);
    });

    socket.on('webrtc_call_ended', (data) => {
      console.log('Call ended by', userId, 'to', data.recipientId);
      io.to(`user_${data.recipientId}`).emit('webrtc_call_ended', {
        senderId: userId
      });
    });

    // Also handle the legacy event name
    socket.on('webrtc_call_end', (data) => {
      console.log('Call ended (legacy event) by', userId, 'to', data.recipientId);
      io.to(`user_${data.recipientId}`).emit('webrtc_call_ended', {
        senderId: userId
      });
    });

    // Video call signaling
    socket.on('call_request', (data) => {
      console.log('Call request from', userId, 'to', data.recipientId);
      // Emit both the legacy event and the event our client expects
      io.to(`user_${data.recipientId}`).emit('incoming_call', {
        senderId: userId,
        senderName: data.senderName
      });
      
      // Add call_request event for the new implementation
      io.to(`user_${data.recipientId}`).emit('call_request', {
        senderId: userId,
        recipientId: data.recipientId
      });
    });

    socket.on('call_accept', (data) => {
      console.log('Call accepted by', userId, 'for', data.senderId);
      io.to(`user_${data.senderId}`).emit('call_accepted', {
        recipientId: userId,
        senderId: userId
      });
    });

    socket.on('call_accepted', (data) => {
      console.log('Call accepted event from', userId, 'to', data.recipientId);
      io.to(`user_${data.recipientId}`).emit('call_accepted', {
        recipientId: data.recipientId,
        senderId: userId
      });
    });

    socket.on('call_reject', (data) => {
      console.log('Call rejected by', userId, 'for', data.senderId);
      io.to(`user_${data.senderId}`).emit('call_rejected', {
        recipientId: userId,
        senderId: userId
      });
    });

    socket.on('call_rejected', (data) => {
      console.log('Call rejected event from', userId, 'to', data.recipientId);
      io.to(`user_${data.recipientId}`).emit('call_rejected', {
        recipientId: data.recipientId,
        senderId: userId
      });
    });

    socket.on('cancel_call', (data) => {
      console.log('Call cancelled by', userId, 'for', data.recipientId);
      io.to(`user_${data.recipientId}`).emit('call_cancelled', {
        senderId: userId
      });
    });

    socket.on('disconnect', (reason) => {
      if (userId) {
        removeConnectedUser(userId);
        console.log(`User ${userId} disconnected. Reason: ${reason}`);
      }
    });

    // Handle errors
    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
  });

  return io;
};

module.exports = setupSocket;