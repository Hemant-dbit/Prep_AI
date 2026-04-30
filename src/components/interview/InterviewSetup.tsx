import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import ResumeUpload from "../resume/ResumeUpload";
import ResumeDisplay from "../resume/ResumeDisplay";
import toast from "react-hot-toast";
import { ButtonLoading } from "../ui/Loading";
import Loading from "../ui/Loading";
import { invalidateInterviewCache } from "@/client/lib/interviewCache";

interface InterviewSetupProps {
  interviewId?: string;
}

const InterviewSetup: React.FC<InterviewSetupProps> = ({ interviewId }) => {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [creatingInterview, setCreatingInterview] = useState(false);
  const [existingResumes, setExistingResumes] = useState<any[]>([]);
  const [selectedResume, setSelectedResume] = useState<any>(null);

  // Form data
  const [formData, setFormData] = useState({
    jobRole: "",
    jobDescription: "",
    experienceYears: "",
  });

  // Guard refs to prevent double submission/navigation
  const isSubmittingRef = useRef(false);
  const navigatedRef = useRef(false);

  useEffect(() => {
    fetchExistingResumes();

    // If we have an interviewId, fetch the interview data and populate form
    if (interviewId) {
      fetchInterviewData();
    }
  }, [interviewId]);

  const fetchInterviewData = async () => {
    try {
      const token = localStorage.getItem("authToken");
      if (!token) return;

      const response = await fetch(
        `/api/interview/sessions?sessionId=${interviewId}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.session) {
          // Populate form data with existing interview session data
          setFormData({
            jobRole: data.session.job_role || "",
            jobDescription: data.session.job_description || "",
            experienceYears: data.session.experience_years?.toString() || "",
          });

          // Set the selected resume if available
          if (data.session.Resume) {
            setSelectedResume(data.session.Resume);
          }

          // Skip to review step since data is already filled
          setCurrentStep(3);
        }
      }
    } catch (error) {
      toast.error("Failed to load interview data");
    }
  };

  const fetchExistingResumes = async () => {
    try {
      const token = localStorage.getItem("authToken");
      if (!token) return;

      const response = await fetch("/api/resume/upload", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setExistingResumes(data.resumes);
        }
      }
    } catch (error) {
      toast.error(" Failed to load existing resumes");
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleResumeUploaded = (resumeData: any) => {
    setSelectedResume(resumeData);
    setCurrentStep(3);
    // Refresh existing resumes list
    fetchExistingResumes();
  };

  const handleCreateInterview = async () => {
    // Prevent double submission/navigation
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setCreatingInterview(true);

    try {
      const token = localStorage.getItem("authToken");
      if (!token) {
        alert("Please log in to continue");
        isSubmittingRef.current = false;
        setCreatingInterview(false);
        return;
      }

      const response = await fetch("/api/interview/create", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          jobRole: formData.jobRole,
          jobDescription: formData.jobDescription,
          experienceYears: parseInt(formData.experienceYears),
          existingResumeId: selectedResume?.id,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create interview session");
      }

      const data = await response.json();
      if (data.success) {
        // Invalidate interview cache since a new interview was created
        // We're the originator — avoid triggering a global refresh callback.
        invalidateInterviewCache(false);

        // Navigate to the interview with the session ID
        // Only navigate once
        if (!navigatedRef.current) {
          navigatedRef.current = true;
          console.debug(
            "InterviewSetup: navigating to interview",
            data.data.sessionId
          );
          // await navigation so we don't clear the creating state prematurely
          // (keeps the full-screen loading visible until the router finishes)
          await router.push(`/interview/${data.data.sessionId}?session=active`);
          // navigation initiated; nothing more to do here
          return;
        }
      } else {
        throw new Error(data.error || "Failed to create interview");
      }
    } catch (error) {
      toast.error(" Failed to create interview session. Please try again.");
    } finally {
      // If we navigated away, keep creatingInterview true to avoid briefly
      // rendering the review UI; clear only when we did not navigate.
      try {
        if (!navigatedRef.current) {
          setCreatingInterview(false);
        }
      } finally {
        isSubmittingRef.current = false;
      }
    }
  };

  const isFormValid = () => {
    return (
      formData.jobRole.trim() &&
      formData.jobDescription.trim() &&
      formData.experienceYears.trim() &&
      selectedResume
    );
  };

  // Show full screen loading during interview creation
  if (creatingInterview) {
    return (
      <div className="p-100 text-center">
        <Loading size="medium" color="blue" />
        <p className="text-gray-500 mt-2">Creating your Interview Session...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          Set Up Your Interview
        </h1>
        <p className="text-gray-600">
          Complete the steps below to start your AI-powered mock interview
        </p>
      </div>

      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-center space-x-4">
          {[1, 2, 3].map((step) => (
            <div key={step} className="flex items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium ${
                  currentStep >= step
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 text-gray-600"
                }`}
              >
                {step}
              </div>
              {step < 3 && (
                <div
                  className={`w-12 h-1 mx-2 ${
                    currentStep > step ? "bg-blue-600" : "bg-gray-200"
                  }`}
                />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-center mt-2">
          <div className="text-sm text-gray-600">
            {currentStep === 1 && "Job Details"}
            {currentStep === 2 && "Resume Upload"}
            {currentStep === 3 && "Review & Start"}
          </div>
        </div>
      </div>

      {/* Step Content */}
      {currentStep === 1 && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Job Details</h2>
          <div className="space-y-4">
            <div>
              <Label htmlFor="jobRole">Job Role/Position</Label>
              <Input
                id="jobRole"
                name="jobRole"
                type="text"
                value={formData.jobRole}
                onChange={handleInputChange}
                placeholder="e.g., Frontend Developer, Data Scientist"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="experienceYears">Years of Experience</Label>
              <Input
                id="experienceYears"
                name="experienceYears"
                type="number"
                min="0"
                max="50"
                value={formData.experienceYears}
                onChange={handleInputChange}
                placeholder="e.g., 3"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="jobDescription">Job Description</Label>
              <textarea
                id="jobDescription"
                name="jobDescription"
                value={formData.jobDescription}
                onChange={handleInputChange}
                placeholder="Paste the job description here..."
                className="mt-1 w-full min-h-[120px] px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="flex justify-between mt-6 ">
            <Button
              variant="outline"
              onClick={() => router.back()}
              className="px-6 py-2"
            >
              Back
            </Button>
            <Button
              onClick={() => setCurrentStep(2)}
              disabled={
                !formData.jobRole.trim() ||
                !formData.jobDescription.trim() ||
                !formData.experienceYears.trim()
              }
              className="px-6 py-2"
            >
              Next: Upload Resume
            </Button>
          </div>
        </Card>
      )}

      {currentStep === 2 && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Resume Upload</h2>
          <p className="text-gray-600 mb-4">
            Upload your resume to get personalized interview questions based on
            your experience.
          </p>

          <ResumeUpload
            onResumeUploaded={handleResumeUploaded}
            existingResumes={existingResumes}
          />

          <div className="flex justify-between mt-6">
            <Button
              variant="outline"
              onClick={() => setCurrentStep(1)}
              className="px-6 py-2"
            >
              Back
            </Button>
            <Button
              onClick={() => setCurrentStep(3)}
              disabled={!selectedResume}
              className="px-6 py-2"
            >
              Continue Without Resume
            </Button>
          </div>
        </Card>
      )}

      {currentStep === 3 && (
        <div className="space-y-6">
          {/* Review Job Details */}
          <Card className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Job Details</h2>
              <Button
                variant="outline"
                onClick={() => setCurrentStep(1)}
                size="sm"
              >
                Edit
              </Button>
            </div>
            <div className="space-y-2">
              <p>
                <span className="font-medium">Role:</span> {formData.jobRole}
              </p>
              <p>
                <span className="font-medium">Experience:</span>{" "}
                {formData.experienceYears} years
              </p>
              <p>
                <span className="font-medium">Description:</span>
              </p>
              <p className="text-gray-700 text-sm bg-gray-50 p-3 rounded">
                {formData.jobDescription}
              </p>
            </div>
          </Card>

          {/* Review Resume */}
          {selectedResume && (
            <ResumeDisplay
              resumeData={selectedResume}
              onEdit={() => setCurrentStep(2)}
            />
          )}

          {/* Start Interview */}
          <Card className="p-6 text-center">
            <h2 className="text-xl font-semibold mb-2">Ready to Start?</h2>
            <p className="text-gray-600 mb-6">
              Your interview will include{" "}
              {selectedResume ? "personalized" : "general"} questions based on
              the job description {selectedResume ? "and your resume" : ""}.
            </p>

            <div className="flex justify-center space-x-4">
              <Button
                variant="outline"
                onClick={() => setCurrentStep(2)}
                disabled={loading || creatingInterview}
              >
                Back to Resume
              </Button>
              <Button
                onClick={handleCreateInterview}
                disabled={!isFormValid() || creatingInterview}
                className="bg-black hover:bg-black px-8 py-2 text-white"
              >
                {creatingInterview ? (
                  <>
                    <ButtonLoading size="small" />
                    <span className="ml-2">Creating Interview...</span>
                  </>
                ) : (
                  "Start Interview"
                )}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default InterviewSetup;
