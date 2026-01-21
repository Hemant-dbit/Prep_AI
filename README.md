# Prep-AI 🎯

> AI-powered interview preparation platform with real-time feedback and performance analytics.

[![Next.js](https://img.shields.io/badge/Next.js-15.4.5-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-6.16.2-2D3748?style=flat-square&logo=prisma)](https://www.prisma.io/)

**🌐 Live Demo:** [https://prep-ai-eosin.vercel.app/](https://prep-ai-eosin.vercel.app/)

## 🌟 Overview

**Prep-AI** combines AI, computer vision, and NLP to provide comprehensive interview practice with real-time feedback on verbal and non-verbal communication.

### Key Features

- 🎯 **AI-Powered Questions** - Personalized questions based on your resume and job description (Google Gemini API)
- 🎥 **Real-Time Monitoring** - Facial expression and engagement tracking (MediaPipe FaceMesh)
- 📊 **Performance Analytics** - Track progress with detailed metrics and insights
- 📄 **Resume Analysis** - AI-powered feedback on your resume and skill gaps
- 🗣️ **Speech-to-Text** - Convert spoken answers to text for detailed analysis

## 🛠 Tech Stack

**Frontend:** Next.js 15.4.5, TypeScript, Tailwind CSS, Radix UI, Framer Motion, Chart.js  
**Backend:** Next.js API Routes, Prisma, PostgreSQL, JWT + Google OAuth  
**AI/ML:** Google Gemini API, MediaPipe FaceMesh, WebRTC

## 📋 Prerequisites

- Node.js (v18+)
- PostgreSQL (v14+)
- Google Gemini API key

## 🚀 Quick Start

```bash
# Clone and install
git clone https://github.com/yourusername/prep-ai.git
cd prep-ai
npm install

# Configure environment
cp .env.example .env
# Edit .env with your DATABASE_URL, JWT_SECRET, and GEMINI_API_KEY

# Set up database
npm run db:migrate

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) or visit the live demo at [https://prep-ai-eosin.vercel.app/](https://prep-ai-eosin.vercel.app/)

## 🔌 Key API Endpoints

- `POST /api/auth/signup` - User registration
- `POST /api/auth/login` - User authentication
- `POST /api/interview/generate-questions` - Generate interview questions
- `POST /api/interview/answer` - Submit and evaluate answers
- `POST /api/resume/upload` - Upload and parse resume
- `GET /api/analytics` - Get performance metrics
