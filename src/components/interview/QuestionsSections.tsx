"use client";
import { Lightbulb, Volume2, HelpCircle } from "lucide-react";
import React from "react";

interface Props {
  mockInterviewQuestion: any[];
  activeQuestionIndex: number;
  setActiveQuestionIndex: (index: number) => void;
  answers?: Record<string, any>;
  // When false, hide the large numbered navigation (useful when placing
  // a compact version elsewhere in the layout)
  showNumbers?: boolean;
}

const QuestionsSection = ({
  mockInterviewQuestion,
  activeQuestionIndex,
  setActiveQuestionIndex,
  answers = {},
  showNumbers = true,
}: Props) => {
  const textToSpeech = (text: string) => {
    if ("speechSynthesis" in window) {
      const speech = new SpeechSynthesisUtterance(text);
      window.speechSynthesis.speak(speech);
    } else {
      alert("Sorry, your browser doesn't support text-to-speech");
    }
  };

  return (
    mockInterviewQuestion && (
      <div >
        {showNumbers && (
          <div className="flex flex-wrap gap-3 mb-6">
            {mockInterviewQuestion.map((question, index) => {
            const questionId = question._id || question.id;
            const isAnswered = questionId && answers[questionId];
            const isActive = activeQuestionIndex === index;

            // debug: question button state (removed console output)

            // Determine button style based on state
            let buttonClasses =
              "w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all ";

            if (isActive) {
              // Current active question - blue
              buttonClasses += "bg-blue-600 text-white shadow-md";
            } else if (isAnswered) {
              // Answered question - green
              buttonClasses += "bg-green-600 text-white shadow-md";
            } else {
              // Unanswered question - gray
              buttonClasses += "bg-gray-100 text-gray-700 hover:bg-gray-200";
            }

            return (
              <button
                key={index}
                onClick={() => setActiveQuestionIndex(index)}
                className={buttonClasses}
              >
                {index + 1}
              </button>
            );
            })}
          </div>
        )}

        
      </div>
    )
  );
};

export default QuestionsSection;
