const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const { sequelize, InvoiceSettings } = require('./models');
const { defaultLimiter } = require('./middleware/rateLimiter');
console.log('Available models:', Object.keys(sequelize.models));

const router = require('./routes/user-routes.js');
const groupRouter = require('./routes/group-routes.js');
const invoiceSettingsRoutes = require('./routes/invoiceSettings-routes');
const notificationRouter = require('./routes/notification-routes');
const supportRouter = require('./routes/support-routes');
const scheduleRouter = require('./routes/schedule-routes');
const pollRouter = require('./routes/poll-routes');
const pendingUsersRouter = require('./routes/pendingUsers');
const path = require('path');
const scheduleNotificationCleanup = require('./cron/notification-cleanup');
const websiteRouter = require('./routes/website-routes');

const cookieParser = require('cookie-parser');

const cors = require('cors');

const ServerConfig = require('./serverConfig');

const { addConnectedUser, removeConnectedUser } = require('./controllers/chat-controller');

const errorRoutes = require('./routes/error-routes');

const { schedulePracticeReminders, scheduleClassReminders } = require('./utils/scheduler');

const chatRoutes = require('./routes/chat-routes');

const setupSocket = require('./socket');

const analyticsRouter = require('./routes/analytics');

const routes = require('./routes');
const enrollmentRoutes = require('./routes/enrollment-routes');

require('dotenv').config();

const allowedOrigins = process.env.NODE_ENV === 'production'
  ? ['https://musicartincubator-cadenza.onrender.com', 'https://cadenza.com.hr']
  : ['http://localhost:5173'];

const app = express();
const compression = require('compression');

app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? 'https://cadenza.com.hr'
    : 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control', 'Pragma', 'Expires']
}));

app.use(cookieParser());

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(compression());

app.set('trust proxy', 1); // trust first proxy

app.use((req, res, next) => {
  console.log('Request:', {
    method: req.method,
    path: req.path,
    url: req.url,
    originalUrl: req.originalUrl,
    headers: {
      authorization: req.headers.authorization ? 'present' : 'missing',
      origin: req.headers.origin
    }
  });
  next();
});

// Apply rate limiter to all API routes
app.use('/api', defaultLimiter);

// Group routes first
app.use('/api/groups', groupRouter);

// Then other routes
app.use('/api', router);

// Split pendingUsers routes
app.use('/api/signup/pending', pendingUsersRouter); // For signup and email check
app.use('/api', pendingUsersRouter); // For public routes (schools, programs)

app.use('/api/notifications', notificationRouter);
app.use('/api', invoiceSettingsRoutes);
app.use('/api/support', supportRouter);
app.use('/api/schedule', scheduleRouter);
app.use('/api/polls', pollRouter);
app.use('/api', analyticsRouter);
app.use('/api/enrollment', enrollmentRoutes);

// Website routes for school websites
app.use('/api/website', websiteRouter);

// Mount all routes under /api
app.use('/api', routes);

// Keep error routes separate and unprotected
app.use('/api', errorRoutes);

// Serve static files from the React/Vite app
app.use(express.static(path.join(__dirname, '../client/dist')));

// Add this middleware to serve static files from the client/public directory
app.use(express.static(path.join(__dirname, '../client/public')));

// Add this middleware to serve static files from the server's public directory
app.use(express.static(path.join(__dirname, 'public')));

// Add a specific route for logo files with CORS headers
app.get('/logo512.png', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.sendFile(path.join(__dirname, 'public/logo512.png'));
});

app.get('/logo192.png', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.sendFile(path.join(__dirname, 'public/logo192.png'));
});

app.get('/logo225.png', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.sendFile(path.join(__dirname, 'public/logo225.png'));
});

// Handle React routing, return all requests to React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

// Add this before Socket.IO setup
app.get('/socket.io/health', (req, res) => {
  res.sendStatus(200);
});

const PORT = process.env.PORT || 5000;

// Database connection
const connectDB = async () => {
  let retries = 5;
  while (retries) {
    try {
      await sequelize.authenticate();
      console.log('Database connected successfully');
      return;
    } catch (error) {
      console.error('Unable to connect to the database:', error);
      retries -= 1;
      if (retries === 0) {
        console.error('Max retries reached. Exiting...');
        process.exit(1);
      }
      console.log(`Retrying connection... ${retries} attempts remaining`);
      // Wait for 5 seconds before retrying
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
};

// Initialize database connection
connectDB();

// Create an HTTP server
const server = http.createServer(app);

// Set up Socket.IO with our server
const io = setupSocket(server);

// Make io available to routes
app.set('io', io);

// Start the server
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Add scheduler after all your routes but before error handlers
schedulePracticeReminders();
scheduleClassReminders();
scheduleNotificationCleanup();


