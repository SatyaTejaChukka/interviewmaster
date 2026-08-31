
export enum Difficulty {
  Beginner = "Beginner",
  Intermediate = "Intermediate",
  Advanced = "Advanced",
}

export enum LLMProvider {
  Nvidia = 'nvidia',
  Gemini = 'gemini',
  Groq = 'groq',
  Claude = 'claude',
  Mistral = 'mistral',
  OpenRouter = 'openrouter',
}

export interface LLMChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface APIKeyConfig {
  provider: LLMProvider;
  apiKey: string;
  isActive: boolean;
}

export interface ProviderUsageStats {
  provider: LLMProvider;
  requestsToday: number;
  tokensConsumed: number;
  successCount: number;
  failureCount: number;
  lastUsed: number | null;
  avgResponseTime: number; // milliseconds
  isHealthy: boolean;
}

export interface UsageDashboard {
  totalRequests: number;
  totalTokens: number;
  estimatedCost: number;
  providerStats: ProviderUsageStats[];
  lastReset: number;
}

export interface User {
  id: string;
  name: string;
  email?: string;
  isGuest: boolean;
  avatarUrl?: string;
  preferences?: {
    theme: 'light' | 'dark';
    apiKeys?: APIKeyConfig[];
    primaryProvider?: LLMProvider;
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
