import { Progress } from "../ui/progress";
import { Button } from "../ui/button";
import React, { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { ChevronLeft, ChevronRight } from "lucide-react";
import QuestionsSections from "./QuestionsSections";
import Avatar from "./Avatar";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { useInterviewMonitoring } from "@/hooks/useInterviewMonitoring";
import { useAuth } from "@/context/AuthContext";
import Loading from "../ui/Loading";
import { invalidateInterviewCache } from "@/utils/interviewCache";

// Dynamic imports to prevent window undefined errors
const RecordAnswerSection = dynamic(() => import("./RecordAnswerSection"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-64">
      <div className="text-gray-600">Loading recording interface...</div>
    </div>
  ),
});

interface Question {
  id: string;
  questionText: string;
  order: number;
  createdAt: string;
}

interface InterviewUIProps {
  sessionId: string;
}

const InterviewUI: React.FC<InterviewUIProps> = ({ sessionId }) => {
  // Keep a single source of truth for maximum warnings before termination
  const MONITOR_MAX_WARNINGS = 3;
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionData, setSessionData] = useState<any>(null);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [overallScore, setOverallScore] = useState<number>(0);
  const [completionPercentage, setCompletionPercentage] = useState<number>(0);
  const [fallbackMode, setFallbackMode] = useState<boolean>(false);
  const [showResults, setShowResults] = useState<boolean>(false);
  const [finalResults, setFinalResults] = useState<any>(null);
  const [interviewTerminated, setInterviewTerminated] =
    useState<boolean>(false);
  const [monitoringStarted, setMonitoringStarted] = useState<boolean>(false);
  const [avatarEnabled, setAvatarEnabled] = useState<boolean>(true);
  const [avatarVariant, setAvatarVariant] = useState<
    "professional_female" | "professional_male"
  >("professional_female");
  const [avatarImageUrl, setAvatarImageUrl] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  // Get user info for greeting
  const { user } = useAuth();
  const lastWarningRef = useRef<{
    type: string;
    count: number;
    timestamp: number;
  } | null>(null);
  // Track which sessionIds we've already fetched questions for
  const fetchQuestionsRef = useRef<Set<string>>(new Set());

  // Interview monitoring
  const {
    warningCount,
    isMonitoring,
    hasStream,
    detectionStatus,
    isCalibrating,
    videoRef,
    canvasRef,
    startCameraMonitoring,
    stopCameraMonitoring,
  } = useInterviewMonitoring({
    onWarning: (type, count) => {
      // Prevent duplicate warning toasts
      const now = Date.now();
      const lastWarning = lastWarningRef.current;

      if (
        lastWarning &&
        lastWarning.type === type &&
        lastWarning.count === count &&
        now - lastWarning.timestamp < 1000
      ) {
        // debug: Preventing duplicate warning toast
        // console.log("Preventing duplicate warning toast", { type, count });
        return;
      }

      // Show a less intrusive warning; use MONITOR_MAX_WARNINGS for messaging
      if (count >= MONITOR_MAX_WARNINGS) {
        toast.error(`Final warning! Interview will be terminated.`, {
          duration: 5000,
          id: `final-warning-${sessionId}`,
        });
        // record last warning
        lastWarningRef.current = { type, count, timestamp: now };
      } else {
        toast.error(
          `Warning ${count}/${MONITOR_MAX_WARNINGS}: Please follow interview guidelines.`,
          {
            duration: 4000,
            id: `warning-${sessionId}-${type}-${count}`,
          }
        );
        // record last warning
        lastWarningRef.current = { type, count, timestamp: now };
      }
    },
    onInterviewTerminated: () => {
      setInterviewTerminated(true);
      // End interview session
      handleInterviewTermination();
    },
    maxWarnings: MONITOR_MAX_WARNINGS,
    enabled: !showResults && !error && !interviewTerminated, // Remove loading condition
  });

  // Aggressive release of video srcObject tracks in case streams persist
  // (removed temporary forceReleaseCamera helper)

  const handleInterviewTermination = async () => {
    // Ensure camera is stopped immediately when termination is triggered
    try {
      stopCameraMonitoring();
    } catch (err) {
      console.warn("Failed to stop camera during termination", err);
    }
    try {
      const token = localStorage.getItem("authToken");
      if (!token) return;

      // Mark interview as terminated in database
      await fetch("/api/interview/terminate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          sessionId,
          reason: "Multiple monitoring violations",
          warningCount,
        }),
      });

      // Redirect to dashboard with message
      setTimeout(() => {
        router.push("/home/dashboard?message=interview_terminated");
      }, 3000);
    } catch (error) {
      console.error("Error terminating interview:", error);
    }
  };

  // Handle camera retry - restart camera while keeping monitoring active
  const handleCameraRetry = async () => {
    // console.log("≡ƒöä Retrying camera access...");
    try {
      if (!document.hidden && monitoringStarted) {
        // console.log("≡ƒÄÑ Restarting camera monitoring...");

        // Stop and restart monitoring with a short delay
        stopCameraMonitoring();
        await new Promise((resolve) => setTimeout(resolve, 800));

        if (!document.hidden) {
          startCameraMonitoring();
        }

        // Verify the restart worked after a delay
        setTimeout(() => {
          if (!hasStream && !document.hidden) {
            console.warn("Camera retry may have failed - no stream detected");
            toast("Camera connection issue. Please check permissions.", {
              duration: 4000,
              id: `camera-connection-${sessionId}`,
            });
          } else if (hasStream) {
            toast.success("Camera reconnected successfully!", {
              duration: 2000,
              id: `camera-reconnected-${sessionId}`,
            });
          }
        }, 2000);
      }
    } catch (error) {
      console.error("Γ¥î Camera retry failed:", error);
      toast.error(
        "Camera retry failed. Please check permissions and try again."
      );
    }
  };

  useEffect(() => {
    // Guard: only fetch questions once per sessionId to avoid repeated requests
    const fetchedSessionRef = fetchQuestionsRef;

    if (!sessionId) return;

    if (fetchedSessionRef.current.has(sessionId)) {
      // already fetched for this session
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    let inFlight = true;

    const fetchQuestions = async () => {
      try {
        const token = localStorage.getItem("authToken");
        if (!token) {
          setError("No authentication token found");
          setLoading(false);
          return;
        }

        const response = await fetch(
          `/api/interview/questions?sessionId=${sessionId}`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            signal: controller.signal,
          }
        );

        if (!response.ok) {
          throw new Error("Failed to fetch questions");
        }

        const data = await response.json();
        if (!inFlight) return;

        if (data.success) {
          setQuestions(data.questions);
          setSessionData(data.session);
          fetchedSessionRef.current.add(sessionId);

          // Check if we're using fallback mode
          if (data.fallbackMode) {
            setFallbackMode(true);
            toast("Using demo questions - database temporarily unavailable", {
              icon: "≡ƒô¥",
              duration: 6000,
              id: `fallback-questions-${sessionId}`,
            });
          }

          // Start monitoring immediately when questions are loaded
          if (!monitoringStarted) {
            setMonitoringStarted(true);
            // console.log("Starting camera monitoring immediately...");
            // startCameraMonitoring is stable from the hook and safe to call
            // eslint-disable-next-line react-hooks/exhaustive-deps
            startCameraMonitoring();
          }
        } else {
          setError(data.error || "Failed to fetch questions");
        }
      } catch (error) {
        if ((error as any)?.name === "AbortError") {
          // console.log("Questions fetch aborted");
        } else {
          toast.error(" Failed to load interview questions", {
            id: `load-questions-${sessionId}`,
          });
          setError("Failed to load interview questions");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchQuestions();

    return () => {
      inFlight = false;
      controller.abort();

      // Cleanup monitoring on unmount only when interview is truly finished
      if (interviewTerminated || showResults) {
        // console.log(
        //   "InterviewUI unmounting - interview finished, stopping camera..."
        // );
        stopCameraMonitoring();
      } else {
        // console.log("InterviewUI unmounting - keeping camera active...");
      }
    };
    // Only re-run when sessionId changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  // Start camera monitoring immediately when component mounts
  useEffect(() => {
    if (!loading && !monitoringStarted) {
      // console.log("≡ƒÄÑ Auto-starting camera monitoring on component mount...");
      setMonitoringStarted(true);
      startCameraMonitoring();
    }
  }, [loading, monitoringStarted, startCameraMonitoring]);

  // Ensure camera is stopped when leaving the interview or when component unmounts
  useEffect(() => {
    return () => {
      try {
        // console.log(
        //   "InterviewUI unmounting - stopping camera monitoring to free webcam"
        // );
        // Debug: list video elements and tracks before stopping
        try {
          const vids = Array.from(
            document.querySelectorAll("video")
          ) as HTMLVideoElement[];
          // console.log("Debug before unmount stop - video elements:", vids.length);
          vids.forEach((v, i) => {
            try {
              const so = v.srcObject as MediaStream | null;
              // console.log(`Video #${i}: hasSrcObject=${!!so}, readyState=${v.readyState}, trackCount=${so?so.getTracks().length:0}`);
            } catch (e) {
              // ignore
            }
          });
        } catch (e) {
          // ignore
        }

        stopCameraMonitoring();
        // forceReleaseCamera is not defined; ensure all camera tracks are stopped here if needed.
      } catch (err) {
        console.warn("Failed to stop camera on unmount", err);
      }
    };
  }, [stopCameraMonitoring]);

  // Watch client-side route changes and stop camera when leaving the interview route
  useEffect(() => {
    try {
      if (!pathname) return;
      const isOnInterviewPath = pathname.startsWith("/interview/");
      if (!isOnInterviewPath) {
        // console.log("Route change detected - leaving interview path, stopping camera");
        stopCameraMonitoring();
      }
    } catch (err) {
      console.warn("Error checking pathname for camera stop", err);
    }
  }, [pathname, stopCameraMonitoring]);

  // Stop camera on window unload/navigation to ensure webcam is released
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      try {
        stopCameraMonitoring();
      } catch (err) {
        console.warn("Failed to stop camera on beforeunload", err);
      }
    };

    const handlePageHide = () => {
      try {
        stopCameraMonitoring();
      } catch (err) {
        console.warn("Failed to stop camera on pagehide", err);
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("pagehide", handlePageHide);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("pagehide", handlePageHide);
    };
  }, [stopCameraMonitoring]);

  // Auto-retry camera if hasStream is false for too long
  useEffect(() => {
    let retryTimer: NodeJS.Timeout;

    if (isMonitoring && !hasStream) {
      retryTimer = setTimeout(() => {
        // console.log("🔄 Auto-retrying camera due to no stream...");
        handleCameraRetry();
      }, 5000); // Retry after 5 seconds if no stream
    }

    return () => {
      if (retryTimer) {
        clearTimeout(retryTimer);
      }
    };
  }, [isMonitoring, hasStream]);

  useEffect(() => {
    // If the UI notices that stream is missing while monitoring is active,
    // schedule a retry. This avoids firing during render.
    if (isMonitoring && monitoringStarted && !hasStream) {
      const t = setTimeout(() => {
        // console.log("� UI noticed missing stream, attempting retry...");
        handleCameraRetry();
      }, 1200);

      return () => clearTimeout(t);
    }

    return;
  }, [isMonitoring, monitoringStarted, hasStream]);

  // Monitor camera stream health and keep it alive
  useEffect(() => {
    let healthCheckInterval: NodeJS.Timeout;

    if (isMonitoring && monitoringStarted) {
      // Check camera health every 3 seconds
      healthCheckInterval = setInterval(() => {
        const video = videoRef.current;

        if (!hasStream) {
          console.warn("⚠️ No camera stream detected, restarting...");
          handleCameraRetry();
        } else if (
          video &&
          (video.paused || video.readyState < 2 || video.videoWidth === 0)
        ) {
          console.warn(
            "⚠️ Camera stream appears inactive, restarting stream..."
          );
          handleCameraRetry();
        }
      }, 3000);
    }

    return () => {
      if (healthCheckInterval) {
        clearInterval(healthCheckInterval);
      }
    };
  }, [hasStream, isMonitoring, monitoringStarted]);

  // Convert questions to the format expected by existing components
  const interviewData = questions.map((question, index) => ({
    _id: question.id,
    sessionId: sessionId,
    text: question.questionText,
    type: "mixed", // Since we don't store type in current schema
    generatedFrom: "jd",
    order: question.order,
  }));
  const totalQuestions = interviewData.length;
  const progressValue =
    totalQuestions === 0
      ? 0
      : ((activeQuestionIndex + 1) / totalQuestions) * 100;

  // speak current question when activeQuestionIndex changes (Avatar handles TTS)
  const currentQuestionText =
    interviewData[activeQuestionIndex]?.text ||
    "Next question will appear here.";

  const handleAnswerSubmitted = (answerData: {
    questionId: string;
    answer: string;
  }) => {
    // Build new answers object outside the updater to avoid side-effects
    const newAnswers = {
      ...answers,
      [answerData.questionId]: answerData,
    };

    // Update the answers state
    setAnswers(newAnswers);

    // Update completion percentage with the new state
    const answeredCount = Object.keys(newAnswers).length;
    const completion = (answeredCount / totalQuestions) * 100;
    setCompletionPercentage(completion);

    // Show success toast - answer saved (run side-effects outside state updater)
    // Schedule as a microtask to ensure React has processed the state update
    Promise.resolve().then(() => {
      toast.success(` Answer saved for Question ${activeQuestionIndex + 1}`, {
        duration: 3000,
        id: `answer-saved-${answerData.questionId}`,
      });

      // If this is the last question, show completion notification
      if (answeredCount === totalQuestions) {
        setTimeout(() => {
          toast(
            `🎉 All questions answered! Click "See Final Score" to evaluate all answers and view complete results.`,
            {
              icon: "✨",
              duration: 8000,
            }
          );
        }, 1500);
      }
    });
  };

  const fetchOverallScore = async () => {
    try {
      const token = localStorage.getItem("authToken");
      if (!token) return;

      const response = await fetch(
        `/api/interview/score?sessionId=${sessionId}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();
      if (data.success) {
        setOverallScore(data.data.overallScore);
        setCompletionPercentage(data.data.completion);
        setFallbackMode(data.data.fallbackMode || false);
      }
    } catch (error) {
      console.error("Error fetching score:", error);
      // If fetch fails, we're probably in fallback mode
      setFallbackMode(true);
    }
  };

  const handleSeeScore = async () => {
    // Finish interview and get final results
    try {
      const token = localStorage.getItem("authToken");
      if (!token) {
        toast.error(" Please login to view results");
        return;
      }

      toast.loading("📊 Calculating your final score...", {
        id: `final-score-loading-${sessionId}`,
      });

      const response = await fetch("/api/interview/finish", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ sessionId }),
      });

      //Dismiss final score toast
      toast.dismiss(`final-score-loading-${sessionId}`);

      const data = await response.json();

      if (data.success) {
        setFinalResults(data.data);
        setOverallScore(data.data.overallScore);
        setCompletionPercentage(data.data.completionPercentage);
        try {
          stopCameraMonitoring();
        } catch (err) {
          console.warn("Failed to stop camera before showing results", err);
        }
        setShowResults(true);

        // Invalidate interview cache since a new interview was completed
        // We're the originator of this change — avoid triggering a global
        // refresh callback which could call back into this component.
        invalidateInterviewCache(false);

        toast.success(
          `🎯 Interview completed! Final score: ${data.data.overallScore}/10 (${data.data.grade})`,
          { id: `final-score-success-${sessionId}`, duration: 5000 }
        );
      } else {
        toast.error(` ${data.message || "Failed to calculate final score"}`, {
          id: `final-score-error-${sessionId}`,
        });
      }
    } catch (error) {
      toast.error(" Network error calculating final score", {
        id: `final-score-error-${sessionId}`,
      });
    }
  };

  // Show results if interview is completed
  if (showResults && finalResults) {
    return (
      <div className="max-w-6xl mx-auto p-4 md:p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-4">
            🎉 Interview Complete!
          </h1>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
            <div className="text-4xl font-bold text-blue-600 mb-2">
              {finalResults.overallScore}/10
            </div>
            <div className="text-xl text-blue-800 font-semibold mb-2">
              {finalResults.grade}
            </div>
            <div className="text-blue-700">
              {finalResults.answeredQuestions}/{finalResults.totalQuestions}{" "}
              questions answered ({finalResults.completionPercentage}% complete)
            </div>
          </div>

          <div className="bg-gray-50 border rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-gray-800 mb-2">
              Overall Feedback
            </h3>
            <p className="text-gray-700">{finalResults.overallFeedback}</p>
          </div>
        </div>

        {/* Individual Question Results */}
        <div className="space-y-4 mb-8">
          <h2 className="text-xl font-semibold text-gray-800">
            Question-by-Question Results
          </h2>
          {finalResults.questionResults.map((result: any, index: number) => (
            <div
              key={result.questionId}
              className="bg-white border rounded-lg p-4"
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-medium text-gray-800">
                  Question {index + 1}
                </h3>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-1 rounded text-sm font-medium ${
                      result.score >= 8
                        ? "bg-green-100 text-green-800"
                        : result.score >= 7
                        ? "bg-blue-100 text-blue-800"
                        : result.score >= 6
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {result.score}/10
                  </span>
                </div>
              </div>
              <p className="text-gray-600 text-sm mb-2">
                {result.questionText}
              </p>
              <div className="bg-gray-50 rounded p-3 mb-2">
                <p className="text-gray-700 text-sm">{result.answer}</p>
              </div>
              <p className="text-gray-600 text-sm">{result.feedback}</p>
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 justify-center">
          {/* <Button onClick={() => setShowResults(false)} variant="outline">
            Back to Interview
          </Button> */}
          <Link href="/home/dashboard">
            <Button className="bg-black hover:cursor-pointer">
              Return to Dashboard
            </Button>
          </Link>
        </div>

        {finalResults.fallbackMode && (
          <div className="mt-6 p-3 bg-orange-100 border border-orange-300 rounded-lg text-center">
            <p className="text-orange-800 text-sm">
              ⚠️ Results calculated in demo mode - database temporarily
              unavailable
            </p>
          </div>
        )}
      </div>
    );
  }

  // Show termination screen if interview was terminated
  if (interviewTerminated) {
    return (
      <div className="max-w-6xl mx-auto p-4 md:p-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="text-6xl mb-4">🚨</div>
            <h1 className="text-2xl font-bold text-red-600 mb-2">
              Interview Terminated
            </h1>
            <p className="text-gray-600 mb-4">
              The interview has been terminated due to multiple monitoring
              violations.
            </p>
            <p className="text-sm text-gray-500 mb-4">
              Total warnings: {warningCount}/3
            </p>
            <p className="text-sm text-gray-500">
              Redirecting to dashboard in 3 seconds...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // if (loading) {
  //   return (
  //     <div className="max-w-6xl mx-auto p-4 md:p-8">
  //       {/* <div className="flex flex-col items-center justify-center h-64 text-center">
  //         <Loading size="medium" color="gray" />
  //         <p className="text-gray-500 mt-4">Loading your interview...</p>
  //       </div> */}
  //     </div>
  //   );
  // }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto p-4 md:p-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-red-600">Error: {error}</div>
        </div>
      </div>
    );
  }

  // If questions are empty we still render the main UI so the interview
  // components (avatar, monitor, recorder) are available. The UI will
  // display empty states inline rather than short-circuiting with a full
  // page message which could appear transiently during initial load.

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8">
      {/* Fallback Mode Banner */}
      {fallbackMode && (
        <div className="mb-4 p-3 bg-orange-100 border border-orange-300 rounded-lg">
          <div className="flex items-center gap-2">
            <span className="text-orange-600">⚠️</span>
            <span className="text-orange-800 font-medium">
              Demo Mode Active
            </span>
          </div>
          <p className="text-orange-700 text-sm mt-1">
            Using demo questions and temporary storage. Your responses are saved
            for this session only.
          </p>
        </div>
      )}

      <div className="mb-6">
        <div className="flex justify-between items-start  max-w-7xl">
          <h1 className="text-2xl font-bold text-gray-800">
            AI-Generated Interview Session {fallbackMode && "(Demo Mode)"}
          </h1>
          <button
            onClick={() => {
              try {
                stopCameraMonitoring();
              } catch (err) {
                console.warn(
                  "Failed to stop camera before header navigation",
                  err
                );
              }
              router.push("/home/dashboard");
            }}
            className="px-4 py-2 text-black border rounded hover:bg-gray-50 cursor-pointer transition-colors"
          >
            Back to Dashboard
          </button>
        </div>

        <p className="text-gray-600">
          {fallbackMode
            ? "Using demo questions - database temporarily unavailable"
            : "Questions generated from job description"}
        </p>
        <Progress value={progressValue} className="h-2 " />
        <div className="flex justify-between text-sm text-gray-500 ">
          <span>
            Question {activeQuestionIndex + 1} of {interviewData.length}
          </span>
          <span>{Math.round(progressValue)}% completed</span>
        </div>
      </div>

      {/* Main Interview Layout - Two Container Design */}
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6 h-[calc(100vh-300px)] mt-1">
        {/* LEFT CONTAINER: Avatar and Questions */}
        <div className="bg-white rounded-xl shadow-sm border p-6  pb-6">
          {/* AI Interviewer Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-semibold text-gray-800">
                AI Interviewer
              </h3>
              <p className="text-sm text-gray-500">
                Your virtual interview assistant
              </p>
            </div>
            <div className="flex items-center gap-3">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={avatarEnabled}
                  onChange={(e) => setAvatarEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                <span className="ml-2 text-sm font-medium text-gray-700">
                  Voice
                </span>
              </label>
            </div>
          </div>

          {/* Avatar and Question Display */}
          <div className="mb-6">
            <Avatar
              text={currentQuestionText}
              autoSpeak={avatarEnabled}
              variant={avatarVariant}
              imageUrl={avatarImageUrl}
              userName={user?.name || null}
              onVariantChange={(
                v: "professional_female" | "professional_male"
              ) => {
                if (v === "professional_female" || v === "professional_male") {
                  setAvatarVariant(v);
                }
              }}
              isFirstQuestion={activeQuestionIndex === 0}
            />
          </div>

          {/* Question Navigation (numbers hidden here - compact nav moved to monitor panel) */}
          <QuestionsSections
            activeQuestionIndex={activeQuestionIndex}
            setActiveQuestionIndex={setActiveQuestionIndex}
            mockInterviewQuestion={interviewData}
            answers={answers}
            showNumbers={false}
          />

          {/* Move recording UI under the questions per requested layout change */}
          <div className="mt-4">
            <RecordAnswerSection
              activeQuestionIndex={activeQuestionIndex}
              mockInterviewQuestion={interviewData}
              sessionId={sessionId}
              onAnswerSubmitted={handleAnswerSubmitted}
            />
          </div>
        </div>

        {/* RIGHT CONTAINER: Camera Monitor and Recording */}
        <div className="bg-white rounded-xl shadow-sm border p-4 h-fit">
         

          {/* Camera Monitor */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">
              Camera Monitor
            </h3>
            <div className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full ${
                  hasStream ? "bg-green-500" : "bg-yellow-500"
                } animate-pulse`}
              ></div>
              <span className="text-xs text-gray-600">
                {hasStream ? "Live" : "Connecting"}
              </span>
            </div>
          </div>

          {/* Live Camera View */}
          <div className="relative bg-gray-900 rounded-lg overflow-hidden mb-4">
            {/* Always render video element */}
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="w-full aspect-video object-cover transform scaleX-[-1]"
              style={{ backgroundColor: "#1f2937" }}
              onLoadedMetadata={() => {
               
                if (
                  videoRef.current &&
                  (videoRef.current.videoWidth === 0 ||
                    videoRef.current.videoHeight === 0)
                ) {
                  console.warn(
                    "⚠️ Video has zero dimensions - attempting to restart camera..."
                  );
                  setTimeout(() => {
                    handleCameraRetry();
                  }, 1000);
                } else {
                  // console.log(
                  //   "✅ Video dimensions are valid, camera should be working"
                  // );
                }
              }}
              onCanPlay={() => {
                // console.log(
                //   "📹 Video can play - ready state:",
                //   videoRef.current?.readyState
                // );
              }}
              onPlay={() => {
                // console.log("📹 Video started playing");
              }}
              onLoadStart={() => {
                // console.log("📹 Video load started");
              }}
              onLoadedData={() => {
                // console.log("📹 Video data loaded");
              }}
              onError={(e) => {
                console.error("❌ Video error:", e);
                console.error("Video element details:", {
                  src: videoRef.current?.src,
                  srcObject: videoRef.current?.srcObject,
                  readyState: videoRef.current?.readyState,
                  networkState: videoRef.current?.networkState,
                });
              }}
              onEmptied={() => {
                // console.log("📹 Video emptied event");
              }}
              onStalled={() => {
                console.warn("⚠️ Video stalled");
              }}
              onSuspend={() => {
                console.warn("⚠️ Video suspended");
              }}
            />

            {/* Overlay for when camera is not connected */}
            {!hasStream && (
              <div className="absolute inset-0 bg-gray-800 flex flex-col items-center justify-center text-white">
                <div className="animate-pulse">
                  <svg
                    className="w-16 h-16 mb-4 text-gray-400"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 1c-4.97 0-9 4.03-9 9v7c0 1.66 1.34 3 3 3h3v-8H5v-2c0-3.87 3.13-7 7-7s7 3.13 7 7v2h-4v8h3c1.66 0 3-1.34 3-3v-7c0-4.97-4.03-9-9-9z" />
                  </svg>
                </div>
                <p className="text-center text-gray-300 text-sm mb-2">
                  Connecting Camera...
                </p>
                <p className="text-center text-gray-400 text-xs mb-4">
                  {isMonitoring
                    ? "Camera will remain active throughout the interview"
                    : "Requesting persistent camera access..."}
                </p>

                {/* Manual retry option */}
                <div className="text-xs text-gray-500 text-center">
                  <div className="mb-2">
                    <button
                      onClick={handleCameraRetry}
                      className="text-blue-400 hover:text-blue-300 underline"
                    >
                      Click to retry camera connection
                    </button>
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <span>
                      Status:{" "}
                      {hasStream
                        ? isCalibrating
                          ? "🎯 Calibrating"
                          : "✅ Connected"
                        : "🔄 Connecting"}
                    </span>
                    <span>•</span>
                    <span>Mode: {isCalibrating ? "Setup" : "Monitoring"}</span>
                  </div>
                </div>
              </div>
            )}

            <canvas ref={canvasRef} className="hidden" />

            {/* Status Overlay */}
            <div className="absolute top-2 left-2 flex flex-wrap gap-1">
              <div
                className={`px-2 py-1 rounded text-xs font-medium ${
                  detectionStatus.faceDetected
                    ? "bg-green-500 text-white"
                    : "bg-red-500 text-white"
                }`}
              >
                {detectionStatus.faceDetected ? "😊 Face" : "❌ Face"}
              </div>
              <div
                className={`px-2 py-1 rounded text-xs font-medium ${
                  detectionStatus.eyesDetected
                    ? "bg-green-500 text-white"
                    : "bg-red-500 text-white"
                }`}
              >
                {detectionStatus.eyesDetected ? "👀 Eyes" : "❌ Eyes"}
              </div>
              <div
                className={`px-2 py-1 rounded text-xs font-medium ${
                  detectionStatus.lookingAtCamera
                    ? "bg-green-500 text-white"
                    : "bg-yellow-500 text-white"
                }`}
              >
                {detectionStatus.lookingAtCamera ? "👁️ Looking" : "👁️ Away"}
              </div>
            </div>

            {/* Recording Indicator */}
            {isMonitoring && (
              <div className="absolute top-2 right-2">
                <div className="flex items-center gap-2 bg-red-500 text-white px-2 py-1 rounded text-xs">
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                  REC
                </div>
              </div>
            )}
          </div>

          {/* Monitoring Stats */}
          <div className="grid grid-cols-2 gap-2 text-sm mb-4">
            <div className="bg-gray-50 rounded-lg p-2 text-center">
              <div className="font-medium text-gray-700">Warnings</div>
              <div className="text-lg font-bold text-red-600">
                {warningCount}/3
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-2 text-center">
              <div className="font-medium text-gray-700">Status</div>
              <div
                className={`text-lg font-bold ${
                  isMonitoring ? "text-green-600" : "text-gray-400"
                }`}
              >
                {isMonitoring ? "Active" : "Inactive"}
              </div>
            </div>
          </div>

          {/* Compact Question Navigation placed below the monitor (numbers only) */}
          <div className="mb-4">
            <div className="flex flex-wrap gap-2 mb-2">
              {interviewData.map((question, index) => {
                const questionId = question._id;
                const isAnswered = questionId && answers[questionId];
                const isActive = activeQuestionIndex === index;

                let buttonClasses =
                  "w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-all ";

                if (isActive) {
                  buttonClasses += "bg-blue-600 text-white shadow-md";
                } else if (isAnswered) {
                  buttonClasses += "bg-green-600 text-white shadow-md";
                } else {
                  buttonClasses +=
                    "bg-gray-100 text-gray-700 hover:bg-gray-200";
                }

                return (
                  <button
                    key={index}
                    onClick={() => setActiveQuestionIndex(index)}
                    className={buttonClasses}
                    aria-label={`Go to question ${index + 1}`}
                  >
                    {index + 1}
                  </button>
                );
              })}
            </div>
            <div className="bg-yellow-50 rounded-lg p-3 text-sm text-yellow-700">
              <strong>Pro Tip:</strong> Click "Record Answer" in the main panel
              when you're ready to answer.
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Buttons with proper spacing */}
      <div className="fixed bottom-6 left-0 right-0 bg-white border-t border-gray-200 px-8 py-4">
        <div className="max-w-7xl mx-auto flex justify-between gap-4">
          <Button
            variant="outline"
            disabled={activeQuestionIndex === 0}
            onClick={() => setActiveQuestionIndex(activeQuestionIndex - 1)}
            className="gap-2"
          >
            <ChevronLeft size={18} />
            Previous
          </Button>

          {activeQuestionIndex < interviewData.length - 1 ? (
            <Button
              onClick={() => setActiveQuestionIndex(activeQuestionIndex + 1)}
              className="gap-2"
            >
              Next
              <ChevronRight size={18} />
            </Button>
          ) : (
            <div className="flex gap-4">
              <Button
                onClick={handleSeeScore}
                className="bg-green-600 hover:bg-green-700 gap-2 flex-1"
                disabled={Object.keys(answers).length === 0}
              >
                {Object.keys(answers).length === 0
                  ? "Answer Questions First"
                  : `See Final Score (${
                      Object.keys(answers).length
                    }/${totalQuestions} answered)`}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  const doExit = () => {
                    try {
                      stopCameraMonitoring();
                    } catch (err) {
                      console.warn("Failed to stop camera before exit", err);
                    }
                    window.location.href = "/home/dashboard";
                  };

                  if (Object.keys(answers).length > 0) {
                    const confirmExit = confirm(
                      `You have answered ${
                        Object.keys(answers).length
                      }/${totalQuestions} questions. Are you sure you want to exit without seeing your complete results?`
                    );
                    if (confirmExit) {
                      doExit();
                    }
                  } else {
                    doExit();
                  }
                }}
                className="gap-2"
              >
                Exit Interview
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InterviewUI;
