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
import fileUpload from 'express-fileupload';
import winston from 'winston';

dotenv.config();

// Setup Winston logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
    new winston.transports.Console()
  ],
});

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    credentials: true,
  },
});

// Middleware for validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    logger.error('Validation errors:', errors.array());
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// CORS Configuration
const corsOptions = {
  origin: 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  credentials: true,
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(morgan('dev', { stream: { write: (msg) => logger.info(msg.trim()) } }));
app.use(handleValidationErrors);
app.use(fileUpload());

// Disable caching
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

// MongoDB connection
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => logger.info('MongoDB connected successfully'))
  .catch((err) => logger.error('MongoDB connection error:', err));

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/goals', goalRouter);
app.use('/api/transactions', transactionRouter);
app.use('/api/budgets', budgetRouter);
app.use('/api/notifications', notificationRouter);

// Error handling middleware
app.use(errorHandler);

// Start Socket.IO for notifications
io.on('connection', (socket) => {
  logger.info('New client connected:', socket.id);
  socket.on('disconnect', () => {
    logger.info('Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => logger.info(`Server running on port ${PORT}`));