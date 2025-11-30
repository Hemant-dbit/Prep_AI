import React, { useEffect, useRef, useState } from "react";
import useSpeechToText from "react-hook-speech-to-text";
import { Mic, StopCircle, Circle, Video, VideoOff } from "lucide-react";
import dynamic from "next/dynamic";
import { Button } from "../ui/button";
import toast from "react-hot-toast";

// Define interfaces
interface Question {
  _id: string;
  sessionId: string;
  text: string;
  type: string;
  generatedFrom: string;
  order: number;
}

interface RecordAnswerSectionProps {
  mockInterviewQuestion: Question[];
  activeQuestionIndex: number;
  sessionId: string;
  onAnswerSubmitted?: (answerData: {
    questionId: string;
    answer: string;
  }) => void;
}

// Dynamically import Webcam with no SSR and proper ref forwarding
const Webcam = dynamic(
  () =>
    import("react-webcam").then((mod) => {
      const WebcamComponent = mod.default;
      return React.forwardRef<any, any>((props, ref) => (
        <WebcamComponent {...props} ref={ref} />
      ));
    }),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full bg-gray-900 flex items-center justify-center">
        <div className="text-gray-400">Loading camera...</div>
      </div>
    ),
  }
);

const RecordAnswerSection: React.FC<RecordAnswerSectionProps> = ({
  mockInterviewQuestion,
  activeQuestionIndex,
  sessionId,
  onAnswerSubmitted,
}) => {
  const webcamRef = useRef<any>(null);
  const [userAnswer, setUserAnswer] = useState("");
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [loading, setLoading] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [currentQuestionId, setCurrentQuestionId] = useState<string | null>(
    null
  );

  // Ensure component is mounted on client side
  useEffect(() => {
    setIsMounted(true);
    // Check for camera permissions
    checkCameraPermissions();
  }, []);

  // Clear answer when question changes
  useEffect(() => {
    const currentQuestion = mockInterviewQuestion[activeQuestionIndex];
    if (currentQuestion && currentQuestion._id !== currentQuestionId) {
      setUserAnswer("");
      setResults([]);
      setCurrentQuestionId(currentQuestion._id);
      toast("📋 New question loaded - ready for your answer", {
        icon: "🎯",
        duration: 2000,
        id: `new-question-${sessionId}-${currentQuestion._id}`,
      });
    }
  }, [activeQuestionIndex, mockInterviewQuestion, currentQuestionId]);

  const checkCameraPermissions = async () => {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        // Actively request camera permission
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        });
        // Stop the stream immediately as we just wanted to check permissions
        stream.getTracks().forEach((track) => track.stop());
        setCameraError(null);
        toast.success("📹 Camera access granted successfully", {
          id: `camera-access-granted-${sessionId}`,
        });
      } else {
        setCameraError("Camera not supported in this browser");
      }
    } catch (error: any) {
      toast.error("❌ Camera permission error", {
        id: `camera-permission-error-${sessionId}`,
      });
      if (error.name === "NotAllowedError") {
        setCameraError(
          "Camera access denied. Please click 'Allow' when prompted for camera access, or check browser settings."
        );
      } else if (error.name === "NotFoundError") {
        setCameraError("No camera found on this device.");
      } else if (error.name === "NotReadableError") {
        setCameraError("Camera is being used by another application.");
      } else {
        setCameraError(`Camera error: ${error.message}`);
      }
    }
  };

  const toggleVideo = async () => {
    if (!isVideoOn) {
      // When turning camera on, check permissions first
      await checkCameraPermissions();
    }
    setIsVideoOn(!isVideoOn);
  };

  // Ensure react-webcam's internal stream is stopped when video is toggled off or component unmounts
  useEffect(() => {
    // When video is turned off, stop any tracks held by the webcam's video element
    if (!isVideoOn) {
      try {
        const videoEl = webcamRef.current?.video as
          | HTMLVideoElement
          | undefined;
        if (videoEl && videoEl.srcObject) {
          const so = videoEl.srcObject as MediaStream;
          so.getTracks().forEach((t) => {
            try {
              t.stop();
            } catch (e) {
              // ignore
            }
          });
          try {
            videoEl.srcObject = null;
          } catch (e) {
            // ignore
          }
          // webcam stream stopped on toggle off
        }
      } catch (e) {
        // ignore
      }
    }
  }, [isVideoOn]);

  useEffect(() => {
    return () => {
      try {
        const videoEl = webcamRef.current?.video as
          | HTMLVideoElement
          | undefined;
        if (videoEl && videoEl.srcObject) {
          const so = videoEl.srcObject as MediaStream;
          so.getTracks().forEach((t) => {
            try {
              t.stop();
            } catch (e) {
              // ignore
            }
          });
          try {
            videoEl.srcObject = null;
          } catch (e) {
            // ignore
          }
          // webcam stream stopped on unmount
        }
      } catch (e) {
        // ignore
      }
    };
  }, []);

  const {
    error,
    interimResult,
    isRecording,
    results,
    startSpeechToText,
    stopSpeechToText,
    setResults,
  } = useSpeechToText({
    continuous: true,
    useLegacyResults: false,
  });

  useEffect(() => {
    if (results && Array.isArray(results)) {
      setUserAnswer(
        results.map((result: any) => result.transcript || result).join(" ")
      );
    }
  }, [results]);

  useEffect(() => {
    if (!isRecording && userAnswer.trim().length > 10) {
      UpdateUserAnswer();
    }
  }, [userAnswer, isRecording]);

  const StartStopRecording = async () => {
    if (isRecording) {
      stopSpeechToText();
    } else {
      setUserAnswer("");
      setResults([]);
      startSpeechToText();
    }
  };

  const UpdateUserAnswer = async () => {
    if (!userAnswer.trim() || loading) return;

    // Get current question from props
    const currentQuestion = mockInterviewQuestion[activeQuestionIndex];
    if (!currentQuestion) {
      toast.error("❌ No question available", {
        id: `no-question-${sessionId}`,
      });
      return;
    }

    // Optimistic update: notify parent & clear UI immediately to reduce perceived latency
    try {
      if (onAnswerSubmitted) {
        onAnswerSubmitted({
          questionId: currentQuestion._id,
          answer: userAnswer.trim(),
        });
      }
      // Clear UI to indicate success
      setUserAnswer("");
      setResults([]);
    } catch (e) {
      console.error("Optimistic submit failed", e);
    }

    // Fire-and-forget network request to persist the answer
    (async () => {
      try {
        const token = localStorage.getItem("authToken");
        if (!token) {
          console.warn("No auth token for persisting answer");
          return;
        }

        const response = await fetch("/api/interview/answer", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            sessionId: sessionId,
            questionId: currentQuestion._id,
            answer: userAnswer.trim(),
          }),
        });

        const data = await response.json();
        if (!data.success) {
          console.warn("Server failed to persist answer", data);
          toast.error("⚠️ Failed to persist answer to server", {
            id: "answer-persist",
          });
        }
      } catch (err) {
        console.error("Network error persisting answer", err);
        toast.error("⚠️ Network error persisting answer", {
          id: "answer-persist",
        });
      }
    })();
  };

  if (error)
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-600">
        Microphone access is required for this feature. Please enable it in your
        browser settings.
      </div>
    );

  return (
    <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          {isRecording ? (
            <span className="flex items-center gap-2">
              <Circle className="text-red-500 animate-pulse" size={12} />
              Recording Answer {activeQuestionIndex + 1}
            </span>
          ) : (
            <span>
              Question {activeQuestionIndex + 1} Response
            </span>
          )}
        </h2>
        <button
          onClick={toggleVideo}
          className="text-gray-600 hover:text-gray-800 p-2 rounded-full hover:bg-gray-100"
        >
          {isVideoOn ? <Video size={20} /> : <VideoOff size={20} />}
        </button>
      </div>

      <div className="mb-4 min-h-20 p-3 bg-gray-50 rounded-lg border">
        {userAnswer ? (
          <div>
            <p className="text-gray-700 mb-2">{userAnswer}</p>
            <div className="text-xs text-gray-500 flex items-center gap-2">
              {loading && <span className="animate-pulse">Processing...</span>}
              {!loading && userAnswer.trim().length > 10 && (
                <span className="text-green-600">✓ Ready to submit</span>
              )}
            </div>
          </div>
        ) : (
          <p className="text-gray-400 italic">
            {isRecording ? "Listening..." : "Your answer will appear here"}
          </p>
        )}
      </div>

      <Button
        onClick={StartStopRecording}
        disabled={loading}
        size="lg"
        className={`w-full gap-2 ${
          isRecording
            ? "bg-red-600 hover:bg-red-700"
            : "bg-blue-600 hover:bg-blue-700"
        }`}
      >
        {isRecording ? (
          <>
            <StopCircle size={18} />
            Stop Recording
          </>
        ) : (
          <>
            <Mic size={18} />
            {loading ? "Processing..." : "Record Answer"}
          </>
        )}
      </Button>
    </div>
  );
};

export default RecordAnswerSection;
