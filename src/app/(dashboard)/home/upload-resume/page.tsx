"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Upload,
  FileText,
  Trash2,
  Calendar,
  CheckCircle,
  AlertCircle,
  Loader2,
  Plus,
  X,
} from "lucide-react";

type Resume = {
  id: string;
  fileName: string;
  uploadedAt: string;
  fileSize: number;
  status: "processing" | "completed" | "error";
  analysis?: {
    score: number;
    suggestions: string[];
    skills: string[];
  };
};

export default function UploadResumePage() {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string>("");

  // Load existing resumes on component mount
  useEffect(() => {
    loadResumes();
  }, []);

  const loadResumes = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("authToken");
      if (!token) {
        setLoading(false);
        return;
      }

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
          // Format the resumes to match our component structure
          const formattedResumes = data.resumes.map((resume: any) => ({
            id: resume.id,
            fileName: resume.file_name,
            uploadedAt: resume.createdAt,
            fileSize: resume.parsedData?.fileSize || 0,
            status: "completed" as const,
            analysis: {
              score: Math.floor(Math.random() * 30) + 70, // Mock score between 70-100
              skills: resume.parsedData?.skills || [],
              suggestions: [], // Add suggestions if available in parsedData
            },
            // No direct file URL since files aren't stored, but we have parsedData
          }));
          setResumes(formattedResumes);
        }
      }
    } catch (err) {
      console.error("Error loading resumes:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (file: File) => {
    if (file.type !== "application/pdf") {
      setError("Please upload a PDF file");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError("File size must be less than 10MB");
      return;
    }

    setSelectedFile(file);
    setError("");
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files[0]) {
      handleFileSelect(files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      handleFileSelect(files[0]);
    }
  };

  const uploadResume = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setError("");
    setUploadProgress("Uploading resume...");

    try {
      const token = localStorage.getItem("authToken");
      if (!token) {
        throw new Error("Please login to upload resume");
      }

      const formData = new FormData();
      formData.append("resume", selectedFile);

      setUploadProgress("Processing with AI...");

      const response = await fetch("/api/resume/upload", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const data = await response.json();

      if (data.success) {
        // Add new resume to the list using the actual response data
        const newResume: Resume = {
          id: data.resume.id,
          fileName: data.resume.fileName,
          uploadedAt: data.resume.createdAt,
          fileSize: selectedFile.size,
          status: "completed",
          analysis: {
            score: Math.floor(Math.random() * 30) + 70, // Mock score
            skills: data.resume.parsedData?.skills || [],
            suggestions: [], // Add if available
          },
        };

        setResumes((prev) => [newResume, ...prev]);
        setSelectedFile(null);
        setUploadProgress(`Upload completed! ${data.message}`);

        // Clear success message after 3 seconds
        setTimeout(() => setUploadProgress(""), 3000);
      } else {
        throw new Error(data.error || "Upload failed");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const deleteResume = async (id: string) => {
    try {
      const token = localStorage.getItem("authToken");
      if (!token) return;

      const response = await fetch(`/api/resume/delete/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        setResumes((prev) => prev.filter((resume) => resume.id !== id));
      }
    } catch (err) {
      console.error("Error deleting resume:", err);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-white via-gray-50 to-gray-100 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
            <div className="mb-4 lg:mb-0">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Upload className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">
                    Upload Resume
                  </h1>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                    <span className="text-xs text-blue-600 font-medium">
                      AI-Powered Analysis
                    </span>
                  </div>
                </div>
              </div>
              <p className="text-gray-600 text-sm max-w-2xl leading-relaxed">
                Upload your resume to get AI-powered feedback and analysis. Keep
                track of all your resume versions in one place.
              </p>
            </div>

            <div className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm">
              <div className="text-center">
                <p className="text-xl font-bold text-gray-900">
                  {resumes.length}
                </p>
                <p className="text-xs text-gray-600">Resumes Uploaded</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Upload Section */}
        <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">
            Upload New Resume
          </h2>

          {/* Upload Area */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive
                ? "border-blue-500 bg-blue-50"
                : "border-gray-300 hover:border-gray-400"
            }`}
            onDrop={handleDrop}
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
          >
            {selectedFile ? (
              <div className="space-y-4">
                <div className="flex items-center justify-center gap-3">
                  <FileText className="w-8 h-8 text-blue-500" />
                  <div className="text-left">
                    <p className="text-sm font-medium text-gray-900">
                      {selectedFile.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatFileSize(selectedFile.size)}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedFile(null)}
                    className="p-1 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center justify-center gap-3">
                  <button
                    onClick={uploadResume}
                    disabled={uploading}
                    className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Upload & Analyze
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        Upload & Analyze
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => setSelectedFile(null)}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <Upload className="w-12 h-12 text-gray-400 mx-auto" />
                <div>
                  <p className="text-lg font-medium text-gray-900 mb-2">
                    Drop your resume here or click to browse
                  </p>
                  <p className="text-sm text-gray-600 mb-4">
                    PDF files only, max 10MB
                  </p>
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handleFileInput}
                    className="hidden"
                    id="resume-upload"
                  />
                  <label
                    htmlFor="resume-upload"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 cursor-pointer transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Choose File
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Upload Status */}
          {uploadProgress && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2">
                {uploading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                ) : (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                )}
                <p className="text-sm font-medium text-gray-900">
                  {uploadProgress}
                </p>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600" />
                <p className="text-sm font-medium text-red-700">{error}</p>
              </div>
            </div>
          )}
        </div>

        {/* Uploaded Resumes */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-bold text-gray-900">Your Resumes</h2>
            <p className="text-sm text-gray-600 mt-1">
              Manage all your uploaded resumes
            </p>
          </div>

          {loading ? (
            <div className="p-12 text-center">
              <Loader2 className="w-12 h-12 text-blue-500 mx-auto mb-4 animate-spin" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Loading your resumes...
              </h3>
              <p className="text-gray-600">
                Please wait while we fetch your uploaded resumes
              </p>
            </div>
          ) : resumes.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No resumes uploaded yet
              </h3>
              <p className="text-gray-600">
                Upload your first resume to get started with AI analysis
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {resumes.map((resume) => (
                <div
                  key={resume.id}
                  className="p-6 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <FileText className="w-5 h-5 text-blue-600" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <Link
                            href={`/home/upload-resume/${resume.id}`}
                            className="text-base font-semibold text-blue-600 hover:text-blue-800 hover:underline truncate transition-colors"
                          >
                            {resume.fileName}
                          </Link>
                          {resume.status === "completed" && (
                            <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                          )}
                          {resume.status === "processing" && (
                            <Loader2 className="w-4 h-4 text-blue-500 animate-spin flex-shrink-0" />
                          )}
                          {resume.status === "error" && (
                            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                          )}
                        </div>

                        <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            <span>{formatDate(resume.uploadedAt)}</span>
                          </div>
                          <span>{formatFileSize(resume.fileSize)}</span>
                          {resume.analysis && (
                            <span className="text-blue-600 font-medium">
                              Score: {resume.analysis.score}/100
                            </span>
                          )}
                        </div>

                        {resume.analysis && (
                          <div className="space-y-2">
                            <div className="flex flex-wrap gap-1">
                              {resume.analysis.skills
                                .slice(0, 3)
                                .map((skill, index) => (
                                  <span
                                    key={index}
                                    className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs"
                                  >
                                    {skill}
                                  </span>
                                ))}
                              {resume.analysis.skills.length > 3 && (
                                <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs">
                                  +{resume.analysis.skills.length - 3} more
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={() => deleteResume(resume.id)}
                        className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                        title="Delete Resume"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
