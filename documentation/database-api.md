# Database and API Documentation

## Database Schema

### Users and Authentication

```prisma
model User {
  id            String    @id @default(uuid())
  email         String    @unique
  name          String?
  password      String?   // Hashed
  role          UserRole  @default(USER)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  interviews    Interview[]
  goals         Goal[]
  resumes       Resume[]
  subscription  Subscription?
}

model Subscription {
  id        String   @id @default(uuid())
  userId    String   @unique
  plan      Plan     @default(FREE)
  startDate DateTime @default(now())
  endDate   DateTime?
  status    SubStatus
  user      User     @relation(fields: [userId], references: [id])
}
```

### Interview System

```prisma
model Interview {
  id          String    @id @default(uuid())
  userId      String
  startTime   DateTime  @default(now())
  endTime     DateTime?
  status      InterviewStatus
  score       Float?
  feedback    String?
  questions   Question[]
  answers     Answer[]
  warnings    Warning[]
  user        User      @relation(fields: [userId], references: [id])
}

model Question {
  id           String    @id @default(uuid())
  interviewId  String
  question     String
  category     String
  difficulty   String
  timeToAnswer String
  order        Int
  answer       Answer?
  interview    Interview @relation(fields: [interviewId], references: [id])
}

model Answer {
  id           String    @id @default(uuid())
  questionId   String    @unique
  interviewId  String
  answer       String
  score        Float?
  feedback     String?
  duration     Int?      // in seconds
  question     Question  @relation(fields: [questionId], references: [id])
  interview    Interview @relation(fields: [interviewId], references: [id])
}
```

### Resume Analysis

```prisma
model Resume {
  id          String    @id @default(uuid())
  userId      String
  fileUrl     String
  analysis    Analysis?
  skills      Skill[]
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  user        User      @relation(fields: [userId], references: [id])
}

model Analysis {
  id          String    @id @default(uuid())
  resumeId    String    @unique
  summary     String
  suggestions String[]
  score       Float
  resume      Resume    @relation(fields: [resumeId], references: [id])
}
```

## API Routes

### Authentication Routes

```typescript
// Login
POST / api / auth / login;
body: {
  email: string;
  password: string;
}

// Signup
POST / api / auth / signup;
body: {
  email: string;
  password: string;
  name: string;
}

// Google OAuth
GET / api / auth / google;
GET / api / auth / google / callback;

// Password Reset
POST / api / auth / forgot - password;
POST / api / auth / reset - password;
POST / api / auth / validate - reset - token;
```

### Interview Routes

```typescript
// Interview Management
POST /api/interview/create
body: {
  role: string
  experience: number
  specialization?: string
}

// Question Generation
POST /api/interview/generate-questions
body: {
  role: string
  count: number
  difficulty?: string
}

// Answer Submission
POST /api/interview/answer
body: {
  interviewId: string
  questionId: string
  answer: string
  duration: number
}

// Interview Control
POST /api/interview/finish
POST /api/interview/terminate
GET /api/interview/score

// Session Management
GET /api/interview/sessions
GET /api/interview/[interviewId]
```

### Resume Routes

```typescript
// Resume Management
POST /api/resume/upload
GET /api/resume/details/[id]
DELETE /api/resume/delete/[id]

// Analysis
POST /api/resume/analyze
body: {
  resumeId: string
}
```

## API Integration Examples

### Interview Creation

```typescript
// Create new interview
async function createInterview(role: string, experience: number) {
  const response = await fetch("/api/interview/create", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ role, experience }),
  });

  const { interviewId, questions } = await response.json();
  return { interviewId, questions };
}
```

### Answer Submission and Evaluation

```typescript
async function submitAnswer(params: {
  interviewId: string;
  questionId: string;
  answer: string;
  duration: number;
}) {
  const response = await fetch("/api/interview/answer", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(params),
  });

  const { score, feedback } = await response.json();
  return { score, feedback };
}
```

## Error Handling

```typescript
// API Error Structure
interface ApiError {
  code: string;
  message: string;
  details?: any;
}

// Common Error Codes
const ErrorCodes = {
  UNAUTHORIZED: "auth/unauthorized",
  INVALID_INPUT: "validation/invalid-input",
  INTERVIEW_NOT_FOUND: "interview/not-found",
  QUESTION_NOT_FOUND: "question/not-found",
  RESUME_UPLOAD_FAILED: "resume/upload-failed",
  ANALYSIS_FAILED: "analysis/failed",
};
```
