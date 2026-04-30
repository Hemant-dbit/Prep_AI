"use client";
import PreviousMockContainer from "@/components/dashboard/PreviousMockContainer";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/client/context/AuthContext";
import { PageLoading } from "@/components/ui/Loading";
import { useUsageStats } from "@/client/hooks/useUsageStats";
import { Dialog } from "@headlessui/react";
import { Loader2 } from "lucide-react";

export default function Dashboard() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();
  const { usage, loading } = useUsageStats();
  const [showPricing, setShowPricing] = useState(false);
  const [showExhausted, setShowExhausted] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading your Dashboard...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }
  // if (loading) return <p>Loading usage data...</p>;

  const handleStartInterview = () => {
    if (!usage) return;

    const isInterviewLimitReached =
      usage.interviews.used >= usage.interviews.limit;

    if (isInterviewLimitReached) {
      if (!user?.isPremium) {
        setShowPricing(true);
      } else {
        setShowExhausted(true);
      }
      return;
    }
    router.push("/interview/setup");
  };

  const handleResumeCheck = () => {
    if (!usage) return;

    const isResumeLimitReached = usage.resumes.used >= usage.resumes.limit;

    if (isResumeLimitReached) {
      if (!user?.isPremium) {
        setShowPricing(true);
      } else {
        setShowExhausted(true);
      }
      return;
    }
    router.push("/resume-check");
  };

  const handleViewAnalytics = () => {
    router.push("/home/analytics");
  };

  return (
    <div className="">
      <div className="flex justify-between my-8 mx-5">
        <div className="">
          <h1 className="font-bold text-4xl text-black my-3">
            Welcome back, {user?.name || user?.email || "User"}
          </h1>
          <h1 className="text-lg">
            Your personalised interview prep assistant
          </h1>
        </div>
        <div className="mr-5 my-3">
          <button
            onClick={handleViewAnalytics}
            className="bg-slate-200 rounded-md p-2 hover:bg-slate-300 transition-colors cursor-pointer"
          >
            View analytics
          </button>
        </div>
      </div>

      <div>
        <button
          onClick={handleStartInterview}
          className="rounded-md w-50 h-15 bg-white border border-gray-100 shadow-sm mx-2 px-2 cursor-pointer hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="size-6 mx-2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z"
              />
            </svg>
            <p className="mx-2 font-semibold">Start Interview</p>
          </div>
        </button>

        <button
          onClick={handleResumeCheck}
          className="rounded-md w-50 h-15 bg-white border border-gray-100 shadow-sm mx-2 px-2 cursor-pointer hover:bg-gray-50 transition-colors"
        >
          <div className="flex">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="size-6 mx-2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 0 1-2.25 2.25M16.5 7.5V18a2.25 2.25 0 0 0 2.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 0 0 2.25 2.25h13.5M6 7.5h3v3H6v-3Z"
              />
            </svg>
            <p className="mx-2 font-semibold">Resume Check</p>
          </div>
        </button>
      </div>

      <div className="rounded-md bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 shadow-sm mx-2 my-5 p-4 w-4/4">
        <div className="flex items-center mb-3">
          <h1 className="font-semibold text-blue-800">💡 Thought of the Day</h1>
        </div>
        <div className="bg-white rounded-lg p-4 border-l-4 border-blue-500">
          <p className="text-gray-800 text-base font-medium italic">
            Success in interviews isnt about having perfect answers its about
            showing your authentic self, demonstrating your growth mindset, and
            connecting genuinely with the people you are meeting.
          </p>
        </div>
      </div>

      <div>
        <PreviousMockContainer />
      </div>
      {/* Pricing Modal */}
      <Dialog
        open={showPricing}
        onClose={() => setShowPricing(false)}
        className="relative z-50"
      >
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-sm w-full">
            <h2 className="text-xl font-semibold mb-2 text-center">
              Interview Limit Reached
            </h2>
            <p className="text-gray-600 mb-4 text-center">
              You’ve used all your free attempts. Upgrade to unlock unlimited
              access.
            </p>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => router.push("/pricing")}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
              >
                View Plans
              </button>
              <button
                onClick={() => setShowPricing(false)}
                className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </Dialog>

      {/* Exhausted Modal */}
      <Dialog
        open={showExhausted}
        onClose={() => setShowExhausted(false)}
        className="relative z-50"
      >
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-sm w-full">
            <h2 className="text-xl font-semibold mb-2 text-center">
              Limit Exhausted
            </h2>
            <p className="text-gray-600 mb-4 text-center">
              You’ve reached your current usage limit. Please wait for your next
              cycle or contact support for assistance.
            </p>
            <div className="flex justify-center">
              <button
                onClick={() => setShowExhausted(false)}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
              >
                Okay
              </button>
            </div>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
