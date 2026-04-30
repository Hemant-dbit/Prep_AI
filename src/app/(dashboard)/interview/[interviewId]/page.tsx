"use client";
import { use } from "react";
import InterviewUI from "@/components/interview/InterviewUI";
import PreInterview from "@/components/interview/PreInterviewNew";
import { useSearchParams } from "next/navigation";

export default function InterviewPage({
  params,
}: {
  params: Promise<{ interviewId: string }>;
}) {
  const resolvedParams = use(params);
  const searchParams = useSearchParams();
  const session = searchParams.get("session");

  if (session === "active") {
    return <InterviewUI sessionId={resolvedParams.interviewId} />;
  }

  return <PreInterview interviewId={resolvedParams.interviewId} />;
}
