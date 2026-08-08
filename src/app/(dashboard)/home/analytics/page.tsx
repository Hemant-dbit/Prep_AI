"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/client/context/AuthContext";
import { userService } from "@/client/services/user.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  PageLoading,
  CardLoading,
  InlineLoading,
} from "@/components/ui/Loading";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Line } from "react-chartjs-2";
import { Loader2 } from "lucide-react";

// Chevron SVG components
const ChevronDownIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-4 w-4"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M19 9l-7 7-7-7"
    />
  </svg>
);

const ChevronUpIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-4 w-4"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M5 15l7-7 7 7"
    />
  </svg>
);

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface AnalyticsData {
  totalInterviews: number;
  completedInterviews: number;
  averageScore: number;
  recentInterviews: Array<{
    id: string;
    score: number;
    startedAt: string;
    status: string;
    jdData?: {
      title?: string;
      skillsReq?: string[];
      expReq?: number;
    };
  }>;
  skillsAnalysis: Array<{
    skill: string;
    averageScore: number;
    count: number;
    domain?: string;
  }>;
  monthlyProgress: Array<{
    month: string;
    interviews: number;
    averageScore: number;
  }>;
  resumeAnalytics: {
    totalResumes: number;
    averageResumeScore: number;
    recentResumes: Array<{
      id: string;
      fileName: string;
      createdAt: string;
      score: number | null;
      skills: string[];
      strengths: string[];
      weaknesses: string[];
      suggestions: string[];
    }>;
    resumeSkillsAnalysis: Array<{
      skill: string;
      count: number;
      averageScore: number;
    }>;
  };
}

// Domain Progress Chart Component
function DomainProgressChart({
  interviews,
}: {
  interviews: AnalyticsData["recentInterviews"];
}) {
  // Process interviews to group by domain and calculate average scores over time
  const domainData = interviews.reduce((acc, interview) => {
    // Try to extract domain from different possible locations in jdData
    let domain = "Unknown";
    if (interview.jdData) {
      // Try to get domain from job title first
      if (interview.jdData.title) {
        // Use the full title as the domain to keep the complete role name
        domain = interview.jdData.title;
      }
      // If no title, try to extract from skills
      else if (
        Array.isArray(interview.jdData.skillsReq) &&
        interview.jdData.skillsReq.length > 0
      ) {
        // Try to get a meaningful role from the skills requirement
        const skill = interview.jdData.skillsReq[0];
        // Look for role keywords in the skill description
        if (skill.toLowerCase().includes("developer")) {
          const parts = skill.split(" with")[0].split(" "); // Get the part before "with"
          domain = parts.join(" "); // Join all words to get full role name
        } else {
          domain = skill.split(" ")[0]; // Fallback to first word if no clear role
        }
      }
    }

    // Skip interviews that are not completed or have no score
    if (
      interview.status !== "COMPLETED" ||
      interview.score === null ||
      interview.score === undefined
    ) {
      return acc;
    }

    // Skip interviews with no score
    if (interview.score === null || interview.score === undefined) {
      return acc;
    }

    if (!acc[domain]) {
      acc[domain] = [];
    }
    acc[domain].push({
      date: new Date(interview.startedAt),
      score: interview.score,
    });
    return acc;
  }, {} as Record<string, Array<{ date: Date; score: number }>>);

  // Sort data points by date for each domain
  Object.keys(domainData).forEach((domain) => {
    domainData[domain].sort((a, b) => a.date.getTime() - b.date.getTime());
  });

  // Get unique dates across all interviews
  const allDates = [
    ...new Set(
      interviews.map((i) => new Date(i.startedAt).toLocaleDateString())
    ),
  ].sort();

  // Prepare chart data
  // Filter out domains with no valid scores
  const validDomains = Object.entries(domainData).filter(
    ([_, scores]) => scores.length > 0
  );

  // If no valid domains, show a message
  if (validDomains.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-gray-500">No scored interviews available yet</p>
      </div>
    );
  }

  const data = {
    labels: allDates,
    datasets: validDomains.map(([domain, scores], index) => ({
      label: domain,
      data: allDates.map((date) => {
        const matchingScore = scores.find(
          (s) => s.date.toLocaleDateString() === date
        );
        return matchingScore ? matchingScore.score : null;
      }),
      borderColor: [
        "#3b82f6", // bright blue
        "#22c55e", // bright green
        "#a855f7", // bright purple
        "#f97316", // bright orange
        "#ef4444", // bright red
        "#06b6d4", // cyan
        "#ec4899", // pink
      ][index % 7],
      backgroundColor: [
        "#3b82f620", // semi-transparent versions
        "#22c55e20",
        "#a855f720",
        "#f9731620",
        "#ef444420",
        "#06b6d420",
        "#ec489920",
      ][index % 7],
      borderWidth: 2,
      tension: 0.4,
      fill: true,
      spanGaps: true,
      pointRadius: 4,
      pointHoverRadius: 6,
    })),
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        type: "linear" as const,
        beginAtZero: true,
        max: 100,
        title: {
          display: true,
          text: "Score (%)",
          font: {
            size: 14,
            weight: "bold" as const,
          },
        },
        grid: {
          color: "#e5e7eb",
          drawBorder: false,
        },
        ticks: {
          stepSize: 20,
          font: {
            size: 12,
          },
        },
      },
      x: {
        type: "category" as const,
        title: {
          display: true,
          text: "Interview Date",
          font: {
            size: 14,
            weight: "bold" as const,
          },
        },
        grid: {
          display: false,
        },
        ticks: {
          maxRotation: 45,
          minRotation: 45,
          font: {
            size: 12,
          },
        },
      },
    },
    plugins: {
      legend: {
        position: "top" as const,
        align: "start" as const,
        labels: {
          boxWidth: 15,
          usePointStyle: true,
          padding: 20,
          font: {
            size: 13,
          },
        },
      },
      tooltip: {
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        padding: 12,
        bodySpacing: 4,
        callbacks: {
          title: (tooltipItems: any) => {
            return new Date(tooltipItems[0].label).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            });
          },
          label: (context: any) => {
            return `${context.dataset.label}: ${context.parsed.y?.toFixed(1)}%`;
          },
        },
      },
    },
    interaction: {
      intersect: false,
      mode: "nearest" as const,
    },
    animation: {
      duration: 1000,
    },
  };

  return <Line data={data} options={options} />;
}

