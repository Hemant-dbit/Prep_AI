import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";

// Initialize Groq AI
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || "" });

type QuestionCategory = "frontend" | "backend" | "devops" | "mobile";

const categoryPrompts: Record<QuestionCategory, string> = {
  frontend: `Generate 10 frontend development interview questions focusing on React, JavaScript, TypeScript, CSS, HTML, responsive design, performance optimization, state management, component architecture, and modern frontend frameworks. Include questions about debugging, testing, and best practices. Mix easy to hard difficulty levels.`,

  backend: `Generate 10 backend development interview questions covering APIs (REST/GraphQL), databases (SQL/NoSQL), server architecture, microservices, authentication, security, performance optimization, caching, data modeling, and backend frameworks (Node.js, Python, Java, etc.). Mix easy to hard difficulty levels.`,

  devops: `Generate 10 DevOps interview questions focusing on CI/CD pipelines, cloud platforms (AWS, Azure, GCP), containerization (Docker, Kubernetes), infrastructure as code, monitoring, logging, deployment strategies, automation, security practices, and scalability. Mix easy to hard difficulty levels.`,

  mobile: `Generate 10 mobile development interview questions covering iOS (Swift, SwiftUI), Android (Kotlin, Java), React Native, Flutter, mobile app architecture, performance optimization, app store deployment, mobile-specific challenges, offline functionality, and cross-platform development. Mix easy to hard difficulty levels.`,
};

const difficultyLevels = ["Easy", "Medium", "Hard"];
const timeEstimates = ["2-3 min", "3-4 min", "4-5 min"];

function generateTags(question: string, category: string): string[] {
  const categoryTags: Record<string, string[]> = {
    frontend: [
      "React",
      "JavaScript",
      "CSS",
      "HTML",
      "Components",
      "State Management",
      "Performance",
      "Testing",
    ],
    backend: [
      "APIs",
      "Database",
      "Server",
      "Architecture",
      "Security",
      "Performance",
      "Microservices",
      "Authentication",
    ],
    devops: [
      "CI/CD",
      "Cloud",
      "Docker",
      "Kubernetes",
      "Infrastructure",
      "Monitoring",
      "Deployment",
      "Automation",
    ],
    mobile: [
      "iOS",
      "Android",
      "React Native",
      "App Store",
      "Performance",
      "Mobile UI",
      "Cross-platform",
      "Native",
    ],
  };

  const baseTags = categoryTags[category] || [];

  // Add specific tags based on question content
  const additionalTags: string[] = [];
  if (question.toLowerCase().includes("react")) additionalTags.push("React");
  if (question.toLowerCase().includes("database"))
    additionalTags.push("Database");
  if (question.toLowerCase().includes("api")) additionalTags.push("API");
  if (question.toLowerCase().includes("performance"))
    additionalTags.push("Performance");
  if (question.toLowerCase().includes("security"))
    additionalTags.push("Security");
  if (question.toLowerCase().includes("cloud")) additionalTags.push("Cloud");
  if (question.toLowerCase().includes("mobile")) additionalTags.push("Mobile");

  return [...baseTags.slice(0, 2), ...additionalTags].slice(0, 3);
}

