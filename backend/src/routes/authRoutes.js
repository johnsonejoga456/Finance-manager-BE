import express from 'express';
import { registerUser, loginUser, getCurrentUser, forgotPassword, resetPassword } from '../controllers/authController.js';
import authMiddleware from '../middleware/auth.js'; // JWT verification middleware

const authRouter = express.Router();

// Register a new user
authRouter.post('/register', registerUser);

// Login user
authRouter.post('/login', loginUser);

// Get the current authenticated user
authRouter.get('/me', authMiddleware, getCurrentUser);

// User clicks forgot password
authRouter.post('/forgot-password', forgotPassword);

// Reset password 
authRouter.post('/reset-password', resetPassword);

export default authRouter;