export default function Analytics() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAllInterviews, setShowAllInterviews] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchAnalytics();
    }
  }, [isAuthenticated]);

  const fetchAnalytics = async () => {
    try {
      const data: any = await userService.getAnalytics();
      setAnalytics(data.analytics);
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleBackToDashboard = () => {
    router.push("/home/dashboard");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading your analytics...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (!analytics) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Analytics</h1>
          <p>
            No analytics data available. Start taking interviews to see your
            progress!
          </p>
          <Button onClick={handleBackToDashboard} className="mt-4">
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreProgress = (score: number) => {
    if (score >= 80) return "bg-green-500";
    if (score >= 60) return "bg-yellow-500";
    return "bg-red-500";
  };

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Analytics Dashboard
          </h1>
          <p className="text-gray-600 mt-1">
            Track your interview performance and progress
          </p>
        </div>
        <Button onClick={handleBackToDashboard} variant="outline">
          ← Back to Dashboard
        </Button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Interviews
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics.totalInterviews}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Completed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {analytics.completedInterviews}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Monthly Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            {analytics.monthlyProgress &&
            analytics.monthlyProgress.length > 0 ? (
              <div className="text-2xl font-bold text-blue-600">
                {analytics.monthlyProgress[0].averageScore.toFixed(1)}%
                {analytics.monthlyProgress[0].averageScore >
                (analytics.monthlyProgress[1]?.averageScore || 0) ? (
                  <span className="text-sm text-green-600 ml-2">↑</span>
                ) : (
                  <span className="text-sm text-red-600 ml-2">↓</span>
                )}
              </div>
            ) : (
              <div className="text-2xl font-bold text-gray-400">-</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Success Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {analytics.totalInterviews > 0
                ? (
                    (analytics.completedInterviews /
                      analytics.totalInterviews) *
                    100
                  ).toFixed(1)
                : 0}
              %
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Latest Resume Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${getScoreColor(
                analytics.resumeAnalytics?.recentResumes?.[0]?.score || 0
              )}`}
            >
              {analytics.resumeAnalytics?.recentResumes?.[0]?.score
                ? analytics.resumeAnalytics.recentResumes[0].score.toFixed(1) +
                  "%"
                : "N/A"}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Interviews and Skills Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Recent Interviews</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(analytics.recentInterviews || []).length > 0 ? (
                <>
                  {analytics.recentInterviews
                    .slice(0, showAllInterviews ? undefined : 3)
                    .map((interview) => (
                      <div
                        key={interview.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div>
                          <p className="font-medium">
                            {interview.jdData?.title || "Interview Session"}
                          </p>
                          <p className="text-sm text-gray-600">
                            {new Date(interview.startedAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p
                            className={`font-bold ${getScoreColor(
                              interview.score || 0
                            )}`}
                          >
                            {interview.score?.toFixed(1) || "N/A"}%
                          </p>
                          <span
                            className={`inline-block px-2 py-1 text-xs rounded-full ${
                              interview.status === "COMPLETED"
                                ? "bg-green-100 text-green-800"
                                : interview.status === "ACTIVE"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {interview.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  {analytics.recentInterviews.length > 5 && (
                    <Button
                      variant="ghost"
                      className="w-full mt-2 text-blue-600 hover:text-blue-800"
                      onClick={() => setShowAllInterviews(!showAllInterviews)}
                    >
                      {showAllInterviews ? (
                        <div className="flex items-center justify-center gap-2">
                          Show Less <ChevronUpIcon />
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-2">
                          View All <ChevronDownIcon />
                        </div>
                      )}
                    </Button>
                  )}
                </>
              ) : (
                <p className="text-gray-500 text-center py-4">
                  No interviews completed yet
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Domain-wise Improvement */}
        <Card>
          <CardHeader>
            <CardTitle>Domain-wise Performance Improvement</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {(analytics.recentInterviews || []).length > 0 ? (
                <DomainProgressChart interviews={analytics.recentInterviews} />
              ) : (
                <p className="text-gray-500 text-center py-4">
                  No interview data available yet
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Resume Analytics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Recent Resumes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(analytics.resumeAnalytics?.recentResumes || []).length > 0 ? (
                (analytics.resumeAnalytics?.recentResumes || []).map(
                  (resume) => (
                    <div
                      key={resume.id}
                      className="flex items-center justify-between p-3 bg-purple-50 rounded-lg"
                    >
                      <div>
                        <p className="font-medium truncate max-w-48">
                          {resume.fileName}
                        </p>
                        <p className="text-sm text-gray-600">
                          {new Date(resume.createdAt).toLocaleDateString()}
                        </p>
                        <p className="text-xs text-gray-500">
                          {(resume.skills || []).length} skills identified
                        </p>
                      </div>
                      <div className="text-right">
                        <p
                          className={`font-bold ${getScoreColor(
                            resume.score || 0
                          )}`}
                        >
                          {resume.score
                            ? resume.score.toFixed(1) + "%"
                            : "Not scored"}
                        </p>
                        <div className="flex flex-wrap gap-1 mt-1 max-w-24">
                          {(resume.skills || [])
                            .slice(0, 2)
                            .map((skill, index) => (
                              <span
                                key={index}
                                className="inline-block px-1 py-0.5 text-xs bg-purple-100 text-purple-800 rounded"
                              >
                                {skill}
                              </span>
                            ))}
                          {(resume.skills || []).length > 2 && (
                            <span className="text-xs text-gray-500">
                              +{(resume.skills || []).length - 2}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                )
              ) : (
                <p className="text-gray-500 text-center py-4">
                  No resumes uploaded yet
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Resume Skills Analysis */}
        <Card>
          <CardHeader>
            <CardTitle>Resume Skills Frequency</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(analytics.resumeAnalytics?.resumeSkillsAnalysis || []).length >
              0 ? (
                (analytics.resumeAnalytics?.resumeSkillsAnalysis || []).map(
                  (skill) => (
                    <div key={skill.skill} className="space-y-2">
                      <div className="flex justify-between">
                        <span className="font-medium">{skill.skill}</span>
                        <div className="text-right">
                          <span className="text-sm text-gray-600">
                            {skill.count} resumes
                          </span>
                          {skill.averageScore > 0 && (
                            <span
                              className={`ml-2 font-bold ${getScoreColor(
                                skill.averageScore
                              )}`}
                            >
                              {skill.averageScore.toFixed(1)}%
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="h-2 rounded-full bg-purple-500"
                          style={{
                            width: `${Math.min(
                              (skill.count /
                                analytics.resumeAnalytics.totalResumes) *
                                100,
                              100
                            )}%`,
                          }}
                        ></div>
                      </div>
                    </div>
                  )
                )
              ) : (
                <p className="text-gray-500 text-center py-4">
                  No resume skills data available yet
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Resume Detailed Analysis */}
      {(analytics.resumeAnalytics?.recentResumes || []).length > 0 && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Resume Analysis Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Strengths */}
              <div>
                <h3 className="font-semibold text-green-700 mb-3 flex items-center">
                  <svg
                    className="w-5 h-5 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  Common Strengths
                </h3>
                <div className="space-y-2">
                  {(analytics.resumeAnalytics?.recentResumes || [])
                    .flatMap((resume) => resume.strengths || [])
                    .filter(
                      (strength, index, array) =>
                        array.indexOf(strength) === index
                    )
                    .slice(0, 5)
                    .map((strength, index) => (
                      <div
                        key={index}
                        className="p-2 bg-green-50 border-l-4 border-green-400 rounded"
                      >
                        <p className="text-sm text-green-800">{strength}</p>
                      </div>
                    ))}
                  {(analytics.resumeAnalytics?.recentResumes || []).every(
                    (resume) => (resume.strengths || []).length === 0
                  ) && (
                    <p className="text-gray-500 text-sm">
                      No strengths data available
                    </p>
                  )}
                </div>
              </div>

              {/* Weaknesses */}
              <div>
                <h3 className="font-semibold text-red-700 mb-3 flex items-center">
                  <svg
                    className="w-5 h-5 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  Areas to Improve
                </h3>
                <div className="space-y-2">
                  {(analytics.resumeAnalytics?.recentResumes || [])
                    .flatMap((resume) => resume.weaknesses || [])
                    .filter(
                      (weakness, index, array) =>
                        array.indexOf(weakness) === index
                    )
                    .slice(0, 5)
                    .map((weakness, index) => (
                      <div
                        key={index}
                        className="p-2 bg-red-50 border-l-4 border-red-400 rounded"
                      >
                        <p className="text-sm text-red-800">{weakness}</p>
                      </div>
                    ))}
                  {(analytics.resumeAnalytics?.recentResumes || []).every(
                    (resume) => (resume.weaknesses || []).length === 0
                  ) && (
                    <p className="text-gray-500 text-sm">
                      No weaknesses data available
                    </p>
                  )}
                </div>
              </div>

              {/* Suggestions */}
              <div>
                <h3 className="font-semibold text-blue-700 mb-3 flex items-center">
                  <svg
                    className="w-5 h-5 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                    />
                  </svg>
                  Suggestions
                </h3>
                <div className="space-y-2">
                  {(analytics.resumeAnalytics?.recentResumes || [])
                    .flatMap((resume) => resume.suggestions || [])
                    .filter(
                      (suggestion, index, array) =>
                        array.indexOf(suggestion) === index
                    )
                    .slice(0, 5)
                    .map((suggestion, index) => (
                      <div
                        key={index}
                        className="p-2 bg-blue-50 border-l-4 border-blue-400 rounded"
                      >
                        <p className="text-sm text-blue-800">{suggestion}</p>
                      </div>
                    ))}
                  {analytics.resumeAnalytics.recentResumes.every(
                    (resume) => (resume.suggestions || []).length === 0
                  ) && (
                    <p className="text-gray-500 text-sm">
                      No suggestions data available
                    </p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Items */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Recommendations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {/* Interview Recommendations */}
            {(analytics.averageScore || 0) < 60 && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-800 font-medium">
                  Focus on improving your interview skills
                </p>
                <p className="text-red-600 text-sm">
                  Your average interview score is below 60%. Consider practicing
                  more frequently.
                </p>
              </div>
            )}
            {(analytics.totalInterviews || 0) < 5 && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-blue-800 font-medium">
                  Take more practice interviews
                </p>
                <p className="text-blue-600 text-sm">
                  Complete more interviews to get better insights and improve
                  your skills.
                </p>
              </div>
            )}
            {analytics.averageScore >= 80 && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-green-800 font-medium">
                  Great job on interviews!
                </p>
                <p className="text-green-600 text-sm">
                  You're performing excellently in interviews. Keep up the good
                  work!
                </p>
              </div>
            )}

            {/* Resume Recommendations */}
            {(analytics.resumeAnalytics?.totalResumes || 0) === 0 && (
              <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                <p className="text-purple-800 font-medium">
                  Upload your resume for analysis
                </p>
                <p className="text-purple-600 text-sm">
                  Get detailed feedback on your resume to improve your job
                  applications.
                </p>
              </div>
            )}
            {(analytics.resumeAnalytics?.averageResumeScore || 0) > 0 &&
              (analytics.resumeAnalytics?.averageResumeScore || 0) < 70 && (
                <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                  <p className="text-orange-800 font-medium">
                    Improve your resume quality
                  </p>
                  <p className="text-orange-600 text-sm">
                    Your average resume score is{" "}
                    {(
                      analytics.resumeAnalytics?.averageResumeScore || 0
                    ).toFixed(1)}
                    %. Review the suggestions above to enhance your resume.
                  </p>
                </div>
              )}
            {(analytics.resumeAnalytics?.averageResumeScore || 0) >= 80 && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-green-800 font-medium">
                  Excellent resume quality!
                </p>
                <p className="text-green-600 text-sm">
                  Your resumes are scoring{" "}
                  {(analytics.resumeAnalytics?.averageResumeScore || 0).toFixed(
                    1
                  )}
                  % on average. Great work!
                </p>
              </div>
            )}
            {(analytics.resumeAnalytics?.totalResumes || 0) > 0 &&
              (analytics.resumeAnalytics?.totalResumes || 0) < 3 && (
                <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
                  <p className="text-indigo-800 font-medium">
                    Create role-specific resumes
                  </p>
                  <p className="text-indigo-600 text-sm">
                    Consider creating different versions of your resume tailored
                    to different job roles.
                  </p>
                </div>
              )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