export async function POST(request: NextRequest) {
  try {
    const { category } = await request.json();

    if (!category || !categoryPrompts[category as QuestionCategory]) {
      return NextResponse.json(
        { error: "Invalid category provided" },
        { status: 400 }
      );
    }

    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json(
        { error: "Groq API key not configured" },
        { status: 500 }
      );
    }

    const prompt = `${categoryPrompts[category as QuestionCategory]}

Please return the questions in the following JSON format:
{
  "questions": [
    {
      "question": "Question text here?",
      "difficulty": "Easy|Medium|Hard",
      "timeToAnswer": "2-3 min|3-4 min|4-5 min"
    }
  ]
}

Make sure each question is:
1. Clear and professionally worded
2. Relevant to the ${category} category
3. Appropriate for job interviews
4. Varied in difficulty level
5. Actionable and specific

Return only valid JSON format.`;

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
    });
    const text = completion.choices[0].message.content;

    try {
      // Try to parse the JSON response
      const parsedResponse = JSON.parse(text);

      if (
        !parsedResponse.questions ||
        !Array.isArray(parsedResponse.questions)
      ) {
        throw new Error("Invalid response format from AI");
      }

      // Format the questions with additional metadata
      const formattedQuestions = parsedResponse.questions.map(
        (q: any, index: number) => ({
          id: `${category}_${Date.now()}_${index}`,
          question: q.question,
          category: category,
          difficulty:
            q.difficulty ||
            difficultyLevels[
              Math.floor(Math.random() * difficultyLevels.length)
            ],
          timeToAnswer:
            q.timeToAnswer ||
            timeEstimates[Math.floor(Math.random() * timeEstimates.length)],
          tags: generateTags(q.question, category),
          isFavorite: false,
        })
      );

      return NextResponse.json({
        success: true,
        questions: formattedQuestions,
        category: category,
        count: formattedQuestions.length,
      });
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      console.error("Raw response:", text);

      // Fallback: create some default questions if AI response is malformed
      const fallbackQuestions = getFallbackQuestions(
        category as QuestionCategory
      );

      return NextResponse.json({
        success: true,
        questions: fallbackQuestions,
        category: category,
        count: fallbackQuestions.length,
        note: "Using fallback questions due to AI parsing error",
      });
    }
  } catch (error) {
    console.error("Error generating questions:", error);

    // Return fallback questions in case of any error
    const fallbackQuestions = getFallbackQuestions(
      (request as any).category || "frontend"
    );

    return NextResponse.json({
      success: true,
      questions: fallbackQuestions,
      category: (request as any).category || "frontend",
      count: fallbackQuestions.length,
      note: "Using fallback questions due to API error",
    });
  }
}

