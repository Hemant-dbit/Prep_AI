# Prep-AI Project Documentation

## Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Key Features](#key-features)
4. [Technical Components](#technical-components)
5. [Database Structure](#database-structure)
6. [API Integration](#api-integration)
7. [Interview System](#interview-system)
8. [Authentication](#authentication)

## Project Overview

Prep-AI is an AI-powered interview preparation platform that helps users practice and improve their interviewing skills. The application provides real-time feedback, monitors user behavior, and offers personalized coaching through various features.

## Architecture

### Tech Stack

- Frontend: Next.js 15.4.5 with TypeScript
- Backend: Next.js API Routes
- Database: Prisma with PostgreSQL
- AI: Google's Gemini API
- Authentication: Custom JWT + Google OAuth
- Media: WebRTC for camera handling
- Face Detection: MediaPipe

### Directory Structure

```
src/
├── app/                 # Next.js App Router
│   ├── api/            # API Routes
│   ├── home/           # Dashboard and main features
│   └── interview/      # Interview related pages
├── components/         # React components
├── lib/               # Utilities and helpers
└── hooks/             # Custom React hooks
```

## Key Features

### 1. Interview Monitoring System

The interview monitoring system uses MediaPipe for face detection and tracking. Key components:

- `useInterviewMonitoring` Hook (`src/hooks/useInterviewMonitoring.ts`):
  - Manages camera stream and face detection
  - Tracks user attention and gaze
  - Handles warnings for:
    - Looking away from camera
    - Multiple faces detected
    - Tab switching
  - Uses WebRTC and MediaPipe FaceMesh
  - Cleanup protocols for camera resources

### 2. AI Interview System

The interview system leverages Gemini API for:

- Question generation based on job role
- Real-time answer evaluation
- Feedback generation
- Score calculation

Components:

- Question Generation (`src/app/api/interview/generate-questions/route.js`)
- Answer Analysis (`src/app/api/interview/answer/route.js`)
- Session Management (`src/app/api/interview/sessions/route.js`)

### 3. Resume Analysis

The platform provides resume analysis features:

- Skill extraction
- Experience analysis
- Targeted question generation
- Improvement suggestions

### 4. Analytics Dashboard

Comprehensive analytics tracking:

- Interview performance metrics
- Practice session history
- Skill progression
- Areas for improvement

## Technical Components

### Camera and Face Detection

```typescript
// MediaPipe Integration
const initializeMediaPipe = async () => {
  // FaceMesh configuration
  const faceMesh = new FaceMesh({
    locateFile: (file) =>
      `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
  });

  // Detection settings
  faceMesh.setOptions({
    maxNumFaces: 4,
    refineLandmarks: true,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5,
  });
};

// Camera Stream Management
const startCameraMonitoring = async () => {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: {
      facingMode: "user",
      width: { ideal: 640, max: 1280 },
      height: { ideal: 480, max: 720 },
    },
    audio: false,
  });
};
```

### Interview Flow

1. User starts interview
2. System initializes camera monitoring
3. Questions are generated via Gemini API
4. User provides answers (video/text)
5. Real-time monitoring for:
   - Face presence
   - Eye contact
   - Tab switching
6. Answer evaluation and feedback
7. Session completion and score generation

## Database Structure

### Core Tables

#### Users

```sql
Table users {
  id String @id @default(uuid())
  email String @unique
  name String?
  password String?
  role UserRole @default(USER)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

#### Interviews

```sql
Table interviews {
  id String @id @default(uuid())
  userId String
  startTime DateTime @default(now())
  endTime DateTime?
  status InterviewStatus
  score Float?
  questions Question[]
  answers Answer[]
}
```

#### Questions

```sql
Table questions {
  id String @id @default(uuid())
  interviewId String
  question String
  category String
  difficulty String
  timeToAnswer String
  order Int
}
```

## API Integration

### Gemini API Integration

```typescript
// Question Generation
const generateQuestions = async (role: string, experience: number) => {
  const prompt = `Generate interview questions for ${role} position...`;
  const response = await geminiModel.generateContent(prompt);
  return processGeminiResponse(response);
};

// Answer Evaluation
const evaluateAnswer = async (question: string, answer: string) => {
  const prompt = `Evaluate this answer: Question: ${question}, Answer: ${answer}`;
  const evaluation = await geminiModel.generateContent(prompt);
  return processEvaluation(evaluation);
};
```
