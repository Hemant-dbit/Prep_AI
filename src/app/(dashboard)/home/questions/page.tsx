"use client";

import React, { useState, useEffect } from "react";
import {
  BookOpen,
  Code,
  Server,
  Cloud,
  Smartphone,
  Loader2,
  RefreshCw,
  Zap,
  Eye,
} from "lucide-react";

type QuestionCategory = {
  id: string;
  name: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  color: string;
  questionCount: number;
  description: string;
};

type Question = {
  id: string;
  question: string;
  category: string;
  difficulty: "Easy" | "Medium" | "Hard";
  timeToAnswer: string;
  tags: string[];
  isFavorite?: boolean;
};

const categories: QuestionCategory[] = [
  {
    id: "frontend",
    name: "Frontend",
    icon: Code,
    color: "bg-blue-500",
    questionCount: 0,
    description: "React, JavaScript, CSS, HTML, and frontend frameworks",
  },
  {
    id: "backend",
    name: "Backend",
    icon: Server,
    color: "bg-green-500",
    questionCount: 0,
    description: "APIs, databases, server-side development, and architecture",
  },
  {
    id: "devops",
    name: "DevOps",
    icon: Cloud,
    color: "bg-purple-500",
    questionCount: 0,
    description: "CI/CD, cloud platforms, containerization, and deployment",
  },
  {
    id: "mobile",
    name: "Mobile Development",
    icon: Smartphone,
    color: "bg-orange-500",
    questionCount: 0,
    description: "iOS, Android, React Native, and mobile app development",
  },
];

