# Goals Page User Guide

Welcome to the **Goals Page** of your Finance Manager app! This is your hub for setting, tracking, and achieving your financial dreams—whether it’s saving for a vacation, paying off debt, or building an emergency fund. Here’s everything you need to know to make the most of it.

**Last Updated:** April 10, 2025

---

## What is the Goals Page?
The Goals Page lets you:
- **View** all your financial goals in one place.
- **Track** progress with visual indicators and milestones.
- **Manage** goals by creating, editing, or deleting them.
- **Stay Informed** with notifications about deadlines and updates.

It’s designed to be intuitive and visually appealing, with a clean layout, vibrant colors, and smooth interactions to keep you motivated.

---

## Accessing the Goals Page
- **Where:** Log in to your Finance Manager app and navigate to `/dashboard/goals` from the main dashboard.
- **Requirement:** You must be signed in. If not, you’ll be redirected to the login page.

---

## Features and How to Use Them

### 1. Header
**What You’ll See:**
- A bold “Your Goals” title in indigo.
- Your username (e.g., “Hey, [Your Name]”) and a “Logout” button.

**How to Use:**
- **Logout:** Click the red “Logout” button (with a gradient effect) to sign out securely. It’s perfect for when you’re done planning your finances.

---

### 2. Notifications Section
**What You’ll See:**
- A “Recent Updates” box showing up to 3 recent notifications (e.g., “Goal ‘Vacation Fund’ is nearing its deadline!”).
- Displayed in a white card with a subtle shadow.

**How to Use:**
- **Stay Updated:** Check this section to see reminders or alerts about your goals—like upcoming deadlines or completed milestones.
- **Why It’s Useful:** Keeps you on top of your priorities without needing to dig through each goal.

---

### 3. Tabs: In Progress & Completed
**What You’ll See:**
- Two tabs: “In Progress” and “Completed.”
- The active tab is highlighted with an indigo underline; inactive tabs are gray with a hover effect.

**How to Use:**
- **Switch Views:** Click “In Progress” to see active goals you’re working on, or “Completed” to review your achievements.
- **Why It’s Useful:** Quickly filter goals based on their status to focus on what matters most right now.

---

### 4. Controls: Create & Sort
**What You’ll See:**
- A “+ Create Goal” button with an indigo-to-blue gradient.
- A “Sort” panel with options: “Default,” “Progress,” and “Deadline” (active sort is highlighted in indigo).

**How to Use:**
- **Create a Goal:** Click “+ Create Goal” to open a form in a sleek modal. Fill in details like title, target amount, currency, category, deadline, and description (more on this below).
- **Sort Goals:** Click a sort option to reorder your goals:
  - **Default:** Original order from the server.
  - **Progress:** Highest to lowest progress percentage.
  - **Deadline:** Nearest to furthest due date.
- **Why It’s Useful:** Start new goals easily and organize them to match your workflow.

---

### 5. Goal Creation/Edit Form (Modal)
**What You’ll See:**
- A centered modal with a white background, rounded corners, and a shadow when you click “+ Create Goal” or edit an existing goal.
- Fields for title, target amount, currency, category, deadline, description, and milestones (via `GoalForm`).

**How to Use:**
- **Add a Goal:** Fill out the form and click “Save” to add it to your “In Progress” list. The modal closes automatically.
- **Edit a Goal:** Click the edit icon on a `GoalCard` (see below), update the fields, and save. Cancel to discard changes.
- **Why It’s Useful:** A distraction-free way to set or tweak goals with all details in one place.

---

### 6. Goals Grid
**What You’ll See:**
- A responsive grid of `GoalCard`s (1 column on mobile, up to 3 on desktop) with a fade-in animation.
- States:
  - **Loading:** “Loading your goals…” with a pulsing effect.
  - **Error:** A red alert box (e.g., “Failed to load goals.”).
  - **Empty:** A message like “No goals in progress. Create one to get started!” in a white card.

