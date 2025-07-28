import express from 'express';
import { validationResult } from 'express-validator';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import morgan from 'morgan';
import http from 'http';
import { Server } from 'socket.io';
import fileUpload from 'express-fileupload';

import notificationRouter from './src/routes/notificationRoutes.js';
import authRouter from './src/routes/authRoutes.js';
import transactionRouter from './src/routes/transactionRoutes.js';
import budgetRouter from './src/routes/budgetRoutes.js';
import errorHandler from './src/errorHandler.js';
import dashboardRouter from './src/routes/dashboardRoutes.js';
import goalRouter from './src/routes/goalRoutes.js';
import debtRouter from './src/routes/debtRoutes.js';
import accountRouter from './src/routes/accountRoutes.js';
import investmentRouter from './src/routes/investmentRoutes.js';

dotenv.config();

const app = express();
const server = http.createServer(app);

// Trust reverse proxy (Elastic Beanstalk/Load Balancer)
app.set('trust proxy', true);

// CORS config
console.log('Loaded CORS_ORIGIN from .env:', process.env.CORS_ORIGIN);
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',')
  : ['http://localhost:3000', 'https://finance-manager-app-fe.vercel.app'];

const corsOptions = {
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  credentials: true,
  optionsSuccessStatus: 200,
};

app.options('*', cors(corsOptions));
app.use(cors(corsOptions));
app.use(express.json());
app.use(morgan('dev'));
app.use(fileUpload());

// Validation middleware
app.use((req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  next();
});

// Logging incoming requests
app.use((req, res, next) => {
  console.log(`Received ${req.method} to ${req.url} from ${req.headers.origin}`);
  res.set('Cache-Control', 'no-store');
  next();
});

// Health check
app.get('/', (req, res) => res.status(200).send('Health check OK'));

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI, { retryWrites: true, w: 'majority' })
  .then(() => console.log('MongoDB connected successfully'))
  .catch((err) => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// API routes
app.use('/api/auth', authRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/goals', goalRouter);
app.use('/api/transactions', transactionRouter);
app.use('/api/budgets', budgetRouter);
app.use('/api/debts', debtRouter);
app.use('/api/accounts', accountRouter);
app.use('/api/investments', investmentRouter);
app.use('/api/notifications', notificationRouter);
app.use(errorHandler);

// Socket.IO setup
const io = new Server(server, {
  path: '/socket.io',
  cors: {
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  },
  transports: ['websocket', 'polling'],
});

// Fix for polling-based CORS
io.engine.on('headers', (headers, req) => {
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Access-Control-Allow-Credentials'] = 'true';
  }
});

// WebSocket connection logic
io.on('connection', (socket) => {
  console.log(`New WebSocket client connected: ${socket.id}`);

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
  });

  socket.on('error', (error) => {
    console.error('Socket.IO error:', error);
  });
});

// Start server
const PORT = process.env.PORT || 8080;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
