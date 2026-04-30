"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  FileText,
  User,
  Mail,
  Phone,
  Calendar,
  MapPin,
  Briefcase,
  GraduationCap,
  Code,
  Star,
  CheckCircle,
  AlertCircle,
  Target,
  TrendingUp,
  TrendingDown,
  Download,
  Share2,
  Edit,
  ExternalLink,
} from "lucide-react";

type ResumeDetails = {
  id: string;
  fileName: string;
  uploadedAt: string;
  parsedData: {
    name: string;
    email: string;
    phone: string;
    skills: string[];
    experience: Array<{
      company: string;
      position: string;
      duration: string;
      description: string;
    }>;
    projects: Array<{
      name: string;
      description: string;
      technologies: string[];
      duration?: string;
      link?: string;
    }>;
    education: Array<{
      institution: string;
      degree: string;
      field: string;
      year: string;
    }>;
    summary: string;
  };
};

export default function ResumeDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const [resume, setResume] = useState<ResumeDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    if (params.id) {
      fetchResumeDetails(params.id as string);
    }
  }, [params.id]);

  const fetchResumeDetails = async (resumeId: string) => {
    try {
      setLoading(true);
      const token = localStorage.getItem("authToken");
      if (!token) return;

      const response = await fetch(`/api/resume/details/${resumeId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setResume(data.resume);
          toast.success("Resume details loaded successfully!", {
            duration: 3000,
            position: "top-right",
          });
        } else {
          setError(data.error || "Failed to load resume details");
          toast.error("Failed to load resume details");
        }
      } else {
        setError("Failed to load resume details");
        toast.error("Failed to load resume details");
      }
    } catch (err) {
      setError("Error loading resume details");
      console.error("Error fetching resume details:", err);
    } finally {
      setLoading(false);
    }
  };

  const generateSuggestions = (resume: ResumeDetails) => {
    const suggestions = [];

    if (!resume.parsedData.email) {
      suggestions.push(
        "Add a professional email address to your contact information"
      );
    }

    if (!resume.parsedData.phone) {
      suggestions.push("Include a phone number for easy contact");
    }

    if (resume.parsedData.skills.length < 5) {
      suggestions.push(
        "Consider adding more relevant technical skills to showcase your expertise"
      );
    }

    if (resume.parsedData.projects.length < 2) {
      suggestions.push(
        "Add more projects to demonstrate your hands-on experience"
      );
    }

    if (resume.parsedData.summary.length < 100) {
      suggestions.push(
        "Expand your professional summary to better highlight your strengths"
      );
    }

    return suggestions;
  };

  const calculateScore = (resume: ResumeDetails) => {
    let score = 0;

    // Contact information (20 points)
    if (resume.parsedData.name) score += 5;
    if (resume.parsedData.email) score += 5;
    if (resume.parsedData.phone) score += 5;
    if (resume.parsedData.summary) score += 5;

    // Skills (25 points)
    score += Math.min(resume.parsedData.skills.length * 3, 25);

    // Experience (25 points)
    score += Math.min(resume.parsedData.experience.length * 8, 25);

    // Projects (20 points)
    score += Math.min(resume.parsedData.projects.length * 10, 20);

    // Education (10 points)
    score += Math.min(resume.parsedData.education.length * 5, 10);

    return Math.min(score, 100);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading resume details...</p>
        </div>
      </div>
    );
  }

  if (error || !resume) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Error Loading Resume
          </h3>
          <p className="text-gray-600 mb-4">{error || "Resume not found"}</p>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const score = calculateScore(resume);
  const suggestions = generateSuggestions(resume);

  return (
    <div className="min-h-screen">
      {/* Enhanced Header */}
      <div className=" bg-gray-100 text-black">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold mb-1">{resume.fileName}</h1>
                <div className="flex items-center gap-4 text-black">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    <span className="text-sm">
                      Uploaded{" "}
                      {new Date(resume.uploadedAt).toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-sm">AI Analyzed</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Horizontal Layout */}
      <div className="h-[calc(100vh-200px)] overflow-hidden">
        <div className="max-w-full mx-auto px-6 py-4 h-full">
          <div className="flex gap-6 h-full">
            {/* Left Section - Score and Suggestions */}
            <div className="w-80 flex-shrink-0 space-y-4">
              {/* Compact Score Card */}
              <div className="bg-gradient-to-br from-white to-blue-50/30 rounded-xl p-4 border border-blue-100 shadow-lg">
                <div className="text-center">
                  <div className="relative w-20 h-20 mx-auto mb-3">
                    <svg
                      className="w-20 h-20 transform -rotate-90"
                      viewBox="0 0 36 36"
                    >
                      <path
                        className="text-gray-200"
                        stroke="currentColor"
                        strokeWidth="3"
                        fill="transparent"
                        d="M18,2.0845 a 15.9155,15.9155 0 0,1 0,31.831 a 15.9155,15.9155 0 0,1 0,-31.831"
                      />
                      <path
                        className={
                          score >= 80
                            ? "text-green-500"
                            : score >= 60
                            ? "text-amber-500"
                            : "text-red-500"
                        }
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeDasharray={`${score}, 100`}
                        strokeLinecap="round"
                        fill="transparent"
                        d="M18,2.0845 a 15.9155,15.9155 0 0,1 0,31.831 a 15.9155,15.9155 0 0,1 0,-31.831"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-xl font-bold text-gray-900">
                        {score}
                      </span>
                      <span className="text-xs text-gray-500">/ 100</span>
                    </div>
                  </div>
                  <h3
                    className={`text-sm font-semibold ${
                      score >= 80
                        ? "text-green-600"
                        : score >= 60
                        ? "text-amber-600"
                        : "text-red-600"
                    }`}
                  >
                    {score >= 80
                      ? "Excellent!"
                      : score >= 60
                      ? "Good"
                      : "Needs Work"}
                  </h3>
                  <p className="text-xs text-gray-600 mt-1">Resume Score</p>
                </div>
              </div>

              {/* Compact Suggestions Card */}
              <div className="bg-gradient-to-br from-white to-orange-50/30 rounded-xl p-4 border border-orange-100 shadow-lg flex-1 overflow-y-auto">
                <div className="flex items-center gap-2 mb-3">
                  <Target className="w-4 h-4 text-orange-600" />
                  <h3 className="text-sm font-semibold text-gray-900">
                    Suggestions
                  </h3>
                </div>
                <div className="space-y-2">
                  {suggestions.length > 0 ? (
                    suggestions.slice(0, 3).map((suggestion, index) => (
                      <div
                        key={index}
                        className="flex items-start gap-2 p-2 bg-white/70 rounded-lg border border-orange-100"
                      >
                        <div className="w-4 h-4 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-xs font-semibold text-orange-600">
                            {index + 1}
                          </span>
                        </div>
                        <p className="text-xs text-gray-700 leading-relaxed">
                          {suggestion}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="flex items-center gap-2 p-2 bg-green-50 rounded-lg border border-green-200">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <p className="text-xs font-medium text-green-800">
                        Outstanding!
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Section - Resume Details */}
            <div className="flex-1 overflow-y-auto">
              <div className="grid grid-cols-2 gap-4 h-full">
                {/* Contact Information - Column 1 */}
                <div className="space-y-4">
                  <div className="bg-gradient-to-r from-white to-blue-50/30 rounded-xl p-4 border border-blue-100 shadow-lg">
                    <div className="flex items-center gap-2 mb-3">
                      <User className="w-4 h-4 text-blue-600" />
                      <h3 className="text-sm font-semibold text-gray-900">
                        Contact
                      </h3>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <User className="w-3 h-3 text-gray-400" />
                        <div>
                          <p className="text-xs text-gray-500">Name</p>
                          <p className="text-sm font-medium text-gray-900">
                            {resume.parsedData.name || "Not specified"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Mail className="w-3 h-3 text-gray-400" />
                        <div>
                          <p className="text-xs text-gray-500">Email</p>
                          <p className="text-sm font-medium text-gray-900">
                            {resume.parsedData.email || "Not specified"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="w-3 h-3 text-gray-400" />
                        <div>
                          <p className="text-xs text-gray-500">Phone</p>
                          <p className="text-sm font-medium text-gray-900">
                            {resume.parsedData.phone || "Not specified"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Professional Summary */}
                  {resume.parsedData.summary && (
                    <div className="bg-gradient-to-r from-white to-purple-50/30 rounded-xl p-4 border border-purple-100 shadow-lg">
                      <div className="flex items-center gap-2 mb-3">
                        <FileText className="w-4 h-4 text-purple-600" />
                        <h3 className="text-sm font-semibold text-gray-900">
                          Summary
                        </h3>
                      </div>
                      <div className="bg-white/70 rounded-lg p-3 border border-purple-100">
                        <p className="text-xs text-gray-700 leading-relaxed line-clamp-4">
                          {resume.parsedData.summary}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Skills and Experience - Column 2 */}
                <div className="space-y-4">
                  {/* Skills */}
                  {resume.parsedData.skills.length > 0 && (
                    <div className="bg-gradient-to-r from-white to-green-50/30 rounded-xl p-4 border border-green-100 shadow-lg">
                      <div className="flex items-center gap-2 mb-3">
                        <Code className="w-4 h-4 text-green-600" />
                        <h3 className="text-sm font-semibold text-gray-900">
                          Skills ({resume.parsedData.skills.length})
                        </h3>
                      </div>
                      <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                        {resume.parsedData.skills
                          .slice(0, 12)
                          .map((skill, index) => (
                            <div
                              key={index}
                              className="flex items-center gap-1 px-2 py-1 bg-white/70 rounded-lg border border-green-100"
                            >
                              <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                              <span className="text-xs font-medium text-gray-700 truncate">
                                {skill}
                              </span>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Experience */}
                  {resume.parsedData.experience.length > 0 && (
                    <div className="bg-gradient-to-r from-white to-purple-50/30 rounded-xl p-4 border border-purple-100 shadow-lg flex-1 overflow-y-auto">
                      <div className="flex items-center gap-2 mb-3">
                        <Briefcase className="w-4 h-4 text-purple-600" />
                        <h3 className="text-sm font-semibold text-gray-900">
                          Experience ({resume.parsedData.experience.length})
                        </h3>
                      </div>
                      <div className="space-y-3 max-h-40 overflow-y-auto">
                        {resume.parsedData.experience
                          .slice(0, 3)
                          .map((exp, index) => (
                            <div
                              key={index}
                              className="bg-white/70 rounded-lg p-3 border border-purple-100"
                            >
                              <div className="flex items-start justify-between mb-2">
                                <div>
                                  <h4 className="font-semibold text-gray-900 text-sm">
                                    {exp.position}
                                  </h4>
                                  <p className="text-purple-600 font-medium text-xs">
                                    {exp.company}
                                  </p>
                                </div>
                                <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                                  {exp.duration}
                                </span>
                              </div>
                              <p className="text-xs text-gray-700 leading-relaxed line-clamp-2">
                                {exp.description}
                              </p>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Projects */}
                  {resume.parsedData.projects.length > 0 && (
                    <div className="bg-gradient-to-r from-white to-yellow-50/30 rounded-xl p-4 border border-yellow-100 shadow-lg">
                      <div className="flex items-center gap-2 mb-3">
                        <Star className="w-4 h-4 text-yellow-600" />
                        <h3 className="text-sm font-semibold text-gray-900">
                          Projects ({resume.parsedData.projects.length})
                        </h3>
                      </div>
                      <div className="space-y-3 max-h-32 overflow-y-auto">
                        {resume.parsedData.projects
                          .slice(0, 2)
                          .map((project, index) => (
                            <div
                              key={index}
                              className="bg-white/70 rounded-lg p-3 border border-yellow-100"
                            >
                              <h4 className="font-semibold text-gray-900 text-sm mb-1">
                                {project.name}
                              </h4>
                              <p className="text-xs text-gray-700 leading-relaxed line-clamp-2 mb-2">
                                {project.description}
                              </p>
                              <div className="flex flex-wrap gap-1">
                                {project.technologies
                                  .slice(0, 3)
                                  .map((tech, techIndex) => (
                                    <span
                                      key={techIndex}
                                      className="text-xs bg-yellow-200/50 text-yellow-800 px-2 py-1 rounded"
                                    >
                                      {tech}
                                    </span>
                                  ))}
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Education */}
                  {resume.parsedData.education.length > 0 && (
                    <div className="bg-gradient-to-r from-white to-indigo-50/30 rounded-xl p-4 border border-indigo-100 shadow-lg">
                      <div className="flex items-center gap-2 mb-3">
                        <GraduationCap className="w-4 h-4 text-indigo-600" />
                        <h3 className="text-sm font-semibold text-gray-900">
                          Education ({resume.parsedData.education.length})
                        </h3>
                      </div>
                      <div className="space-y-3 max-h-24 overflow-y-auto">
                        {resume.parsedData.education
                          .slice(0, 2)
                          .map((edu, index) => (
                            <div
                              key={index}
                              className="bg-white/70 rounded-lg p-3 border border-indigo-100"
                            >
                              <div className="flex items-start justify-between">
                                <div>
                                  <h4 className="font-semibold text-gray-900 text-sm">
                                    {edu.degree}
                                  </h4>
                                  <p className="text-indigo-600 font-medium text-xs">
                                    {edu.institution}
                                  </p>
                                  <p className="text-gray-600 text-xs">
                                    {edu.field}
                                  </p>
                                </div>
                                <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full">
                                  {edu.year}
                                </span>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
