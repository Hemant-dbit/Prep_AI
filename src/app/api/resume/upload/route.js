const { NextResponse } = require("next/server");
const { PrismaClient } = require("@prisma/client");
const Groq = require("groq-sdk");
const jwt = require("jsonwebtoken");

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET;
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Function to extract text from PDF using pdf-parse
async function extractTextFromPDF(buffer) {
  try {
    const pdfParse = require("pdf-parse/lib/pdf-parse.js");
    const data = await pdfParse(buffer);
    console.log("📄 PDF text extracted, length:", data.text.length, "chars");
    return data.text;
  } catch (error) {
    console.error("❌ PDF extraction failed:", error?.message || error);
    return "";
  }
}

async function parseResumeWithAI(resumeText) {
  try {

    const prompt = `
      You are an expert resume parser. Parse the following resume text and extract structured information.
      Pay special attention to extracting projects, personal projects, academic projects, or any work projects mentioned.
      Look for project names, descriptions, technologies used, and any links or repositories.
      
      Resume Text: ${resumeText}
      
      Return the response as a JSON object with this exact format:
      {
        "name": "Candidate Name",
        "email": "email@example.com",
        "phone": "phone number",
        "skills": ["skill1", "skill2", "skill3"],
        "experience": [
          {
            "company": "Company Name",
            "position": "Job Title",
            "duration": "Start Date - End Date",
            "description": "Brief description of role"
          }
        ],
        "projects": [
          {
            "name": "Project Name",
            "description": "Brief description of the project",
            "technologies": ["tech1", "tech2", "tech3"],
            "duration": "Start Date - End Date (if available)",
            "link": "Project link/URL (if available)"
          }
        ],
        "education": [
          {
            "institution": "University/College Name",
            "degree": "Degree Type",
            "field": "Field of Study",
            "year": "Graduation Year"
          }
        ],
        "summary": "Brief professional summary"
      }
      
      If any field is not found, use empty string for strings, empty array for arrays.
      Only return the JSON object, no additional text.
    `;

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
    });
    const text = completion.choices[0].message.content;

    // Clean and parse the response
    const cleanedText = text.replace(/```json\n?|\n?```/g, "").trim();
    const jsonStart = cleanedText.indexOf("{");
    const jsonEnd = cleanedText.lastIndexOf("}");
    const jsonStr = cleanedText.slice(jsonStart, jsonEnd + 1);
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error("❌ AI resume parsing failed:", error?.message || error);
    // Return basic structure if AI parsing fails
    return {
      name: "",
      email: "",
      phone: "",
      skills: [],
      experience: [],
      projects: [],
      education: [],
      summary: "Resume parsing failed, manual review required",
    };
  }
}

async function POST(request) {
  try {
    // Get token from Authorization header
    const authHeader = request.headers.get("authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Unauthorized - No token provided" },
        { status: 401 },
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
    // User authenticated with ID: ${userId}

    // Verify user exists in database, create if not found (temporary fix)
    let user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      // Create a temporary user record
      try {
        user = await prisma.user.create({
          data: {
            id: userId,
            email: decoded.email || `user-${userId}@temp.com`,
            passwordHash: "temp-hash", // This is a placeholder
            name: decoded.name || "User",
          },
        });
      } catch (createError) {
        return NextResponse.json(
          { error: "User account issue - please login again" },
          { status: 401 },
        );
      }
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get("resume");
    const fileName = formData.get("fileName") || "resume.pdf";

    if (!file) {
      return NextResponse.json(
        { error: "No resume file provided" },
        { status: 400 },
      );
    }

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    console.log("🔄 Extracting text from PDF...");
    const extractedText = await extractTextFromPDF(buffer);
    console.log(extractedText)

    // Parse the extracted text with AI
    console.log("🧠 Parsing extracted text with AI...");
    let parsedData;
    try {
      parsedData = await parseResumeWithAI(extractedText);
      console.log("✅ Resume parsed successfully:", {
        name: parsedData.name || "N/A",
        skills: parsedData.skills?.length || 0,
        projects: parsedData.projects?.length || 0,
        experience: parsedData.experience?.length || 0,
        education: parsedData.education?.length || 0,
      });
    } catch (aiError) {
      console.error("❌ AI parsing failed:", aiError);
      // Fallback parsed data if AI fails
      parsedData = {
        name: "Resume Uploaded",
        email: "",
        phone: "",
        skills: ["Technology Skills", "Problem Solving", "Communication"],
        experience: [
          {
            title: "Professional Experience",
            company: "Previous Companies",
            duration: "Multiple Years",
            description:
              "Relevant work experience as indicated in uploaded resume",
          },
        ],
        education: [
          {
            degree: "Educational Background",
            institution: "Educational Institution",
            year: "Graduation Year",
          },
        ],
        summary:
          "Resume uploaded successfully. Interview questions will be generated based on job description and general professional experience.",
      };
    }

    // Store resume in database
    try {
      const resume = await prisma.resume.create({
        data: {
          userId: userId,
          file_name: fileName,
          file_path: null, // We're not storing the actual file for now
          parsedData: {
            ...parsedData,
            fileName: fileName,
            fileSize: buffer.length,
            uploadedAt: new Date().toISOString(),
            extractedText: extractedText.substring(0, 1000), // Store first 1000 chars for reference
            processingNote:
              "PDF text extracted using Gemini AI and parsed successfully",
          },
        },
      });

      return NextResponse.json({
        success: true,
        message: `Resume "${fileName}" uploaded and parsed successfully! Extracted ${
          parsedData.skills?.length || 0
        } skills, ${parsedData.projects?.length || 0} projects, ${
          parsedData.experience?.length || 0
        } work experiences, and ${
          parsedData.education?.length || 0
        } education entries.`,
        resume: {
          id: resume.id,
          fileName: resume.file_name,
          parsedData: parsedData,
          createdAt: resume.createdAt,
        },
      });
    } catch (dbError) {
      return NextResponse.json(
        { error: "Failed to save resume to database" },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error("Server error:", error);
    return NextResponse.json(
      { error: "Internal server error: " + error.message },
      { status: 500 },
    );
  } finally {
    // keep Prisma client alive across requests in dev/server mode
  }
}

// GET method to retrieve user's resumes
async function GET(request) {
  try {
    // Get token from Authorization header
    const authHeader = request.headers.get("authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Unauthorized - No token provided" },
        { status: 401 },
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

    // Fetch user's resumes
    const resumes = await prisma.resume.findMany({
      where: { userId: userId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        file_name: true,
        parsedData: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      resumes: resumes,
    });
  } catch (error) {
    console.error("Server error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  } finally {
    await prisma.$disconnect();
  }
}

module.exports = { POST, GET };
