import Goal from '../models/Goals.js';

// Create a new goal
export const createGoal = async (req, res) => {
    try {
        const { title, targetAmount, deadline } = req.body;

        const goal = new Goal({
            title,
            targetAmount,
            deadline,
            milestones,
            user: req.user.id, // Add the authenticated user ID
        });

        await goal.save();
        res.status(201).json(goal);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Get all goals for the authenticated user
export const getGoals = async (req, res) => {
    try {
        const { sortBy, filterBy } = req.query;

        let query = { user: req.user.id };
        
        if (filterBy === 'completed') {
            query = { ...query, progress: { $lt: 100 } };
        } else if (filterBy === 'incomplete') {
            query = { ...query, progress: { $lt: 100} };
        }

        let goals = Goal.find(query);

        if (sortBy === 'progress') {
            goals = goals.sort({ progress: -1 }); // Descending order
        } else if (sortBy === 'deadline') {
            goals = goals.sort({ deadline: 1 }); // Ascending order
        }

        res.status(200).json(await goals);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Mark a Goal as Complete
export const markGoalAsComplete = async (req, res) => {
    try {
        const { id } = req.params;

        const goal = await Goal.findOneAndUpdate(
            { _id: id, user: req.user.id },
            { status: 'completed', currentAmount: targetAmount },
            { new: true }
        );

        if (!goal) {
            return res.status(404).json({ message: 'Goal not found' });
        }

        res.status(200).json(goal);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Update Goal Progress
export const updateGoalProgress = async (req, res) => {
    try {
        const { id } = req.params;
        const { currentAmount } = req.body;

        const goal = await Goal.findOneAndUpdate(
            { _id: id, user: req.user.id },
            { currentAmount },
            { new: true }
        );

        if (!goal) {
            return res.status(404).json({ message: 'Goal not found' });
        }

        res.status(200).json(goal);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Filter and Sort Goals
export const filterAndSortGoals = async (req, res) => {
    try {
        const { status, sortBy } = req.query;
        const query = { user: req.user.id };

        if (status) {
            query.status = status;
        }

        let sortOption = {};
        if (sortBy === 'progress') {
            sortOption = { currentAmount: -1 };
        } else if (sortBy === 'deadline') {
            sortOption = { deadline: 1 };
        }

        const goals = await Goal.find(query).sort(sortOption);
        res.status(200).json(goals);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};



// Users get notified

export const getNotifications = async (req, res) => {
    try {
        const goals = await Goal.find({ user: req.user.id });

        const notifications = goals.reduce((acc, goal) => {
            const daysLeft = Math.ceil((new Date(goal.deadline) - new Date()) / (1000 * 60 * 60 * 24));

            if (daysLeft <= 7 && daysLeft > 0) {
                acc.push({ message: `Goal "${goal.title}" is due in ${daysLeft} days.` });
            }

            if (goal.progress >= 100) {
                acc.push({ message: `Congratulations! You've completed the goal "${goal.title}".` });
            }

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

        if (!goal) {
            return res.status(404).json({ message: 'Goal not found' });
        }

        res.status(200).json({ message: 'Goal deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
