import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import nodemailer from 'nodemailer';

// Register user
export const registerUser = async (req, res) => {
    const { username, email, password, confirmPassword, telephone } = req.body;

    try {
        // Check if user already exists
        let user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Create new user
        user = new User({
            username,
            email,
            password,
            confirmPassword,
            telephone,
        });

        // Save user to database
        await user.save();

        // Generate JWT
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

        res.status(201).json({ token });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

// Login user
export const loginUser = async (req, res) => {
    const { email, password } = req.body;

    try {
        // Check if user exists
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // Check if password matches
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // Generate JWT
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

        res.status(200).json({ token });
    } catch (error) {
        console.error('login error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Get current user
export const getCurrentUser = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        res.json(user);
    } catch (error) {
        console.error('Error fetching user:'), error
        res.status(500).json({ message: 'Server error' });
    }
};

// Forgot password
export const forgotPassword = async (req, res) => {
    const { email } = req.body;

    try {
        // Check if the user exists
        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ message: 'User not found' });

        // Generate a reset token, valid for 1hr
        const resetToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

        // Save token in user record
        user.resetToken = resetToken;
        await user.save();

        // Send the reset link via email
        const transporter = nodemailer.createTransport({
            service: 'Gmail',
            auth: {
                user: process.env.EMAIL, // my email
                pass: process.env.EMAIL_PASSWORD, // my email password
            },
        });

        const resetUrl = `http://localhost:3000/reset-password?token=${resetToken}`;

        await transporter.sendMail({
            from: `"JayFirm" <${process.env.EMAIL}>`, // Custome name + ender email
            to: email,
            subject: 'Password Reset Request',
            text: `Click the following link to reset your password: ${resetUrl}`,
            html: `
                <p> Hi ${user.username},</p>
                <p>You requested a password reset. Click the link below to reset your password:</p>
                <a href="${resetUrl}" style="color: #0c6ef3:">Reset Password</a>
                <p>This link is only valid for 1 hour.<p>
                <p>If you didn't request this, please ignore this email.</p>
            `,
        });

        res.json({ message: 'Kindly check your email for your password reset link.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Something went wrong.' });
    }
};

// Reset Password
export const resetPassword = async (req, res) => {
    const { token, password } = req.body;

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Find the user by ID
        const user = await User.findById(decoded.id);
        if (!user || user.resetToken !== token) {
            return res.status(400).json({ message: 'Invalid or expired token' });
        }

        // Hash the new password 
        const hashedPassword = await bcrypt.hash(password, 10);

        // Update the password and clear the rest token
        user.password = hashedPassword;
        user.resetToken = null;
        await user.save();

        res.json({ message: 'Password reset successfully. Proceed to log in.' });
    } catch (error) {
        console.error(error);
        res.status(400).json({ message: 'Invalid or expired token '});
    }
};