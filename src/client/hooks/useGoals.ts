import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { goalsService } from "../services/goals.service";

export interface Goal {
  id: string;
  title: string;
  description: string;
  category: "interview" | "learning" | "practice" | "resume";
  targetDate: string;
  completed: boolean;
  progress: number;
  createdAt: string;
  updatedAt: string;
}

export const useGoals = () => {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { token, isAuthenticated } = useAuth();

  const fetchGoals = async () => {
    if (!token || !isAuthenticated) { setLoading(false); return; }
    try {
      setLoading(true);
      const data: any = await goalsService.getAll();
      const transformedGoals = data.goals.map((goal: any) => ({
        ...goal,
        category: goal.category.toLowerCase(),
        targetDate: goal.targetDate.split("T")[0],
        createdAt: goal.createdAt.split("T")[0],
      }));
      setGoals(transformedGoals);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const createGoal = async (goalData: Omit<Goal, "id" | "completed" | "progress" | "createdAt" | "updatedAt">) => {
    const data: any = await goalsService.create(goalData);
    const transformed = { ...data.goal, category: data.goal.category.toLowerCase(), targetDate: data.goal.targetDate.split("T")[0], createdAt: data.goal.createdAt.split("T")[0] };
    setGoals((prev) => [transformed, ...prev]);
    return transformed;
  };

  const updateGoal = async (goalId: string, updates: Partial<Goal>) => {
    const data: any = await goalsService.update(goalId, updates);
    const transformed = { ...data.goal, category: data.goal.category.toLowerCase(), targetDate: data.goal.targetDate.split("T")[0], createdAt: data.goal.createdAt.split("T")[0] };
    setGoals((prev) => prev.map((g) => (g.id === goalId ? transformed : g)));
    return transformed;
  };

  const deleteGoal = async (goalId: string) => {
    await goalsService.delete(goalId);
    setGoals((prev) => prev.filter((g) => g.id !== goalId));
  };

  const toggleGoalCompleted = async (goalId: string) => {
    const goal = goals.find((g) => g.id === goalId);
    if (!goal) return;

    const completed = !goal.completed;
    const progress = completed ? 100 : 0;

    return updateGoal(goalId, { completed, progress });
  };

  useEffect(() => {
    fetchGoals();
  }, [token, isAuthenticated]);

  return {
    goals,
    loading,
    error,
    createGoal,
    updateGoal,
    deleteGoal,
    toggleGoalCompleted,
    refetch: fetchGoals,
  };
};
