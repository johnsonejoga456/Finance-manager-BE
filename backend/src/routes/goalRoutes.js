import express from 'express';
import {
    createGoal,
    getGoals,
    markGoalAsComplete,
    updateGoalProgress,
    filterAndSortGoals,
    getNotifications,
    deleteGoal,
} from '../controllers/goalController.js';

import authMiddleware from '../middleware/auth.js'; // Ensure user is authenticated

const goalRouter = express.Router();

// Create a new goal
goalRouter.post('/', authMiddleware, createGoal);

// Get all goals for the authenticated user
goalRouter.get('/', authMiddleware, getGoals);

// Mark goals as complete
goalRouter.patch('/:id/complete', authMiddleware, markGoalAsComplete);

// Update goal progress
goalRouter.patch('/:id/progess', authMiddleware, updateGoalProgress);

// Filter and sort out goals
goalRouter.get('/', authMiddleware, filterAndSortGoals);

// Fetch notifications
goalRouter.get('/notifications', authMiddleware, getNotifications);


// Delete a goal
goalRouter.delete('/:id', authMiddleware, deleteGoal);

export default goalRouter;
