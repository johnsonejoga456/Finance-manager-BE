import express from 'express';
import { validationResult } from 'express-validator';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import morgan from 'morgan';
import notificationRouter from './src/routes/notificationRoutes.js';
import authRouter from './src/routes/authRoutes.js';
import transactionRouter from './src/routes/transactionRoutes.js';
import budgetRouter from './src/routes/budgetRoutes.js';
import errorHandler from './src/errorHandler.js';
import http from 'http';
import { Server } from 'socket.io';
import dashboardRouter from './src/routes/dashboardRoutes.js';
import goalRouter from './src/routes/goalRoutes.js';
import debtRouter from './src/routes/debtRoutes.js';
import accountRouter from './src/routes/accountRoutes.js';
import investmentRouter from './src/routes/investmentRoutes.js';
import fileUpload from 'express-fileupload';

dotenv.config();

const app = express();
const server = http.createServer(app);

// Configure Socket.IO
const io = new Server(server, {
  path: '/socket.io',
  cors: {
    origin: [
      'http://localhost:3000',
      'https://finance-manager-app-fe.vercel.app'
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
});

// Log CORS config
console.log('CORS allowed origins:', process.env.CORS_ORIGIN || '*');

// Validation middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// CORS Configuration
const corsOptions = {
  origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  credentials: true,
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(morgan('dev'));
app.use(handleValidationErrors);
app.use(fileUpload());

// Log requests
app.use((req, res, next) => {
  console.log(`Received ${req.method} request to ${req.url} from ${req.headers.origin}`);
  next();
});

// Disable caching
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

// Health check endpoint
app.get('/', (req, res) => {
  res.status(200).send('Health check OK');
});

// MongoDB connection
mongoose
  .connect(process.env.MONGODB_URI, { retryWrites: true, w: 'majority' })
  .then(() => console.log('MongoDB connected successfully'))
  .catch((err) => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/goals', goalRouter);
app.use('/api/transactions', transactionRouter);
app.use('/api/budgets', budgetRouter);
app.use('/api/debts', debtRouter);
app.use('/api/accounts', accountRouter);
app.use('/api/investments', investmentRouter);
app.use('/api/notifications', notificationRouter);

// Error handling
app.use(errorHandler);

// Socket.IO
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
  socket.on('error', (error) => {
    console.error('Socket.IO error:', error);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));