**How to Use:**
- **Browse Goals:** Scroll through your cards to see each goal’s details at a glance.
- **Interact:** Use the controls on each card (detailed next).
- **Why It’s Useful:** Visually engaging cards make tracking multiple goals feel manageable and fun.

---

### 7. Goal Card Features
Each `GoalCard` (see your Mantine-styled version) is packed with tools:

**What You’ll See:**
- **Title & Category:** Bold title with a violet target icon, plus a category badge (e.g., “Savings”).
- **Due Date:** An outline badge if set (e.g., “4/15/2025”).
- **Description:** A short preview (2 lines max).
- **Progress:** A violet gradient bar with milestone markers (teal for achieved, orange for pending) and a percentage (e.g., “75% Complete”).
- **Milestones:** Badges below the progress bar (teal/green for achieved, orange for pending).
- **Actions:** A dropdown menu (via `IconDotsVertical`) with:
  - **Mark Complete** (teal checkmark, in-progress only).
  - **Edit** (blue pencil).
  - **Delete** (red trash).
- **Inputs:** Forms to update progress or add milestones with violet buttons.

**How to Use:**
- **View Details:** Hover over the card—it lifts slightly with a violet shadow for a 3D effect.
- **Track Progress:** See the bar fill as you get closer to your target. Hover over milestone markers for amounts.
- **Update Progress:** Enter an amount (e.g., “500”) in the “Add progress amount” field and click “Update.” The bar adjusts instantly.
- **Add Milestones:** Type an amount (e.g., “1000”) in the “Add milestone amount” field and click “Add.” A new badge appears.
- **Complete a Goal:** Click the checkmark in the dropdown. It moves to “Completed” (or disappears from “In Progress”).
- **Edit a Goal:** Click the pencil to reopen the form with current data.
- **Delete a Goal:** Click the trash to remove it permanently (no undo, so be sure!).
- **Why It’s Useful:** Everything you need to manage a goal is right there—progress tracking, milestones, and controls—wrapped in a sleek, interactive card.

---

## How Users Can Utilize the Goals Page

### Getting Started
1. **Log In:** Sign in to see your personalized Goals Page.
2. **Create Your First Goal:** Click “+ Create Goal,” enter details (e.g., “Save $5,000 for a car,” target: 5000, USD, deadline: 12/31/2025), and save.
3. **Explore:** Check the “In Progress” tab to see your new goal card.

### Daily Use
- **Monitor Progress:** Visit daily to see your progress bars and milestone badges update as you add amounts.
- **Stay on Track:** Glance at “Recent Updates” for deadline reminders or milestone achievements.
- **Switch Tabs:** Toggle to “Completed” to celebrate finished goals.

### Managing Goals
- **Update Regularly:** Add progress (e.g., “I saved $200 today”) or new milestones (e.g., “Reach $2,000 next month”).
- **Edit as Needed:** Adjust targets or deadlines if plans change.
- **Clean Up:** Delete outdated or irrelevant goals.

### Staying Motivated
- The vibrant colors (violet for progress, teal for success) and smooth animations (hover lifts, fade-ins) make tracking fun and rewarding.
- Sort by “Progress” to focus on goals nearing completion, or “Deadline” to prioritize urgent ones.

---

## Tips for Success
- **Set Clear Goals:** Use specific targets (e.g., “$1,000 for emergency fund”) to stay focused.
- **Break It Down:** Add milestones (e.g., $250, $500) to feel progress along the way.
- **Check Notifications:** Don’t miss deadlines—act on alerts promptly.
- **Celebrate Wins:** Mark goals complete and enjoy the teal “Completed” badge!

---

## Troubleshooting
- **Goals Not Loading?** Ensure you’re online. If “Failed to load goals” persists, log out and back in.
- **Can’t Save a Goal?** Check all required fields (title, target amount) are filled.
- **Notifications Missing?** They update after actions like completing a goal—give it a moment.

---

