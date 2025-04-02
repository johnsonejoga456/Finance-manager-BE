import express from 'express';
import Notification from '../models/notificationModel.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();

// Get notifications for the logged-in user
router.get('/', authMiddleware, async (req, res) => {
    try {
        const notifications = await Notification.find({ userId: req.user.id }).sort({ createdAt: -1 });
        res.status(200).json(notifications);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching notifications', error });
    }
});

export default router;
