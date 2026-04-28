import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import Groq from "groq-sdk";
import jwt from "jsonwebtoken";

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

// Initialize Groq AI
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function POST(request) {
  try {
    // Get token from Authorization header
    const authHeader = request.headers.get("authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Unauthorized - No token provided" },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);

    // Verify the JWT token
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (error) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const userId = decoded.userId;

    // Parse the request body
    const body = await request.json();
    const {
      sessionId,
      jobDescription,
      experienceLevel,
      jobRole,
      resumeFileName,
    } = body;

    // Validate required fields
    if (
      !sessionId ||
      !jobDescription ||
      experienceLevel === undefined ||
      experienceLevel === null ||
      !jobRole
    ) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: sessionId, jobDescription, experienceLevel, jobRole",
        },
        { status: 400 }
      );
    }

    // Verify the session belongs to the user and get resume data
    const session = await prisma.interviewSession.findFirst({
      where: {
        id: sessionId,
        userId: userId,
      },
      include: {
        resume: true,
        jd: true,
      },
    });

    if (!session) {
      return NextResponse.json(
        { error: "Interview session not found or unauthorized" },
        { status: 404 }
      );
    }

    // Check if questions already exist for this session
    const existingQuestions = await prisma.question.findMany({
      where: { sessionId: sessionId },
      orderBy: { order: "asc" },
    });

    if (existingQuestions.length > 0) {
      return NextResponse.json({
        success: true,
        message: "Questions already exist for this session",
        questions: existingQuestions,
      });
    }

    // Generate questions using Groq AI
    // Processing interview setup for the specified role and experience level

    try {
      // Prepare resume data for the prompt
      let resumeInfo = "";
      if (session.resume && session.resume.parsedData) {
        const resumeData = session.resume.parsedData;
        resumeInfo = `
        Resume Information:
        - Name: ${resumeData.name || "N/A"}
        - Skills: ${
          Array.isArray(resumeData.skills)
            ? resumeData.skills.join(", ")
            : "N/A"
        }
        - Experience: ${
          Array.isArray(resumeData.experience)
            ? resumeData.experience
                .map(
                  (exp) => `${exp.position} at ${exp.company} (${exp.duration})`
                )
                .join("; ")
            : "N/A"
        }
        - Projects: ${
          Array.isArray(resumeData.projects)
            ? resumeData.projects
                .map(
                  (proj) =>
                    `${proj.name || proj.title}: ${
                      proj.description || ""
                    } (Technologies: ${
                      Array.isArray(proj.technologies)
                        ? proj.technologies.join(", ")
                        : proj.tech || "N/A"
                    })`
                )
                .join("; ")
            : "N/A"
        }
        - Education: ${
          Array.isArray(resumeData.education)
            ? resumeData.education
                .map(
                  (edu) =>
                    `${edu.degree} in ${edu.field} from ${edu.institution}`
                )
                .join("; ")
            : "N/A"
        }
        - Summary: ${resumeData.summary || "N/A"}
        `;
      } else {
        resumeInfo = "Resume Information: No resume data available";
      }

      // Resume data prepared for question generation

      const prompt = `
        You are an expert technical interviewer conducting a ${jobRole} interview for a candidate with ${experienceLevel} years of experience. 
        
        ANALYZE THE FOLLOWING INFORMATION CAREFULLY:

        === JOB DESCRIPTION ===
        ${jobDescription}
        
        === CANDIDATE'S RESUME ===
        ${resumeInfo}

        TASK: Generate exactly 10 highly personalized and relevant interview questions based on the analysis above.

        ANALYSIS REQUIREMENTS:
        1. Identify key technical skills mentioned in the job description
        2. Match candidate's experience with job requirements
        3. Find gaps or areas to explore further
        4. Consider the experience level for question difficulty
        5. Look for specific projects, companies, or technologies the candidate has worked with
        6. Pay special attention to projects section for technical deep-dive questions

        QUESTION GENERATION RULES:
        
        TECHNICAL QUESTIONS (2 out of 3):
        - Focus on technologies/frameworks mentioned in BOTH job description AND resume
        - Reference specific projects by name and ask about technical decisions
        - Ask about architecture choices and challenges in their projects
        - Include system design questions for senior roles (3+ years)
        - Ask about trade-offs and decision-making in technical choices
        - Include coding/problem-solving scenarios relevant to the job
        - Deep dive into project technologies and implementation details
        
        BEHAVIORAL QUESTIONS (1 out of 3):
        - Reference specific experiences from their resume
        - Ask about transitions between companies/roles
        - Explore leadership experience for senior positions
        - Focus on situations relevant to the job requirements
        - Ask about challenges specific to their industry/domain

        PERSONALIZATION EXAMPLES:
        - Instead of "Tell me about a time you debugged an issue" 
        - Use "I see you worked at [Company] on [Technology]. Tell me about a challenging debugging scenario you faced with [specific tech stack]"
        
        - Instead of "Describe a project you worked on"
        - Use "I noticed your [Project Name] project used [Technology]. What challenges did you face implementing [specific feature] and how did you solve them?"
        
        - Instead of "How do you handle conflicts?"
        - Use "Moving from [Previous Company] to [Current Company], how did you adapt to different team dynamics?"

        - Instead of "Tell me about your experience with [Technology]"
        - Use "In your [Project Name] project, you used [Technology]. How did you decide on this tech stack and what would you do differently now?"

        DIFFICULTY SCALING:
        - 0-2 years: Focus on fundamentals, learning ability, basic problem-solving
        - 3-5 years: Architecture decisions, team collaboration, complex problem-solving
        - 5+ years: System design, leadership, strategic thinking, mentoring

        OUTPUT FORMAT:
        Return exactly 10 questions as a JSON object. Each question must be:
        - Highly specific to this candidate and role
        - Professional and clear
        - Appropriate for the experience level
        - Either technical or behavioral (specified in type)

        {
          "questions": [
            {
              "text": "Based on your experience with [specific technology from resume] at [specific company], how would you approach [specific challenge related to job description]?",
              "type": "technical",
              "difficulty": "medium",
              "focus_area": "specific skill/requirement from job description"
            }
          ]
        }

        IMPORTANT: Make every question feel like it was crafted specifically for this candidate and this role. Avoid generic questions.
      `;

      const completion = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
      });
      const text = completion.choices[0].message.content;

      // Parse the AI response
      let questionsData;
      try {
        // Clean the response to extract JSON
        const cleanedText = text.replace(/```json\n?|\n?```/g, "").trim();
        const jsonStart = cleanedText.indexOf("{");
        const jsonEnd = cleanedText.lastIndexOf("}");
        questionsData = JSON.parse(cleanedText.slice(jsonStart, jsonEnd + 1));
      } catch (parseError) {
        console.error("Error parsing AI response:", parseError);
        console.error("AI Response:", text);

        // Fallback questions if AI parsing fails - customized by role and experience
        const fallbackQuestions = [];

        // Add role-specific technical questions
        if (
          jobRole.toLowerCase().includes("frontend") ||
          jobRole.toLowerCase().includes("react") ||
          jobRole.toLowerCase().includes("ui")
        ) {
          fallbackQuestions.push(
            {
              text: `How would you optimize a React application's performance for a ${jobRole} role?`,
              type: "technical",
              difficulty: "medium",
              focus_area: "Performance Optimization",
            },
            {
              text: "Describe your approach to responsive design and cross-browser compatibility.",
              type: "technical",
              difficulty: "medium",
              focus_area: "Frontend Development",
            }
          );
        } else if (
          jobRole.toLowerCase().includes("backend") ||
          jobRole.toLowerCase().includes("api") ||
          jobRole.toLowerCase().includes("server")
        ) {
          fallbackQuestions.push(
            {
              text: `How would you design a scalable API for a ${jobRole} position?`,
              type: "technical",
              difficulty: "medium",
              focus_area: "Backend Architecture",
            },
            {
              text: "Explain your approach to database optimization and query performance.",
              type: "technical",
              difficulty: "medium",
              focus_area: "Database Management",
            }
          );
        } else if (
          jobRole.toLowerCase().includes("fullstack") ||
          jobRole.toLowerCase().includes("full-stack")
        ) {
          fallbackQuestions.push(
            {
              text: `As a ${jobRole}, how do you balance frontend and backend development priorities?`,
              type: "technical",
              difficulty: "medium",
              focus_area: "Full-Stack Development",
            },
            {
              text: "Describe your approach to building end-to-end features from UI to database.",
              type: "technical",
              difficulty: "medium",
              focus_area: "Full-Stack Architecture",
            }
          );
        } else {
          // Generic technical questions
          fallbackQuestions.push(
            {
              text: `What technical challenges do you expect in a ${jobRole} role?`,
              type: "technical",
              difficulty: "medium",
              focus_area: "Technical Problem Solving",
            },
            {
              text: "Describe your approach to learning new technologies required for this position.",
              type: "technical",
              difficulty: "medium",
              focus_area: "Technical Learning",
            }
          );
        }

        // Add experience-level appropriate questions
        if (parseInt(experienceLevel) <= 2) {
          // Junior level questions
          fallbackQuestions.push(
            {
              text: "Tell me about your professional background and what interests you about this role.",
              type: "behavioral",
              difficulty: "easy",
              focus_area: "Background & Motivation",
            },
            {
              text: "Describe a challenging problem you solved during your studies or early career.",
              type: "behavioral",
              difficulty: "easy",
              focus_area: "Problem Solving",
            },
            {
              text: "How do you approach learning new technologies or frameworks?",
              type: "behavioral",
              difficulty: "easy",
              focus_area: "Learning & Growth",
            }
          );
        } else if (parseInt(experienceLevel) <= 5) {
          // Mid-level questions
          fallbackQuestions.push(
            {
              text: "Describe a time when you had to make important technical decisions on a project.",
              type: "behavioral",
              difficulty: "medium",
              focus_area: "Technical Leadership",
            },
            {
              text: "How do you handle conflicting priorities and tight deadlines?",
              type: "behavioral",
              difficulty: "medium",
              focus_area: "Time Management",
            },
            {
              text: "Tell me about a time you mentored or helped a junior team member.",
              type: "behavioral",
              difficulty: "medium",
              focus_area: "Mentoring & Collaboration",
            }
          );
        } else {
          // Senior level questions
          fallbackQuestions.push(
            {
              text: "How do you approach system architecture decisions for large-scale applications?",
              type: "technical",
              difficulty: "hard",
              focus_area: "System Architecture",
            },
            {
              text: "Describe your experience leading technical teams and driving engineering culture.",
              type: "behavioral",
              difficulty: "hard",
              focus_area: "Technical Leadership",
            },
            {
              text: "How do you balance technical debt with feature development in your projects?",
              type: "behavioral",
              difficulty: "hard",
              focus_area: "Strategic Planning",
            }
          );
        }

        // Add generic behavioral questions to fill up to 10
        fallbackQuestions.push(
          {
            text: "What motivates you in your work as a software engineer?",
            type: "behavioral",
            difficulty: "easy",
            focus_area: "Motivation & Values",
          },
          {
            text: "Describe a project you're particularly proud of and your role in its success.",
            type: "behavioral",
            difficulty: "medium",
            focus_area: "Project Success",
          },
          {
            text: "How do you stay updated with industry trends and best practices?",
            type: "behavioral",
            difficulty: "easy",
            focus_area: "Professional Development",
          }
        );

        questionsData = {
          questions: fallbackQuestions.slice(0, 10), // Take first 10 questions
        };
      }

      // Validate that we have questions
      if (!questionsData.questions || !Array.isArray(questionsData.questions)) {
        throw new Error("Invalid questions format from AI");
      }

      // Store questions in database
      const questionsToCreate = questionsData.questions.map((q, index) => ({
        sessionId: sessionId,
        questionText: q.text,
        order: index + 1,
      }));

      const createdQuestions = await prisma.question.createMany({
        data: questionsToCreate,
      });

      // Fetch the created questions to return
      const savedQuestions = await prisma.question.findMany({
        where: { sessionId: sessionId },
        orderBy: { order: "asc" },
      });

      return NextResponse.json({
        success: true,
        message: "Questions generated and saved successfully",
        questions: savedQuestions,
        questionsCreated: createdQuestions.count,
      });
    } catch (aiError) {
      console.error("Error with Groq AI:", aiError);

      // Return fallback questions if AI fails
      const fallbackQuestions = [
        {
          text: "Tell me about yourself and your professional background.",
          type: "behavioral",
          difficulty: "easy",
        },
        {
          text: "What interests you about this role and our company?",
          type: "behavioral",
          difficulty: "easy",
        },
        {
          text: "Describe a challenging project you worked on recently.",
          type: "technical",
          difficulty: "medium",
        },
        {
          text: "How do you stay updated with new technologies and industry trends?",
          type: "behavioral",
          difficulty: "easy",
        },
        {
          text: "Walk me through your problem-solving approach when facing a complex technical issue.",
          type: "technical",
          difficulty: "medium",
        },
        {
          text: "Describe a time when you had to work with a difficult team member.",
          type: "behavioral",
          difficulty: "medium",
        },
        {
          text: "What do you consider your greatest professional achievement?",
          type: "behavioral",
          difficulty: "easy",
        },
        {
          text: "Where do you see yourself in the next 3-5 years?",
          type: "behavioral",
          difficulty: "easy",
        },
      ];

      const questionsToCreate = fallbackQuestions.map((q, index) => ({
        sessionId: sessionId,
        questionText: q.text,
        order: index + 1,
      }));

      await prisma.question.createMany({
        data: questionsToCreate,
      });

      const savedQuestions = await prisma.question.findMany({
        where: { sessionId: sessionId },
        orderBy: { order: "asc" },
      });

      return NextResponse.json({
        success: true,
        message:
          "Fallback questions created successfully (AI service unavailable)",
        questions: savedQuestions,
      });
    }
  } catch (error) {
    console.error("Server error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  } finally {
    // keep Prisma client alive across requests in dev/server mode
  }
}

module.exports = { POST };
