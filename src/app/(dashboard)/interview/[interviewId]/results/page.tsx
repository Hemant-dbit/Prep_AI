"use client";
import React, { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/client/context/AuthContext";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { invalidateInterviewCache } from "@/client/lib/interviewCache";

interface QuestionResult {
  questionId: string;
  questionText: string;
  order: number;
  answer: string | null;
  score: number | null;
  feedback: string | null;
  strengths: string | null;
  improvements: string | null;
  submittedAt: string | null;
}

interface InterviewResults {
  sessionId: string;
  jobRole: string;
  experienceLevel: string;
  createdAt: string;
  updatedAt: string;
  status: string;
  overallScore: number;
  grade: string;
  totalQuestions: number;
  answeredQuestions: number;
  completionPercentage: number;
  questionResults: QuestionResult[];
  jobDescription: any;
  candidateInfo: any;
}

export default function InterviewResultsPage() {
  const params = useParams();
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  const [results, setResults] = useState<InterviewResults | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reattemptingRef = useRef(false);

  const interviewId = params.interviewId as string;

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
      return;
    }

    if (isAuthenticated && interviewId) {
      fetchInterviewResults();
    }
  }, [isAuthenticated, isLoading, interviewId]);

  const fetchInterviewResults = async () => {
    try {
      const token = localStorage.getItem("authToken");
      if (!token) {
        toast.error("Please login to view results");
        router.push("/login");
        return;
      }

      const response = await fetch(`/api/interview/${interviewId}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (data.success) {
        setResults(data.data);
      } else {
        setError(data.error || "Failed to fetch interview results");
        toast.error("❌ " + (data.error || "Failed to load interview results"));
      }
    } catch (error) {
      setError("Network error loading results");
      toast.error("❌ Network error loading interview results");
    } finally {
      setLoading(false);
    }
  };

  const handleReAttempt = async () => {
    try {
      if (reattemptingRef.current) return;
      reattemptingRef.current = true;
      const token = localStorage.getItem("authToken");
      if (!token) {
        toast.error("❌ Please login to re-attempt interview");
        return;
      }

      // Show loading toast
      const loadingToast = toast.loading(
        "🔄 Creating new interview session..."
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

      toast.dismiss(loadingToast);

      if (data.success) {
        // Invalidate interview cache since a new interview session was created
        // We're the originator here — avoid triggering the global refresh callback
        // which may call back into this component and create a loop.
        invalidateInterviewCache(false);

        toast.success("🎯 New interview session created! Redirecting...");
        // Redirect to the new interview session with active parameter
        console.debug(
          "ResultsPage: navigating to interview reattempt",
          data.sessionId
        );
        router.push(`/interview/${data.sessionId}?session=active`);
        setTimeout(() => {
          reattemptingRef.current = false;
        }, 3000);
      } else {
        toast.error(`❌ ${data.error || "Failed to re-attempt interview"}`);
        reattemptingRef.current = false;
      }
    } catch (error) {
      console.error("Error re-attempting interview:", error);
      toast.error("❌ Network error. Please try again.");
      reattemptingRef.current = false;
    }
  };

  if (isLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 mt-4">Loading interview results...</p>
        </div>
      </div>
    );
  }

  if (error || !results) {
    return (
      <div className="max-w-4xl mx-auto p-8 text-center">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h1 className="text-xl font-semibold text-red-800 mb-2">
            Error Loading Results
          </h1>
          <p className="text-red-700">
            {error || "Interview results not found"}
          </p>
          <div className="mt-4">
            <Link href="/home/dashboard">
              <Button variant="outline">Return to Dashboard</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);

    // Use consistent formatting to avoid hydration mismatches
    const weekdays = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    const months = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];

    const weekday = weekdays[date.getDay()];
    const month = months[date.getMonth()];
    const day = date.getDate();
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");

    return `${weekday}, ${month} ${day}, ${year} at ${hours}:${minutes}`;
  };

  const getScoreColor = (score: number) => {
    if (score >= 8) return "text-green-600";
    if (score >= 6) return "text-blue-600";
    if (score >= 4) return "text-yellow-600";
    return "text-red-600";
  };

  const getGradeColor = (grade: string) => {
    if (grade === "Excellent" || grade === "Very Good")
      return "text-green-700 bg-green-50";
    if (grade === "Good" || grade === "Average")
      return "text-blue-700 bg-blue-50";
    return "text-red-700 bg-red-50";
  };

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          Interview Results: {results.jobRole}
        </h1>
        <p className="text-gray-600">
          Completed on {formatDate(results.createdAt)}
        </p>
      </div>

      {/* Overall Score Card */}
      <div className="bg-white border rounded-lg p-6 mb-6 shadow-sm">
        <div className="text-center mb-4">
          <div
            className={`text-5xl font-bold mb-2 ${getScoreColor(
              results.overallScore
            )}`}
          >
            {results.overallScore}/10
          </div>
          <div
            className={`inline-block px-4 py-2 rounded-full font-semibold ${getGradeColor(
              results.grade
            )}`}
          >
            {results.grade}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 text-center border-t pt-4">
          <div>
            <div className="text-2xl font-semibold text-gray-700">
              {results.answeredQuestions}
            </div>
            <div className="text-sm text-gray-500">Questions Answered</div>
          </div>
          <div>
            <div className="text-2xl font-semibold text-gray-700">
              {results.totalQuestions}
            </div>
            <div className="text-sm text-gray-500">Total Questions</div>
          </div>
          <div>
            <div className="text-2xl font-semibold text-gray-700">
              {results.completionPercentage}%
            </div>
            <div className="text-sm text-gray-500">Completion</div>
          </div>
        </div>
      </div>

      {/* Question by Question Results */}
      <div className="space-y-6">
        <h2 className="text-2xl font-semibold text-gray-800">
          Question-by-Question Analysis
        </h2>

        {results.questionResults.map((question, index) => (
          <div
            key={question.questionId}
            className="bg-white border rounded-lg p-6 shadow-sm"
          >
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-semibold text-gray-800">
                Question {question.order || index + 1}
              </h3>
              {question.score !== null && (
                <div
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    question.score >= 8
                      ? "bg-green-100 text-green-800"
                      : question.score >= 7
                      ? "bg-blue-100 text-blue-800"
                      : question.score >= 6
                      ? "bg-yellow-100 text-yellow-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  {question.score}/10
                </div>
              )}
            </div>

            <div className="mb-4">
              <p className="text-gray-700 font-medium mb-2">Question:</p>
              <p className="text-gray-600 bg-gray-50 p-3 rounded">
                {question.questionText}
              </p>
            </div>

            {question.answer ? (
              <>
                <div className="mb-4">
                  <p className="text-gray-700 font-medium mb-2">Your Answer:</p>
                  <p className="text-gray-600 bg-blue-50 p-3 rounded">
                    {question.answer}
                  </p>
                </div>

                {question.feedback && (
                  <div className="mb-4">
                    <p className="text-gray-700 font-medium mb-2">Feedback:</p>
                    <p className="text-gray-600 bg-yellow-50 p-3 rounded">
                      {question.feedback}
                    </p>
                  </div>
                )}

                {question.strengths && (
                  <div className="mb-4">
                    <p className="text-green-700 font-medium mb-2">
                      Strengths:
                    </p>
                    <p className="text-green-600 bg-green-50 p-3 rounded">
                      {question.strengths}
                    </p>
                  </div>
                )}

                {question.improvements && (
                  <div className="mb-4">
                    <p className="text-orange-700 font-medium mb-2">
                      Areas for Improvement:
                    </p>
                    <p className="text-orange-600 bg-orange-50 p-3 rounded">
                      {question.improvements}
                    </p>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-4 text-gray-500 bg-gray-50 rounded">
                No answer provided for this question
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4 justify-center mt-8">
        <Link href="/home/dashboard">
          <Button variant="outline" size="lg">
            Back to Dashboard
          </Button>
        </Link>
        <Button size="lg" onClick={handleReAttempt}>
          Re-attempt Interview
        </Button>
      </div>
    </div>
  );
}
