"use client";
import React, { use, useEffect, useState, useRef } from "react";
import PreviousInterviewCard from "./PreviousInterviewCard";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import Loading from "../ui/Loading";
import {
  getCachedInterviews,
  cacheInterviews,
  invalidateInterviewCache,
  isCacheValid,
} from "@/client/lib/interviewCache";

interface Interview {
  id: string;
  jobRole: string;
  experienceLevel: string;
  createdAt: string;
  overallScore: number;
  grade: string;
  totalQuestions: number;
  answeredQuestions: number;
  completionPercentage: number;
}

const PreviousMockContainer = () => {
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  // prevent duplicate reattempt submissions per interview id
  const reattemptingRef = useRef<Record<string, boolean>>({});

  useEffect(() => {
    loadInterviews();
  }, []);

  // Load interviews from cache or fetch fresh data
  const loadInterviews = async () => {
    try {
      // Try to load from cache first
      const cachedInterviews = getCachedInterviews();

      if (cachedInterviews && isCacheValid()) {
        // Use cached data
        setInterviews(cachedInterviews);
        setLoading(false);
        return;
      }

      // Fetch fresh data
      await fetchCompletedInterviews();
    } catch (error) {
      console.error("Error loading interviews:", error);
      // If cache loading fails, fetch fresh data
      await fetchCompletedInterviews();
    }
  };

  const fetchCompletedInterviews = async () => {
    try {
      const token = localStorage.getItem("authToken");
      if (!token) {
        setError("Please login to view your interview history");
        setLoading(false);
        return;
      }

      const response = await fetch("/api/interview/completed", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (data.success) {
        const fetchedInterviews = data.data.interviews;
        setInterviews(fetchedInterviews);

        // Cache the data using utility function
        cacheInterviews(fetchedInterviews);
      } else {
        setError(data.error || "Failed to fetch interview history");
        toast.error(" Failed to load interview history");
      }
    } catch (error) {
      setError("Network error loading interviews");
      toast.error(" Network error loading interview history");
    } finally {
      setLoading(false);
    }
  };

  // Method to refresh interviews (can be called externally)
  const refreshInterviews = async () => {
    setLoading(true);
    setError(null);
    // Clear cache to force fresh fetch
    // We're the initiator of this refresh; avoid triggering the global
    // refresh callback to prevent an immediate recursive call back here.
    invalidateInterviewCache(false);
    await fetchCompletedInterviews();
  };

  // Expose refresh method globally for other components to use
  useEffect(() => {
    // Store refresh function globally so other components can trigger refresh
    (window as any).refreshInterviewHistory = refreshInterviews;

    return () => {
      // Cleanup
      delete (window as any).refreshInterviewHistory;
    };
  }, []);

  const handleReAttempt = async (interviewId: string) => {
    try {
      if (reattemptingRef.current[interviewId]) return;
      reattemptingRef.current[interviewId] = true;
      const token = localStorage.getItem("authToken");
      if (!token) {
        toast.error(" Please login to re-attempt interview");
        return;
      }

      // Show loading toast while creating a new session
      const loadingToastId = toast.loading(
        "Creating new interview session...",
        { id: `reattempt-loading-${interviewId}` }
      );

      const response = await fetch("/api/interview/reattempt", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          originalSessionId: interviewId,
        }),
      });

      const data = await response.json();

      // Dismiss loading toast
      toast.dismiss(loadingToastId);

      if (data.success) {
        // Invalidate interview cache since a new interview session was created
        // We triggered the reattempt here; avoid causing a recursive refresh
        // by not invoking the global refresh callback.
        invalidateInterviewCache(false);

        toast.success("🎯 New interview session created! Redirecting...", {
          id: `reattempt-success-${interviewId}`,
        });
        // Redirect to the new interview session with active parameter
        console.debug(
          "PreviousMockContainer: navigating to interview reattempt",
          data.sessionId
        );
        router.push(`/interview/${data.sessionId}?session=active`);
        // leave the flag true briefly; clear after a tick
        setTimeout(() => {
          delete reattemptingRef.current[interviewId];
        }, 3000);
      } else {
        toast.error(` ${data.error || "Failed to re-attempt interview"}`, {
          id: `reattempt-error-${interviewId}`,
        });
        delete reattemptingRef.current[interviewId];
      }
    } catch (error) {
      console.error("Error re-attempting interview:", error);
      toast.error("Network error. Please try again.", {
        id: `reattempt-error-${interviewId}`,
      });
      delete reattemptingRef.current[interviewId];
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-md w-full border border-gray-100 shadow-sm">
        <h1 className="font-semibold text-xl p-2 m-2">
          Previous Mock Interviews
        </h1>
        <div className="p-4 text-center">
          <Loading size="medium" color="blue" />
          <p className="text-gray-500 mt-2">
            Loading your interview history...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-md w-full border border-gray-100 shadow-sm">
        <h1 className="font-semibold text-xl p-2 m-2">
          Previous Mock Interviews
        </h1>
        <div className="p-4 text-center text-red-600">
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-md w-full border border-gray-100 shadow-sm">
      <div className="flex justify-between items-center p-2 m-2">
        <h1 className="font-semibold text-xl">
          Previous Mock Interviews
          {interviews.length > 0 && (
            <span className="text-sm text-gray-500 ml-2">
              ({interviews.length} completed)
            </span>
          )}
        </h1>
        <button
          onClick={refreshInterviews}
          disabled={loading}
          className="px-3 py-1 text-sm bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-md border border-blue-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Refresh interview history"
        >
          {loading ? "Refreshing..." : "🔄 Refresh"}
        </button>
      </div>

      {interviews.length === 0 ? (
        <div className="p-4 text-center text-gray-500">
          <p>No completed interviews yet.</p>
          <p className="text-sm mt-1">
            Start your first interview to see results here!
          </p>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {interviews.map((interview) => (
            <PreviousInterviewCard
              key={interview.id}
              interview={interview}
              onReAttempt={() => {
                handleReAttempt(interview.id);
              }}
              onViewFeedback={() => {
                // Navigate to feedback page or open modal
                console.debug(
                  "PreviousMockContainer: navigating to results",
                  interview.id
                );
                router.push(`/interview/${interview.id}/results`);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default PreviousMockContainer;
