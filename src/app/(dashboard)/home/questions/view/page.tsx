"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  BookOpen,
  Code,
  Server,
  Cloud,
  Smartphone,
  Clock,
  Download,
  ArrowLeft,
  Star,
  ChevronDown,
  ChevronUp,
  FileText,
  Loader2,
} from "lucide-react";

type Question = {
  id: string;
  question: string;
  category: string;
  difficulty: "Easy" | "Medium" | "Hard";
  timeToAnswer: string;
  tags: string[];
  isFavorite?: boolean;
};

type QuestionCategory = {
  id: string;
  name: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  color: string;
  description: string;
};

const categories: QuestionCategory[] = [
  {
    id: "frontend",
    name: "Frontend",
    icon: Code,
    color: "bg-blue-500",
    description: "React, JavaScript, CSS, HTML, and frontend frameworks",
  },
  {
    id: "backend",
    name: "Backend",
    icon: Server,
    color: "bg-green-500",
    description: "APIs, databases, server-side development, and architecture",
  },
  {
    id: "devops",
    name: "DevOps",
    icon: Cloud,
    color: "bg-purple-500",
    description: "CI/CD, cloud platforms, containerization, and deployment",
  },
  {
    id: "mobile",
    name: "Mobile Development",
    icon: Smartphone,
    color: "bg-orange-500",
    description: "iOS, Android, React Native, and mobile app development",
  },
];

function ViewQuestionsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const category = searchParams.get("category");

  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [expandedQuestion, setExpandedQuestion] = useState<string | null>(null);
  const [downloadingPDF, setDownloadingPDF] = useState(false);

  const currentCategory = categories.find((c) => c.id === category);

  useEffect(() => {
    if (!category) {
      router.push("/home/questions");
      return;
    }
    fetchQuestions();
  }, [category]);

  const fetchQuestions = async () => {
    if (!category) return;

    setLoading(true);
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
      setQuestions(data.questions || []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch questions"
      );
    } finally {
      setLoading(false);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "Easy":
        return "text-green-600 bg-green-100 border-green-200";
      case "Medium":
        return "text-yellow-600 bg-yellow-100 border-yellow-200";
      case "Hard":
        return "text-red-600 bg-red-100 border-red-200";
      default:
        return "text-gray-600 bg-gray-100 border-gray-200";
    }
  };

  const downloadPDF = async () => {
    if (!questions.length || !currentCategory) return;

    setDownloadingPDF(true);

    try {
      // Import jsPDF dynamically
      const jsPDF = (await import("jspdf")).default;
      const doc = new jsPDF();

      // Set up the document
      const pageWidth = doc.internal.pageSize.width;
      const pageHeight = doc.internal.pageSize.height;
      const margin = 20;
      const maxWidth = pageWidth - margin * 2;
      let yPosition = margin;

      // Add title
      doc.setFontSize(20);
      doc.setFont("helvetica", "bold");
      doc.text(
        `${currentCategory.name} Interview Questions`,
        margin,
        yPosition
      );
      yPosition += 15;

      // Add subtitle
      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      doc.text(
        `Generated on ${new Date().toLocaleDateString()}`,
        margin,
        yPosition
      );
      yPosition += 10;
      doc.text(`Total Questions: ${questions.length}`, margin, yPosition);
      yPosition += 20;

      // Add questions
      questions.forEach((question, index) => {
        // Check if we need a new page
        if (yPosition > pageHeight - 60) {
          doc.addPage();
          yPosition = margin;
        }

        // Question number and difficulty
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text(`Question ${index + 1}`, margin, yPosition);

        // Difficulty badge
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text(
          `[${question.difficulty}] • ${question.timeToAnswer}`,
          margin + 60,
          yPosition
        );
        yPosition += 10;

        // Question text
        doc.setFontSize(11);
        doc.setFont("helvetica", "normal");
        const questionLines = doc.splitTextToSize(question.question, maxWidth);
        doc.text(questionLines, margin, yPosition);
        yPosition += questionLines.length * 5 + 5;

        // Tags
        if (question.tags.length > 0) {
          doc.setFontSize(9);
          doc.setFont("helvetica", "italic");
          doc.text(`Tags: ${question.tags.join(", ")}`, margin, yPosition);
          yPosition += 8;
        }

        yPosition += 10; // Space between questions
      });

      // Save the PDF
      doc.save(`${currentCategory.name.toLowerCase()}-interview-questions.pdf`);
    } catch (err) {
      console.error("Error generating PDF:", err);
      setError("Failed to generate PDF. Please try again.");
    } finally {
      setDownloadingPDF(false);
    }
  };

  if (!currentCategory) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push("/home/questions")}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>

              <div className="flex items-center gap-3">
                <div
                  className={`w-12 h-12 ${currentCategory.color} rounded-xl flex items-center justify-center`}
                >
                  <currentCategory.icon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    {currentCategory.name} Questions
                  </h1>
                  <p className="text-gray-600">{currentCategory.description}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={fetchQuestions}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                <Loader2
                  className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
                />
                Refresh
              </button>

              {questions.length > 0 && (
                <button
                  onClick={downloadPDF}
                  disabled={downloadingPDF}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {downloadingPDF ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  Download PDF
                </button>
              )}
            </div>
          </div>

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <Loader2 className="w-12 h-12 text-gray-400 mx-auto mb-4 animate-spin" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Loading questions...
              </h3>
              <p className="text-gray-600">
                AI is generating personalized questions for you.
              </p>
            </div>
          </div>
        ) : questions.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No questions available
              </h3>
              <p className="text-gray-600 mb-4">
                Click refresh to generate new questions.
              </p>
              <button
                onClick={fetchQuestions}
                className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
              >
                Generate Questions
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className="mb-8">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl p-4 border border-gray-200">
                  <div className="text-2xl font-bold text-gray-900">
                    {questions.length}
                  </div>
                  <div className="text-sm text-gray-600">Total Questions</div>
                </div>
                <div className="bg-white rounded-xl p-4 border border-gray-200">
                  <div className="text-2xl font-bold text-green-600">
                    {questions.filter((q) => q.difficulty === "Easy").length}
                  </div>
                  <div className="text-sm text-gray-600">Easy</div>
                </div>
                <div className="bg-white rounded-xl p-4 border border-gray-200">
                  <div className="text-2xl font-bold text-yellow-600">
                    {questions.filter((q) => q.difficulty === "Medium").length}
                  </div>
                  <div className="text-sm text-gray-600">Medium</div>
                </div>
                <div className="bg-white rounded-xl p-4 border border-gray-200">
                  <div className="text-2xl font-bold text-red-600">
                    {questions.filter((q) => q.difficulty === "Hard").length}
                  </div>
                  <div className="text-sm text-gray-600">Hard</div>
                </div>
              </div>
            </div>

            {/* Questions */}
            <div className="space-y-6">
              {questions.map((question, index) => (
                <div
                  key={question.id}
                  className="bg-white rounded-xl p-6 border border-gray-200 hover:border-gray-300 transition-colors"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center text-sm font-bold text-gray-700">
                        {index + 1}
                      </div>
                      <div className="flex items-center gap-3">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium border ${getDifficultyColor(
                            question.difficulty
                          )}`}
                        >
                          {question.difficulty}
                        </span>
                        <div className="flex items-center gap-1 text-gray-500">
                          <Clock className="w-4 h-4" />
                          <span className="text-sm">
                            {question.timeToAnswer}
                          </span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() =>
                        setExpandedQuestion(
                          expandedQuestion === question.id ? null : question.id
                        )
                      }
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      {expandedQuestion === question.id ? (
                        <ChevronUp className="w-5 h-5 text-gray-500" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-500" />
                      )}
                    </button>
                  </div>

                  <h3 className="text-lg font-medium text-gray-900 mb-4 leading-relaxed">
                    {question.question}
                  </h3>

                  {expandedQuestion === question.id && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="flex flex-wrap gap-2 mb-4">
                        {question.tags.map((tag) => (
                          <span
                            key={tag}
                            className="px-2 py-1 bg-gray-100 text-gray-700 rounded-md text-xs"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-600">
                          💡 Take time to structure your answer with examples
                        </div>
                        <button className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
                          <Star className="w-4 h-4" />
                          Add to Favorites
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function ViewQuestionsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      }
    >
      <ViewQuestionsContent />
    </Suspense>
  );
}
