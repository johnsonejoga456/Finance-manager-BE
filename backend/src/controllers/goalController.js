import Goal from "../models/Goals.js";

// Create a new goal
export const createGoal = async (req, res) => {
  try {
    const { title, targetAmount, deadline, category, milestones = [] } = req.body;
    const goal = new Goal({
      title,
      targetAmount,
      deadline,
      category,
      milestones, // Optional, defaults to empty array
      user: req.user.id,
    });
    await goal.save();
    res.status(201).json(goal);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get all goals with filtering and sorting
export const getGoals = async (req, res) => {
  try {
    const { status, sortBy } = req.query;
    let query = { user: req.user.id };

    if (status) {
      query.status = status; // 'in-progress' or 'completed'
    }

    let sortOption = {};
    if (sortBy === "progress") {
      sortOption = { currentAmount: -1 }; // Sort by raw amount since progress is virtual
    } else if (sortBy === "deadline") {
      sortOption = { deadline: 1 };
    }

    const goals = await Goal.find(query).sort(sortOption);
    res.status(200).json(goals);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Mark a goal as complete
export const markGoalAsComplete = async (req, res) => {
  try {
    const { id } = req.params;
    const goal = await Goal.findOne({ _id: id, user: req.user.id });
    if (!goal) return res.status(404).json({ message: "Goal not found" });
    goal.status = "completed";
    goal.currentAmount = goal.targetAmount;
    await goal.save();
    res.status(200).json(goal);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update goal progress
export const updateGoalProgress = async (req, res) => {
  try {
    const { id } = req.params;
    const { currentAmount } = req.body;
    const goal = await Goal.findOneAndUpdate(
      { _id: id, user: req.user.id },
      { currentAmount },
      { new: true }
    );
    if (!goal) return res.status(404).json({ message: "Goal not found" });
    res.status(200).json(goal);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update milestones
export const updateMilestones = async (req, res) => {
  try {
    const { id } = req.params;
    const { milestones } = req.body; // Expect array of { amount: Number }
    const goal = await Goal.findOneAndUpdate(
      { _id: id, user: req.user.id },
      { milestones },
      { new: true }
    );
    if (!goal) return res.status(404).json({ message: "Goal not found" });
    res.status(200).json(goal);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get notifications
export const getNotifications = async (req, res) => {
  try {
    const goals = await Goal.find({ user: req.user.id });
    const notifications = goals.reduce((acc, goal) => {
      const daysLeft = Math.ceil((new Date(goal.deadline) - new Date()) / (1000 * 60 * 60 * 24));
      if (daysLeft <= 7 && daysLeft > 0 && goal.status === "in-progress") {
        acc.push({ message: `Goal "${goal.title}" is due in ${daysLeft} days.` });
      }
      if (goal.status === "completed") {
        acc.push({ message: `Congratulations! You've completed "${goal.title}".` });
      }
      goal.milestones.forEach((m) => {
        if (m.achieved && goal.currentAmount >= m.amount) {
          acc.push({ message: `Milestone reached for "${goal.title}": $${m.amount}!` });
        }
      });
      return acc;
    }, []);
    res.status(200).json(notifications);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete a goal
export const deleteGoal = async (req, res) => {
  try {
    const { id } = req.params;
    const goal = await Goal.findOneAndDelete({ _id: id, user: req.user.id });
    if (!goal) return res.status(404).json({ message: "Goal not found" });
    res.status(200).json({ message: "Goal deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};