import React, { useState } from "react";
import { Button } from "../ui/button";
import { resumeService } from "@/client/services/resume.service";
import { Card } from "../ui/card";
import toast from "react-hot-toast";
import { ButtonLoading, InlineLoading } from "../ui/Loading";

interface ResumeUploadProps {
  onResumeUploaded: (resumeData: any) => void;
  existingResumes?: any[];
}

const ResumeUpload: React.FC<ResumeUploadProps> = ({
  onResumeUploaded,
  existingResumes = [],
}) => {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [uploadStage, setUploadStage] = useState<string>("");
  const [dragActive, setDragActive] = useState(false);

  const handleFileUpload = async (file: File) => {
    if (!file) return;

    if (file.type !== "application/pdf") {
      toast.error("Please upload a PDF file");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      // 10MB limit
      toast.error("File size must be less than 10MB");
      return;
    }

    setUploading(true);
    setUploadError(null);
    setUploadSuccess(null);
    setUploadStage("Uploading resume...");
    toast.loading("📂 Starting resume upload...", { id: "upload-progress" });

    try {
      const formData = new FormData();
      formData.append("resume", file);
      formData.append("fileName", file.name);

      setUploadStage("Uploading file to server...");
      toast.loading("📤 Uploading file to server...", {
        id: "upload-progress",
      });

      const data: any = await resumeService.upload(formData);

      if (data.success) {
        setUploadStage("Parsing resume data...");
        toast.loading("🤖 Parsing resume data with AI...", {
          id: "upload-progress",
        });

        // Small delay to show the parsing stage
        setTimeout(() => {
          setUploadSuccess(
            `Resume "${file.name}" uploaded and parsed successfully!`
          );
          setUploadStage("");
          toast.success(
            ` Resume uploaded successfully! Extracted ${
              data.resume.parsedData?.skills?.length || 0
            } skills`,
            { id: "upload-progress" }
          );
          onResumeUploaded(data.resume);

          // Clear success message after 5 seconds
          setTimeout(() => setUploadSuccess(null), 5000);
        }, 1000);
      } else {
        toast.error(data.error || "Upload failed");
        throw new Error(data.error || "Upload failed");
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Upload failed";
      toast.error(` ${errorMessage}`, { id: "upload-progress" });
      setUploadError(errorMessage);
      setUploadStage("");

      // Clear error message after 10 seconds
      setTimeout(() => setUploadError(null), 10000);
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const handleExistingResumeSelect = (resumeId: string) => {
    const selectedResume = existingResumes.find((r) => r.id === resumeId);
    if (selectedResume) {
      onResumeUploaded(selectedResume);
    }
  };

  return (
    <div className="w-full space-y-4">
      {/* Existing Resumes */}
      {existingResumes.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3">Use Existing Resume</h3>
          <div className="grid gap-3 mb-4">
            {existingResumes.map((resume) => (
              <Card key={resume.id} className="p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-medium">{resume.file_name}</h4>
                    <p className="text-sm text-gray-600">
                      {resume.parsedData?.name &&
                        `${resume.parsedData.name} • `}
                      Uploaded {new Date(resume.createdAt).toLocaleDateString()}
                    </p>
                    {resume.parsedData?.skills &&
                      resume.parsedData.skills.length > 0 && (
                        <p className="text-sm text-gray-500 mt-1">
                          Skills:{" "}
                          {resume.parsedData.skills.slice(0, 3).join(", ")}
                          {resume.parsedData.skills.length > 3 && "..."}
                        </p>
                      )}
                  </div>
                  <Button
                    onClick={() => handleExistingResumeSelect(resume.id)}
                    variant="outline"
                    size="sm"
                  >
                    Use This Resume
                  </Button>
                </div>
              </Card>
            ))}
          </div>
          <div className="text-center text-gray-500 mb-4">or</div>
        </div>
      )}

      {/* Upload New Resume */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Upload New Resume</h3>
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragActive
              ? "border-blue-400 bg-blue-50"
              : uploadError
              ? "border-red-300 bg-red-50"
              : "border-gray-300 hover:border-gray-400"
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
        >
          {uploading ? (
            <div className="py-4">
              <div className="flex items-center justify-center mb-4">
                <InlineLoading />
                <div className="text-left ml-3">
                  <p className="text-blue-600 font-medium">Processing Resume</p>
                  <p className="text-sm text-gray-600">{uploadStage}</p>
                </div>
              </div>

              {/* Progress steps */}
              <div className="max-w-md mx-auto">
                <div className="flex justify-between text-xs text-gray-500 mb-2">
                  <span
                    className={
                      uploadStage.includes("Uploading")
                        ? "text-blue-600 font-medium"
                        : ""
                    }
                  >
                    Upload
                  </span>
                  <span
                    className={
                      uploadStage.includes("Processing")
                        ? "text-blue-600 font-medium"
                        : ""
                    }
                  >
                    Extract
                  </span>
                  <span
                    className={
                      uploadStage.includes("Parsing")
                        ? "text-blue-600 font-medium"
                        : ""
                    }
                  >
                    Parse
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1">
                  <div
                    className="bg-blue-600 h-1 rounded-full transition-all duration-500"
                    style={{
                      width: uploadStage.includes("Uploading")
                        ? "33%"
                        : uploadStage.includes("Processing")
                        ? "66%"
                        : uploadStage.includes("Parsing")
                        ? "100%"
                        : "0%",
                    }}
                  ></div>
                </div>
              </div>
            </div>
          ) : (
            <div>
              <svg
                className="mx-auto h-12 w-12 text-gray-400 mb-4"
                stroke="currentColor"
                fill="none"
                viewBox="0 0 48 48"
              >
                <path
                  d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <p className="text-lg mb-2">
                Drop your resume here, or{" "}
                <label className="text-blue-600 hover:text-blue-700 cursor-pointer">
                  browse
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handleFileInputChange}
                    className="sr-only"
                    suppressHydrationWarning
                  />
                </label>
              </p>
              <p className="text-sm text-gray-500">PDF files up to 10MB</p>
            </div>
          )}
        </div>

        {/* Success Message */}
        {uploadSuccess && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-green-400"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-green-800 font-medium">Success!</p>
                <p className="text-green-700 text-sm">{uploadSuccess}</p>
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {uploadError && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-red-400"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-red-800 font-medium">Upload Error</p>
                <p className="text-red-700 text-sm">{uploadError}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResumeUpload;
