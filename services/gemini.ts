
import { Question, ValidationResponse, InterviewReport, Difficulty, APIKeyConfig, LLMProvider, LLMChatMessage } from '../types';
import { getLLMProvider } from './llmProvider';

/**
 * Initialize LLM provider with user's configured API keys
 */
export const initializeLLMProvider = (
  apiKeyConfigs?: APIKeyConfig[],
  primaryProvider?: LLMProvider
) => {
  getLLMProvider(apiKeyConfigs, primaryProvider);
};

function cleanJsonString(text: string): string {
  let cleaned = text.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/i, '').replace(/\s*```$/, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }
  return cleaned;
}

export function parseJsonFromLLM<T>(text: string): T | null {
  if (!text) return null;
  const cleaned = cleanJsonString(text);

  try {
    return JSON.parse(cleaned) as T;
  } catch {}

  const objectMatch = text.match(/\{[\s\S]*\}/);
  if (objectMatch) {
    try {
      const sanitized = objectMatch[0].replace(/,\s*([\}\]])/g, '$1');
      return JSON.parse(sanitized) as T;
    } catch {}
  }

  const arrayMatch = text.match(/\[[\s\S]*\]/);
  if (arrayMatch) {
    try {
      const sanitized = arrayMatch[0].replace(/,\s*([\}\]])/g, '$1');
      return JSON.parse(sanitized) as T;
    } catch {}
  }

  return null;
}

// --- Interview Logic ---

export const generateSubtopics = async (topic: string): Promise<string[]> => {
  try {
    const provider = getLLMProvider();
    const prompt = `List 5 distinct sub-topics or focus areas for a technical interview about "${topic}". Return only a JSON array of strings, like: ["Topic 1", "Topic 2", ...]`;

    return await provider.generateValidatedContent(prompt, (text) => {
      const parsed = parseJsonFromLLM<string[]>(text);
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : null;
    });
  } catch (error) {
    console.error("Error generating subtopics:", error);
    return ["General Knowledge", "Advanced Concepts", "Best Practices"];
  }
};

export const generateQuestion = async (topic: string, subtopic: string, difficulty: Difficulty, previousQuestions: string[]): Promise<Question> => {
  try {
    const provider = getLLMProvider();
    
    let difficultyContext = "";
    let persona = "";

    switch (difficulty) {
      case Difficulty.Beginner:
        persona = "a helpful Senior Developer interviewing a Junior candidate";
        difficultyContext = "Focus on core syntax, fundamental definitions, and basic usage patterns. Scenarios should be simple and common for a junior developer starting out. Avoid jargon without explanation.";
        break;
      case Difficulty.Intermediate:
        persona = "a rigorous Tech Lead interviewing a Mid-level candidate";
        difficultyContext = "Present a common professional scenario involving trade-offs, debugging, or standard design patterns. Focus on 'why' one approach is better than another in a specific context. Distractors should be plausible but slightly sub-optimal.";
        break;
      case Difficulty.Advanced:
        persona = "a Principal Architect or CTO interviewing a Senior Expert";
        difficultyContext = "Present high-stakes architectural challenges, performance bottlenecks at scale, deep internal mechanisms, or complex security edge cases. Include conflicting constraints to test expert-level judgment. Distractors must be 'expert traps' that look correct to less experienced developers.";
        break;
      default:
        persona = "a technical interviewer";
        difficultyContext = "General professional technical competency.";
    }

    const prompt = `
      You are acting as ${persona}.
      Generate a highly realistic, scenario-based technical interview question for "${topic}" specifically focusing on the sub-topic "${subtopic}".
      The target difficulty level is: "${difficulty.toUpperCase()}".
      
      CRITICAL INSTRUCTION FOR ${difficulty.toUpperCase()} DIFFICULTY:
      ${difficultyContext}
      
      The question should present a specific situation, problem, or technical challenge a developer might face.
      Provide 4 distinct, plausible options where one is clearly the most professional/correct choice and three are common misconceptions, anti-patterns, or sub-optimal choices for this seniority level.
      
      Avoid these previously used IDs if provided: ${JSON.stringify(previousQuestions)}.
      
      Return ONLY a JSON object with this structure:
      {
        "id": "unique-id-123",
        "text": "The full question text",
        "options": ["Option 1", "Option 2", "Option 3", "Option 4"]
      }
    `;

    return await provider.generateValidatedContent(prompt, (text) => {
      const data = parseJsonFromLLM<{ id?: string; text?: string; options?: string[] }>(text);
      if (!data || !data.text || !Array.isArray(data.options) || data.options.length < 2) {
        return null;
      }
      return {
        id: data.id || crypto.randomUUID(),
        text: data.text,
        options: data.options,
      };
    });
  } catch (error) {
    console.error("Error generating question:", error);
    throw error;
  }
};

export const validateAnswer = async (
  question: Question,
  userSelectedOptionIndex: number,
  explanation: string,
  attemptCount: number
): Promise<ValidationResponse> => {
  try {
    const provider = getLLMProvider();
    
    const selectedOption = question.options[userSelectedOptionIndex];
    const prompt = `
      Context: Technical Interview Validation
      Question: "${question.text}"
      Options: ${JSON.stringify(question.options)}
      User selected: "${selectedOption}" (Index: ${userSelectedOptionIndex})
      User reasoning: "${explanation}"
      Attempt number: ${attemptCount}

      TASK:
      1. Evaluate if the choice and reasoning are correct.
      2. If attemptCount >= 2 and user is still wrong, set shouldProceed to true and provide the correctAnswer text.
      3. Otherwise, provide a constructive hint if incorrect.
      
      Return ONLY a JSON object with this structure:
      {
        "status": "correct" or "incorrect" or "deviating",
        "feedback": "Detailed feedback or explanation",
        "hint": "A hint if they have attempts left (optional)",
        "shouldProceed": true or false,
        "correctAnswer": "The full text of the correct option (if status is incorrect and shouldProceed is true)"
      }
    `;

    return await provider.generateValidatedContent(prompt, (text) => {
      const parsed = parseJsonFromLLM<ValidationResponse>(text);
      return parsed && parsed.status && parsed.feedback ? parsed : null;
    });
  } catch (error) {
    console.error("Error validating answer:", error);
    throw error;
  }
};

export const generateInterviewReport = async (
  topic: string,
  history: any[]
): Promise<InterviewReport> => {
  try {
    const provider = getLLMProvider();
    
    const prompt = `
      Analyze this interview session on "${topic}".
      History: ${JSON.stringify(history)}
      Provide a balanced performance report.
      
      Return ONLY a JSON object with this structure:
      {
        "overallScore": 75,
        "summary": "Overall performance summary",
        "weakAreas": ["Area 1", "Area 2"],
        "strongAreas": ["Strength 1", "Strength 2"],
        "suggestedResources": [
          {"title": "Resource Title", "url": "https://example.com"}
        ]
      }
    `;

    return await provider.generateValidatedContent(prompt, (text) => {
      const parsed = parseJsonFromLLM<InterviewReport>(text);
      return parsed && typeof parsed.overallScore === 'number' && parsed.summary ? parsed : null;
    });
  } catch (error) {
    console.error("Error generating report:", error);
    throw error;
  }
};

// --- Chat Logic ---

export type CoachPersona = 'balanced' | 'dsa' | 'architect';

const COACH_INSTRUCTIONS: Record<CoachPersona, string> = {
  balanced: "You are a Senior Engineering Manager at a Tier-1 tech company. You provide balanced coaching on technical accuracy, behavioral nuances, and industry culture. Your tone is supportive but professional.",
  dsa: "You are a Competitive Programming Expert and Algorithms Specialist. You focus on Big O complexity, data structure optimization, and edge cases. Your responses are highly technical, precise, and rigorous.",
  architect: "You are a Principal Cloud Architect. You focus on system design, scalability, distributed systems, and technical trade-offs. You always look at the 'big picture' and architectural principles."
};

export const streamCoachResponse = async function* (
  history: Array<{ role: 'user' | 'model'; text: string }>,
  persona: CoachPersona = 'balanced'
): AsyncGenerator<string> {
  const provider = getLLMProvider();
  const conversationMessages: LLMChatMessage[] = history
    .filter(
      (message) =>
        message.text.trim().length > 0 &&
        !message.text.startsWith('Switching focus to ') &&
        !message.text.startsWith('Session reset.')
    )
    .map(
      (message): LLMChatMessage => ({
        role: message.role === 'model' ? 'assistant' : 'user',
        content: message.text.trim(),
      })
    );

  const messages: LLMChatMessage[] = [
    { role: 'system', content: COACH_INSTRUCTIONS[persona] },
    ...conversationMessages,
  ];

  yield* provider.streamChat(messages);
};
