"use client";

import React, { useState } from "react";
import {
  Target,
  Calendar,
  CheckCircle,
  Circle,
  Plus,
  TrendingUp,
  Book,
  MessageCircle,
  FileText,
  Trash2,
  Edit3,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { useGoals, Goal } from "@/client/hooks/useGoals";
import toast, { Toaster } from "react-hot-toast";

const categoryColors = {
  interview: "bg-blue-500",
  learning: "bg-green-500",
  practice: "bg-purple-500",
  resume: "bg-orange-500",
};

const categoryIcons = {
  interview: MessageCircle,
  learning: Book,
  practice: Target,
  resume: FileText,
};

export default function GoalsPage() {
  const {
    goals,
    loading,
    error,
    createGoal,
    updateGoal,
    deleteGoal,
    toggleGoalCompleted,
  } = useGoals();

  const [showAddGoal, setShowAddGoal] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    goalId: string | null;
    goalTitle: string;
  }>({
    isOpen: false,
    goalId: null,
    goalTitle: "",
  });
  const [newGoal, setNewGoal] = useState({
    title: "",
    description: "",
    category: "interview" as Goal["category"],
    targetDate: "",
  });

  const activeGoals = goals.filter((goal) => {
    const targetDate = new Date(goal.targetDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return targetDate >= today || goal.completed;
  });

  const completedGoals = activeGoals.filter((goal) => goal.completed).length;
  const totalGoals = activeGoals.length;
  const overallProgress =
    totalGoals > 0 ? (completedGoals / totalGoals) * 100 : 0;

  const handleAddGoal = async () => {
    // Validate required fields
    if (!newGoal.title.trim()) {
      toast.error("Please enter a goal title.");
      return;
    }

    if (!newGoal.targetDate) {
      toast.error("Please select a target date.");
      return;
    }

    // Validate target date
    const targetDate = new Date(newGoal.targetDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (targetDate < today) {
      toast.error("Target date cannot be in the past.");
      return;
    }

    try {
      await createGoal(newGoal);
      toast.success("Goal created successfully!");
      setNewGoal({
        title: "",
        description: "",
        category: "interview",
        targetDate: "",
      });
      setShowAddGoal(false);
    } catch (error) {
      toast.error("Failed to create goal. Please try again.");
      console.error("Error creating goal:", error);
    }
  };

  const handleToggleGoalCompleted = async (id: string) => {
    try {
      await toggleGoalCompleted(id);
      const goal = goals.find((g) => g.id === id);
      toast.success(
        goal?.completed ? "Goal marked as incomplete" : "Goal completed! 🎉"
      );
    } catch (error) {
      toast.error("Failed to update goal. Please try again.");
      console.error("Error toggling goal:", error);
    }
  };

  const handleDeleteGoal = async (id: string) => {
    const goal = goals.find((g) => g.id === id);
    if (!goal) return;

    setDeleteConfirmation({
      isOpen: true,
      goalId: id,
      goalTitle: goal.title,
    });
  };

  const confirmDelete = async () => {
    if (!deleteConfirmation.goalId) return;

    try {
      await deleteGoal(deleteConfirmation.goalId);
      toast.success("Goal deleted successfully");
    } catch (error) {
      toast.error("Failed to delete goal. Please try again.");
      console.error("Error deleting goal:", error);
    } finally {
      setDeleteConfirmation({ isOpen: false, goalId: null, goalTitle: "" });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const isOverdue = (targetDate: string, completed: boolean) => {
    return !completed && new Date(targetDate) < new Date();
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading your goals...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-4" />
          <p className="text-gray-900 font-medium mb-2">Failed to load goals</p>
          <p className="text-gray-600 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-white via-gray-50 to-gray-100 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
            <div className="mb-4 lg:mb-0">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Target className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">
                    Goals & Progress
                  </h1>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                    <span className="text-xs text-blue-600 font-medium">
                      Track Your Journey
                    </span>
                  </div>
                </div>
              </div>
              <p className="text-gray-600 text-sm max-w-2xl leading-relaxed">
                Set interview preparation goals and track your progress. Stay
                motivated and organized in your job search journey.
              </p>
            </div>

            <div className="flex items-center gap-4">
              <div className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm">
                <div className="text-center">
                  <p className="text-xl font-bold text-gray-900">
                    {completedGoals}/{totalGoals}
                  </p>
                  <p className="text-xs text-gray-600">Goals Completed</p>
                </div>
              </div>

              <button
                onClick={() => setShowAddGoal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg text-sm font-medium hover:bg-black hover:cursor-pointer transition-colors"
              >
                <Plus className="w-4 h-4 text-white" />
                Add Goal
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Overall Progress */}
        <div className="bg-white rounded-lg p-5 border border-gray-200 shadow-sm mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-bold text-gray-900">
              Overall Progress
            </h3>
            <span className="text-sm text-gray-600">
              {Math.round(overallProgress)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${overallProgress}%` }}
            ></div>
          </div>
          <div className="flex items-center gap-4 mt-3 text-xs text-gray-600">
            <div className="flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              <span>{completedGoals} completed</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              <span>{totalGoals - completedGoals} in progress</span>
            </div>
          </div>
        </div>

        {/* Goals List */}
        <div className="space-y-4">
          {goals.map((goal) => {
            const CategoryIcon = categoryIcons[goal.category];
            const isGoalOverdue = isOverdue(goal.targetDate, goal.completed);

            return (
              <div
                key={goal.id}
                className={`bg-white rounded-lg p-5 border transition-all duration-200 hover:shadow-md ${
                  goal.completed
                    ? "border-green-200 bg-green-50"
                    : isGoalOverdue
                    ? "border-red-200 bg-red-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4 flex-1">
                    {/* Category Icon */}
                    <div
                      className={`w-10 h-10 ${
                        categoryColors[goal.category]
                      } rounded-lg flex items-center justify-center flex-shrink-0`}
                    >
                      <CategoryIcon className="w-5 h-5 text-white" />
                    </div>

                    {/* Goal Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <button
                          onClick={() => handleToggleGoalCompleted(goal.id)}
                          className="flex-shrink-0"
                        >
                          {goal.completed ? (
                            <CheckCircle className="w-5 h-5 text-green-500" />
                          ) : (
                            <Circle className="w-5 h-5 text-gray-400 hover:text-gray-600" />
                          )}
                        </button>
                        <h3
                          className={`text-base font-semibold ${
                            goal.completed
                              ? "text-green-700 line-through"
                              : "text-gray-900"
                          }`}
                        >
                          {goal.title}
                        </h3>
                        {isGoalOverdue && (
                          <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">
                            Overdue
                          </span>
                        )}
                      </div>

                      <p className="text-sm text-gray-600 mb-3">
                        {goal.description}
                      </p>

                      {/* Progress Bar */}
                      {!goal.completed && (
                        <div className="mb-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-gray-500">
                              Progress
                            </span>
                            <span className="text-xs text-gray-500">
                              {goal.progress}%
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-1.5">
                            <div
                              className={`h-1.5 rounded-full transition-all duration-300 ${
                                categoryColors[goal.category]
                              }`}
                              style={{ width: `${goal.progress}%` }}
                            ></div>
                          </div>
                        </div>
                      )}

                      {/* Date Info */}
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span>Target: {formatDate(goal.targetDate)}</span>
                        </div>
                        <div>
                          <span>Created: {formatDate(goal.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => handleDeleteGoal(goal.id)}
                      className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {goals.length === 0 && (
            <div className="text-center py-12">
              <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No goals yet
              </h3>
              <p className="text-gray-600 mb-4">
                Set your first goal to start tracking your progress
              </p>
              <button
                onClick={() => setShowAddGoal(true)}
                className="px-4 py-2 bg-black text-white rounded-lg text-sm font-medium hover:cursor-pointer transition-colors"
              >
                Add Your First Goal
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Add Goal Modal */}
      {showAddGoal && (
        <div className="fixed inset-0 bg-black/25 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg w-full max-w-md shadow-xl">
            <div className="p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">
                Add New Goal
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Goal Title
                  </label>
                  <input
                    type="text"
                    value={newGoal.title}
                    onChange={(e) =>
                      setNewGoal({ ...newGoal, title: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., Complete 10 practice interviews"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={newGoal.description}
                    onChange={(e) =>
                      setNewGoal({ ...newGoal, description: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={3}
                    placeholder="Describe your goal in more detail..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <select
                    value={newGoal.category}
                    onChange={(e) =>
                      setNewGoal({
                        ...newGoal,
                        category: e.target.value as Goal["category"],
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="interview">Interview Practice</option>
                    <option value="learning">Learning & Study</option>
                    <option value="practice">Skill Practice</option>
                    <option value="resume">Resume & Profile</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Target Date
                  </label>
                  <input
                    type="date"
                    value={newGoal.targetDate}
                    min={new Date().toISOString().split("T")[0]}
                    onChange={(e) => {
                      const selectedDate = new Date(e.target.value);
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);

                      if (selectedDate < today) {
                        toast.error("Target date cannot be in the past");
                        return;
                      }
                      setNewGoal({ ...newGoal, targetDate: e.target.value });
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 mt-6">
                <button
                  onClick={handleAddGoal}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  Add Goal
                </button>
                <button
                  onClick={() => setShowAddGoal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <Toaster position="top-right" />

      {/* Delete Confirmation Dialog */}
      {deleteConfirmation.isOpen && (
        <div className="fixed inset-0 bg-black/25 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg w-full max-w-md shadow-xl">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Delete Goal
              </h2>
              <div className="mb-6">
                <p className="text-gray-600">
                  Are you sure you want to delete this goal?
                </p>
                <p className="mt-2 font-medium text-gray-900">
                  "{deleteConfirmation.goalTitle}"
                </p>
              </div>
              <div className="flex items-center gap-3 justify-end">
                <button
                  onClick={() =>
                    setDeleteConfirmation({
                      isOpen: false,
                      goalId: null,
                      goalTitle: "",
                    })
                  }
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
                >
                  Delete Goal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
