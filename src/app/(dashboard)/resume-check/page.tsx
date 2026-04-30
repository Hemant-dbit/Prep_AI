"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

interface AnalysisResult {
  overallScore: number;
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  detailedAnalysis: {
    formatting: number;
    content: number;
    skills: number;
    experience: number;
    keywords: number;
  };
}

export default function ResumeCheckPage() {
  const router = useRouter();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(
    null
  );
  const [jobDescription, setJobDescription] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (file: File) => {
    if (file.type !== "application/pdf") {
      toast.error(" Please upload a PDF file only");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error(" File size must be less than 10MB");
      return;
    }

    setUploadedFile(file);
    toast.success("📄 Resume uploaded successfully!");
  };

  const handleAnalyzeResume = async () => {
    if (!uploadedFile) {
      toast.error(" Please upload a resume first");
      return;
    }

    setIsAnalyzing(true);
    toast.loading("🔍 Analyzing your resume...", { id: "analyzing" });

    try {
      const formData = new FormData();
      formData.append("resume", uploadedFile);
      formData.append("jobDescription", jobDescription);

      const token = localStorage.getItem("authToken");
      const response = await fetch("/api/resume/analyze", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        setAnalysisResult(data.analysis);
        toast.success(" Resume analysis completed!", { id: "analyzing" });
      } else {
        toast.error("❌ " + (data.error || "Analysis failed"), {
          id: "analyzing",
        });
      }
    } catch (error) {
      console.error("Analysis error:", error);
      toast.error("❌ Failed to analyze resume", { id: "analyzing" });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-blue-600";
    if (score >= 40) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-6">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="mb-4 text-blue-600 hover:text-blue-800 flex items-center gap-2"
          >
            ← Back to Dashboard
          </button>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Resume Analysis
          </h1>
          <p className="text-gray-600">
            Upload your resume and get AI-powered feedback to improve your
            chances
          </p>
        </div>

        {!analysisResult ? (
          /* Upload Section */
          <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
            <div className="space-y-6">
              {/* Resume Upload - Drag & Drop */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Resume (PDF) *
                </label>
                <div
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                    dragActive
                      ? "border-blue-500 bg-blue-50"
                      : uploadedFile
                      ? "border-green-400 bg-green-50"
                      : "border-gray-300 hover:border-blue-400"
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handleChange}
                    className="hidden"
                    id="resume-upload"
                    suppressHydrationWarning
                  />
                  <label htmlFor="resume-upload" className="cursor-pointer">
                    <div className="flex flex-col items-center">
                      {uploadedFile ? (
                        <div className="text-green-600">
                          <svg
                            className="h-16 w-16 mb-4 mx-auto"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                          <p className="text-xl font-semibold mb-2">
                            Resume Uploaded!
                          </p>
                          <p className="text-sm font-medium">
                            {uploadedFile.name}
                          </p>
                          <p className="text-sm text-gray-500 mt-1">
                            Click to change file
                          </p>
                        </div>
                      ) : (
                        <div className="text-gray-400">
                          <svg
                            className="h-16 w-16 mb-4 mx-auto"
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
                          <p className="text-xl font-semibold text-gray-700 mb-2">
                            Drag & drop your resume here
                          </p>
                          <p className="text-gray-500 mb-2">or</p>
                          <p className="bg-blue-600 text-white px-4 py-2 rounded-lg inline-block hover:bg-blue-700 transition-colors">
                            Browse Files
                          </p>
                          <p className="text-xs text-gray-400 mt-3">
                            PDF files only, max 10MB
                          </p>
                        </div>
                      )}
                    </div>
                  </label>
                </div>
              </div>

              {/* Job Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Job Description (Optional)
                </label>
                <textarea
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={6}
                  placeholder="Paste the job description here to get targeted analysis..."
                />
                <p className="text-xs text-gray-500 mt-1">
                  Adding a job description will provide more targeted feedback
                </p>
              </div>

              {/* Analyze Button */}
              <button
                onClick={handleAnalyzeResume}
                disabled={!uploadedFile || isAnalyzing}
                className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {isAnalyzing ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                    Analyzing Resume...
                  </span>
                ) : (
                  "Analyze Resume"
                )}
              </button>
            </div>
          </div>
        ) : (
          /* Results Section */
          <div className="space-y-6">
            {/* Overall Score */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="text-center">
                <div
                  className={`text-6xl font-bold mb-2 ${getScoreColor(
                    analysisResult.overallScore
                  )}`}
                >
                  {analysisResult.overallScore}
                </div>
                <div className="text-xl text-gray-600 mb-4">Overall Score</div>
                <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
                  <div
                    className={`h-3 rounded-full ${
                      analysisResult.overallScore >= 80
                        ? "bg-green-500"
                        : analysisResult.overallScore >= 60
                        ? "bg-blue-500"
                        : analysisResult.overallScore >= 40
                        ? "bg-yellow-500"
                        : "bg-red-500"
                    }`}
                    style={{ width: `${analysisResult.overallScore}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Detailed Scores */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold mb-4">Detailed Analysis</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(analysisResult.detailedAnalysis).map(
                  ([key, score]) => (
                    <div
                      key={key}
                      className="flex items-center justify-between"
                    >
                      <span className="capitalize text-gray-700">{key}:</span>
                      <span className={`font-semibold ${getScoreColor(score)}`}>
                        {score}/100
                      </span>
                    </div>
                  )
                )}
              </div>
            </div>

            {/* Strengths */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold mb-4 text-green-600">
                ✅ Strengths
              </h3>
              <ul className="space-y-2">
                {analysisResult.strengths.map((strength, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-green-500 mt-1">•</span>
                    <span className="text-gray-700">{strength}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Areas for Improvement */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold mb-4 text-orange-600">
                ⚠️ Areas for Improvement
              </h3>
              <ul className="space-y-2">
                {analysisResult.weaknesses.map((weakness, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-orange-500 mt-1">•</span>
                    <span className="text-gray-700">{weakness}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Suggestions */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold mb-4 text-blue-600">
                💡 Suggestions
              </h3>
              <ul className="space-y-2">
                {analysisResult.suggestions.map((suggestion, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-blue-500 mt-1">•</span>
                    <span className="text-gray-700">{suggestion}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4">
              <button
                onClick={() => {
                  setAnalysisResult(null);
                  setUploadedFile(null);
                  setJobDescription("");
                }}
                className="flex-1 bg-gray-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-gray-700 transition-colors"
              >
                Analyze Another Resume
              </button>
              <button
                onClick={() => router.push("/interview/setup")}
                className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Start Interview Prep
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
