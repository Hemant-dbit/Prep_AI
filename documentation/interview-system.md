# Interview System Technical Documentation

## Camera Monitoring System

### Components and Flow

#### 1. Interview UI Component (`src/components/InterviewUI.tsx`)

- Manages the overall interview interface
- Handles state for:
  - Interview progress
  - Question display
  - Answer recording
  - Warning system

```typescript
const InterviewUI = ({
  interviewId,
  questions,
  onComplete,
  // ... other props
}) => {
  const {
    videoRef,
    startCameraMonitoring,
    stopCameraMonitoring,
    detectionStatus,
  } = useInterviewMonitoring({
    onWarning: handleWarning,
    onInterviewTerminated: handleTermination,
    maxWarnings: 3,
  });
};
```

#### 2. Camera Monitoring Hook (`src/hooks/useInterviewMonitoring.ts`)

- Core functionality for camera and face detection
- Features:

  1. Face Detection

     - Uses MediaPipe FaceMesh
     - Tracks facial landmarks
     - Detects eye openness
     - Monitors gaze direction

  2. Stream Management

     ```typescript
     const streamManagement = {
       initialization: async () => {
         const stream = await navigator.mediaDevices.getUserMedia({...});
         streamRef.current = stream;
       },
       cleanup: () => {
         if (streamRef.current) {
           streamRef.current.getTracks().forEach(track => {
             track.enabled = false;
             track.stop();
           });
         }
       }
     };
     ```

  3. Warning System
     - Tracks violations:
       - Looking away from camera
       - Multiple faces detected
       - Tab switching
     - Issues warnings with configurable thresholds
     - Terminates interview after max warnings

#### 3. Face Detection System

- Uses MediaPipe FaceMesh for real-time face tracking
- Features tracked:
  ```typescript
  const detectionFeatures = {
    facePresence: "Detects if a face is visible",
    eyeOpenness: "Measures eye height to determine if eyes are open",
    gazeDirection: "Tracks nose position relative to face center",
    multiplefaces: "Counts number of faces in frame",
  };
  ```

### Cleanup and Resource Management

1. Camera Cleanup Sequence

   ```typescript
   const cleanupSequence = [
     "1. Disable video tracks",
     "2. Stop MediaPipe camera",
     "3. Close FaceMesh",
     "4. Clear timeouts",
     "5. Remove event listeners",
     "6. Reset state",
   ];
   ```

2. Event Handling

   - Window visibility changes
   - Tab switching
   - Browser closing
   - Component unmounting

3. State Management
   - Tracking interview status
   - Managing warnings
   - Handling termination

## Gemini API Integration

### Question Generation System

1. Question Generation Flow

   ```typescript
   async function generateInterviewQuestions({
     role,
     experience,
     specialization,
   }) {
     const context = buildPromptContext(role, experience);
     const questions = await geminiModel.generateContent(context);
     return processAndStructureQuestions(questions);
   }
   ```

2. Answer Evaluation
   ```typescript
   async function evaluateAnswer({ question, answer, role, experience }) {
     const evaluationPrompt = buildEvaluationPrompt({
       question,
       answer,
       role,
       experience,
     });
     const evaluation = await geminiModel.generateContent(evaluationPrompt);
     return {
       score: calculateScore(evaluation),
       feedback: generateFeedback(evaluation),
       suggestions: extractSuggestions(evaluation),
     };
   }
   ```

### Real-time Processing

1. Stream Processing

   - Real-time transcription
   - Answer evaluation
   - Feedback generation

2. Response Formatting
   ```typescript
   const formatResponse = (geminiResponse) => ({
     score: normalizeScore(geminiResponse.score),
     feedback: structureFeedback(geminiResponse.feedback),
     improvements: categorizeImprovements(geminiResponse.suggestions),
   });
   ```

## Security and Performance

### Security Measures

1. Camera Access

   - Permission handling
   - Secure stream management
   - Resource cleanup

2. API Security
   - Rate limiting
   - Request validation
   - Error handling

### Performance Optimization

1. Camera Stream

   ```typescript
   const optimizedStreamSettings = {
     video: {
       width: { ideal: 640, max: 1280 },
       height: { ideal: 480, max: 720 },
       frameRate: { ideal: 30, max: 60 },
     },
   };
   ```

2. Face Detection

   - Optimized detection frequency
   - Resource-aware processing
   - Memory management

3. API Calls
   - Request batching
   - Response caching
   - Error retry logic
