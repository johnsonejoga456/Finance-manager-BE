import mongoose from "mongoose";

const goalSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    targetAmount: { type: Number, required: true },
    currentAmount: { type: Number, default: 0 },
    deadline: { type: Date, required: true },
    status: { type: String, enum: ["in-progress", "completed"], default: "in-progress" },
    category: { type: String, enum: ["savings", "debt", "investment", "other"], default: "other" }, // New field
    milestones: [
      {
        amount: { type: Number, required: true },
        achieved: { type: Boolean, default: false },
      },
    ],
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

// Virtual field for progress calculation
goalSchema.virtual("progress").get(function () {
  if (this.targetAmount === 0) return 0;
  return Math.min(((this.currentAmount / this.targetAmount) * 100).toFixed(2), 100);
});

// Include virtuals in JSON and Object responses
goalSchema.set("toJSON", { virtuals: true });
goalSchema.set("toObject", { virtuals: true });

// Pre-save validation: Ensure currentAmount does not exceed targetAmount
goalSchema.pre("save", function (next) {
  if (this.currentAmount > this.targetAmount) {
    return next(new Error("Current amount cannot exceed the target amount."));
  }
  next();
});

// Pre-save: Update milestone statuses
goalSchema.pre("save", function (next) {
  this.milestones = this.milestones.map((milestone) => ({
    ...milestone,
    achieved: this.currentAmount >= milestone.amount,
  }));
  next();
});

const Goal = mongoose.model("Goal", goalSchema);

export default Goal;