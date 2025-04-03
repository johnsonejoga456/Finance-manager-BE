import express from "express";
import {
  createGoal,
  getGoals,
  markGoalAsComplete,
  updateGoalProgress,
  updateMilestones,
  getNotifications,
  deleteGoal,
} from "../controllers/goalController.js";
import authMiddleware from "../middleware/auth.js";

const goalRouter = express.Router();

// Create a new goal
goalRouter.post("/", authMiddleware, createGoal);

// Get all goals with filtering and sorting
goalRouter.get("/", authMiddleware, getGoals);

// Mark goal as complete
goalRouter.patch("/:id/complete", authMiddleware, markGoalAsComplete);

// Update goal progress
goalRouter.patch("/:id/progress", authMiddleware, updateGoalProgress);

// Update milestones
goalRouter.patch("/:id/milestones", authMiddleware, updateMilestones);

// Fetch notifications
goalRouter.get("/notifications", authMiddleware, getNotifications);

// Delete a goal
goalRouter.delete("/:id", authMiddleware, deleteGoal);

export default goalRouter;