export default function QuestionBankPage() {
  const [categoryLoading, setCategoryLoading] = useState<{
    [key: string]: boolean;
  }>({});
  const [error, setError] = useState<string>("");
  const [categoryCounts, setCategoryCounts] = useState<{
    [key: string]: number;
  }>({});
  const [questions, setQuestions] = useState<{ [key: string]: Question[] }>({});

  // Fetch questions from Gemini API
  const fetchQuestions = async (category: string) => {
    setCategoryLoading((prev) => ({ ...prev, [category]: true }));
    setError("");

    try {
      const response = await fetch("/api/questions/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ category }),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch questions");
      }

      const data = await response.json();

      // Update questions and category counts
      const newQuestions = data.questions || [];
      setQuestions((prev) => ({
        ...prev,
        [category]: newQuestions,
      }));
      setCategoryCounts((prev) => ({
        ...prev,
        [category]: newQuestions.length,
      }));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch questions"
      );
    } finally {
      setCategoryLoading((prev) => ({ ...prev, [category]: false }));
    }
  };

  // Don't load questions automatically - let users generate them manually
  useEffect(() => {
    // Initialize category counts to 0
    const initialCounts: { [key: string]: number } = {};
    categories.forEach((cat) => {
      initialCounts[cat.id] = 0;
    });
    setCategoryCounts(initialCounts);
  }, []);

  const getCategoryWithCount = (cat: QuestionCategory) => ({
    ...cat,
    questionCount: categoryCounts[cat.id] || 0,
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-white via-gray-50 to-gray-100 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
            <div className="mb-4 lg:mb-0">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-gradient-to-br from-gray-900 to-gray-700 rounded-xl flex items-center justify-center shadow-lg">
                  <BookOpen className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">
                    Question Bank
                  </h1>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-xs text-green-600 font-medium">
                      AI-Powered
                    </span>
                  </div>
                </div>
              </div>
              <p className="text-gray-600 text-sm max-w-2xl leading-relaxed">
                Get ready for your next technical interview with AI-generated
                questions tailored to your expertise. Practice with
                industry-standard questions across different technology stacks.
              </p>
            </div>

            <div className="flex flex-col items-start lg:items-end">
              {Object.values(categoryLoading).some(Boolean) && (
                <div className="flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-2 rounded-lg border border-blue-200">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <div>
                    <p className="text-sm font-medium">
                      Generating questions...
                    </p>
                    <p className="text-xs text-blue-600">
                      AI is creating personalized content
                    </p>
                  </div>
                </div>
              )}

              {!Object.values(categoryLoading).some(Boolean) && (
                <div className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm">
                  <div className="text-right">
                    <p className="text-xl font-bold text-gray-900">
                      {Object.values(categoryCounts).reduce(
                        (sum, count) => sum + count,
                        0
                      )}
                    </p>
                    <p className="text-xs text-gray-600">Questions Available</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-xs">!</span>
                </div>
                <p className="text-red-700 text-sm font-medium">{error}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* How it works Section */}
        <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg p-5 border border-gray-200 mb-6">
          <div className="max-w-3xl">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">
              💡 How it works
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-gray-600">
              <div className="flex items-start space-x-2">
                <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-white text-xs font-bold">1</span>
                </div>
                <div>
                  <p className="font-medium text-gray-900 text-xs">
                    Choose Category
                  </p>
                  <p className="text-xs">Select your tech stack</p>
                </div>
              </div>
              <div className="flex items-start space-x-2">
                <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-white text-xs font-bold">2</span>
                </div>
                <div>
                  <p className="font-medium text-gray-900 text-xs">
                    Generate Questions
                  </p>
                  <p className="text-xs">AI creates 10 tailored questions</p>
                </div>
              </div>
              <div className="flex items-start space-x-2">
                <div className="w-4 h-4 bg-purple-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-white text-xs font-bold">3</span>
                </div>
                <div>
                  <p className="font-medium text-gray-900 text-xs">
                    Practice & Improve
                  </p>
                  <p className="text-xs">Prepare for your interviews</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Category Cards */}
        <div className="mb-6">
          <div className="mb-4">
            <h2 className="text-lg font-bold text-gray-900 mb-2">
              Choose Your Tech Stack
            </h2>
            <p className="text-gray-600 text-sm">
              Select a category to generate AI-powered interview questions
              tailored to your expertise
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {categories.map((category) => {
              const categoryWithCount = getCategoryWithCount(category);
              const isLoading = categoryLoading[category.id];
              const hasQuestions = categoryWithCount.questionCount > 0;

              return (
                <div
                  key={category.id}
                  className="group bg-white rounded-lg p-5 border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all duration-300 hover:-translate-y-1"
                >
                  <div className="flex items-start space-x-4">
                    {/* Icon Section */}
                    <div
                      className={`w-12 h-12 ${category.color} rounded-lg flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform duration-300`}
                    >
                      <category.icon className="w-6 h-6 text-white" />
                    </div>

                    {/* Content Section */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-base font-bold text-gray-900">
                          {category.name}
                        </h3>
                        {hasQuestions && (
                          <div className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-semibold">
                            {categoryWithCount.questionCount} Ready
                          </div>
                        )}
                      </div>

                      <p className="text-gray-600 mb-3 text-xs leading-relaxed">
                        {category.description}
                      </p>

                      <div className="flex items-center justify-between">
                        <div className="text-xs text-gray-500">
                          {hasQuestions
                            ? `${categoryWithCount.questionCount} questions generated`
                            : "No questions yet"}
                        </div>

                        <div className="flex items-center gap-2">
                          {hasQuestions && (
                            <button
                              onClick={() =>
                                window.open(
                                  `/home/questions/view?category=${category.id}`,
                                  "_blank"
                                )
                              }
                              className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors"
                            >
                              <Eye className="w-3 h-3" />
                              View
                            </button>
                          )}

                          <button
                            onClick={() => fetchQuestions(category.id)}
                            disabled={isLoading}
                            className={`flex items-center gap-1 px-3 py-1 rounded-md text-xs font-semibold transition-all duration-200 ${
                              hasQuestions
                                ? "bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300"
                                : "bg-gradient-to-r from-gray-900 to-gray-700 text-white hover:from-gray-800 hover:to-gray-600 shadow-sm hover:shadow-md"
                            } ${
                              isLoading
                                ? "opacity-50 cursor-not-allowed"
                                : "hover:scale-105"
                            }`}
                          >
                            {isLoading ? (
                              <>
                                <Loader2 className="w-3 h-3 animate-spin" />
                                Generating...
                              </>
                            ) : hasQuestions ? (
                              <>
                                <RefreshCw className="w-3 h-3" />
                                Refresh
                              </>
                            ) : (
                              <>
                                <Zap className="w-3 h-3" />
                                Generate
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