function getFallbackQuestions(category: QuestionCategory) {
  const fallbackData: Record<QuestionCategory, any[]> = {
    frontend: [
      {
        question:
          "Explain the difference between React functional and class components.",
        difficulty: "Medium",
        timeToAnswer: "3-4 min",
      },
      {
        question: "How do you optimize the performance of a React application?",
        difficulty: "Hard",
        timeToAnswer: "4-5 min",
      },
      {
        question: "What are the key features of CSS Grid vs Flexbox?",
        difficulty: "Easy",
        timeToAnswer: "2-3 min",
      },
      {
        question:
          "Explain how React hooks work and their benefits over class components.",
        difficulty: "Medium",
        timeToAnswer: "3-4 min",
      },
      {
        question:
          "What is the Virtual DOM and how does it improve performance?",
        difficulty: "Medium",
        timeToAnswer: "3-4 min",
      },
      {
        question:
          "How do you handle state management in large React applications?",
        difficulty: "Hard",
        timeToAnswer: "4-5 min",
      },
      {
        question:
          "Explain the concept of responsive web design and mobile-first approach.",
        difficulty: "Easy",
        timeToAnswer: "2-3 min",
      },
      {
        question:
          "What are Progressive Web Apps (PWAs) and their key features?",
        difficulty: "Medium",
        timeToAnswer: "3-4 min",
      },
      {
        question: "How do you implement lazy loading in React applications?",
        difficulty: "Medium",
        timeToAnswer: "3-4 min",
      },
      {
        question:
          "Explain JavaScript closures and provide a practical example.",
        difficulty: "Hard",
        timeToAnswer: "4-5 min",
      },
    ],
    backend: [
      {
        question: "Explain the difference between REST and GraphQL APIs.",
        difficulty: "Medium",
        timeToAnswer: "3-4 min",
      },
      {
        question:
          "How would you design a scalable database schema for an e-commerce platform?",
        difficulty: "Hard",
        timeToAnswer: "4-5 min",
      },
      {
        question: "What are the benefits of using microservices architecture?",
        difficulty: "Medium",
        timeToAnswer: "3-4 min",
      },
      {
        question:
          "Explain database indexing and when to use different types of indexes.",
        difficulty: "Medium",
        timeToAnswer: "3-4 min",
      },
      {
        question:
          "How do you implement authentication and authorization in a web API?",
        difficulty: "Hard",
        timeToAnswer: "4-5 min",
      },
      {
        question:
          "What is caching and how would you implement it in a backend system?",
        difficulty: "Medium",
        timeToAnswer: "3-4 min",
      },
      {
        question:
          "Explain the CAP theorem and its implications for distributed systems.",
        difficulty: "Hard",
        timeToAnswer: "4-5 min",
      },
      {
        question:
          "How do you handle database migrations in production environments?",
        difficulty: "Medium",
        timeToAnswer: "3-4 min",
      },
      {
        question: "What are the differences between SQL and NoSQL databases?",
        difficulty: "Easy",
        timeToAnswer: "2-3 min",
      },
      {
        question: "How would you design an API rate limiting system?",
        difficulty: "Hard",
        timeToAnswer: "4-5 min",
      },
    ],
    devops: [
      {
        question: "Explain the CI/CD pipeline and its benefits.",
        difficulty: "Easy",
        timeToAnswer: "2-3 min",
      },
      {
        question:
          "How would you set up monitoring and logging for a distributed system?",
        difficulty: "Hard",
        timeToAnswer: "4-5 min",
      },
      {
        question: "What are the advantages of containerization with Docker?",
        difficulty: "Medium",
        timeToAnswer: "3-4 min",
      },
      {
        question: "Explain Infrastructure as Code (IaC) and its benefits.",
        difficulty: "Medium",
        timeToAnswer: "3-4 min",
      },
      {
        question:
          "How do you manage secrets and sensitive data in a DevOps pipeline?",
        difficulty: "Hard",
        timeToAnswer: "4-5 min",
      },
      {
        question: "What is Kubernetes and how does it differ from Docker?",
        difficulty: "Medium",
        timeToAnswer: "3-4 min",
      },
      {
        question:
          "Explain different deployment strategies (blue-green, canary, rolling).",
        difficulty: "Hard",
        timeToAnswer: "4-5 min",
      },
      {
        question: "How do you implement automated testing in a CI/CD pipeline?",
        difficulty: "Medium",
        timeToAnswer: "3-4 min",
      },
      {
        question: "What are the key differences between AWS, Azure, and GCP?",
        difficulty: "Easy",
        timeToAnswer: "2-3 min",
      },
      {
        question:
          "How would you design a disaster recovery strategy for a cloud-based application?",
        difficulty: "Hard",
        timeToAnswer: "4-5 min",
      },
    ],
    mobile: [
      {
        question:
          "What are the key differences between native and cross-platform mobile development?",
        difficulty: "Easy",
        timeToAnswer: "2-3 min",
      },
      {
        question: "How do you handle offline functionality in mobile apps?",
        difficulty: "Hard",
        timeToAnswer: "4-5 min",
      },
      {
        question: "Explain the mobile app lifecycle and state management.",
        difficulty: "Medium",
        timeToAnswer: "3-4 min",
      },
      {
        question:
          "How do you optimize mobile app performance and reduce battery consumption?",
        difficulty: "Hard",
        timeToAnswer: "4-5 min",
      },
      {
        question: "What are the differences between React Native and Flutter?",
        difficulty: "Medium",
        timeToAnswer: "3-4 min",
      },
      {
        question:
          "Explain push notifications and how to implement them in mobile apps.",
        difficulty: "Medium",
        timeToAnswer: "3-4 min",
      },
      {
        question:
          "How do you handle different screen sizes and resolutions in mobile development?",
        difficulty: "Medium",
        timeToAnswer: "3-4 min",
      },
      {
        question: "What are the best practices for mobile app security?",
        difficulty: "Hard",
        timeToAnswer: "4-5 min",
      },
      {
        question: "Explain the mobile app store submission and review process.",
        difficulty: "Easy",
        timeToAnswer: "2-3 min",
      },
      {
        question: "How do you implement deep linking in mobile applications?",
        difficulty: "Medium",
        timeToAnswer: "3-4 min",
      },
    ],
  };

  return fallbackData[category].map((q, index) => ({
    id: `fallback_${category}_${index}`,
    question: q.question,
    category: category,
    difficulty: q.difficulty,
    timeToAnswer: q.timeToAnswer,
    tags: generateTags(q.question, category),
    isFavorite: false,
  }));
}
