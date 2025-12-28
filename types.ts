
export enum Difficulty {
  Beginner = "Beginner",
  Intermediate = "Intermediate",
  Advanced = "Advanced",
}

export interface User {
  id: string;
  name: string;
  email?: string;
  isGuest: boolean;
  avatarUrl?: string;
  preferences?: {
    theme: 'light' | 'dark';
  };
}

export interface Question {
  id: string;
  text: string;
  options: string[];
  correctOptionIndex?: number; // Internal use, maybe hidden from client initially
}

export interface AnswerAttempt {
  questionId: string;
  selectedOptionIndex: number;
  explanation: string;
  isCorrect: boolean;
  feedback: string;
  timestamp: number;
}

export interface InterviewSession {
  id: string;
  topic: string;
  subTopic: string;
  difficulty: Difficulty;
  date: string;
  score: number;
  totalQuestions: number;
  history: AnswerAttempt[];
  feedbackReport?: InterviewReport;
}

export interface InterviewReport {
  overallScore: number; // 0-100
  summary: string;
  weakAreas: string[];
  strongAreas: string[];
  suggestedResources: Array<{ title: string; url: string }>;
}

export interface ValidationResponse {
  status: 'correct' | 'incorrect' | 'deviating';
  feedback: string;
  hint?: string;
  correctAnswer?: string; // Revealed if too many attempts
  shouldProceed: boolean;
}

// Aspect ratios officially supported by Gemini image generation models
export enum AspectRatio {
  "1:1" = "1:1",
  "3:4" = "3:4",
  "4:3" = "4:3",
  "9:16" = "9:16",
  "16:9" = "16:9"
}

// Image sizes supported by gemini-3-pro-image-preview
export enum ImageSize {
  "1K" = "1K",
  "2K" = "2K",
  "4K" = "4K"
}
