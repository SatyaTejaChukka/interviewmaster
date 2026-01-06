
import { GoogleGenAI, Type } from "@google/genai";
import { Question, ValidationResponse, InterviewReport, Difficulty, AspectRatio, ImageSize } from '../types';

/**
 * Internal helper to handle calls to Gemini 3 Pro models.
 * If a 'Requested entity was not found' error occurs, it triggers the key selection dialog.
 */
const callGeminiPro = async (logic: (ai: any) => Promise<any>) => {
  try {
    const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
    return await logic(ai);
  } catch (error: any) {
    console.error("Gemini Pro Call Error:", error);
    // As per guidelines, if entity is not found, we must prompt for a new key.
    if (error?.message?.includes("Requested entity was not found.")) {
      const aistudio = (window as any).aistudio;
      if (aistudio && typeof aistudio.openSelectKey === 'function') {
        await aistudio.openSelectKey();
      }
    }
    throw error;
  }
};

// --- Interview Logic ---

export const generateSubtopics = async (topic: string): Promise<string[]> => {
  const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `List 5 distinct sub-topics or focus areas for a technical interview about "${topic}". Return only a JSON array of strings.`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      }
    });
    return JSON.parse(response.text || '[]') as string[];
  } catch (error) {
    console.error("Error generating subtopics:", error);
    return ["General Knowledge", "Advanced Concepts", "Best Practices"];
  }
};

export const generateQuestion = async (topic: string, subtopic: string, difficulty: Difficulty, previousQuestions: string[]): Promise<Question> => {
  return callGeminiPro(async (ai) => {
    let difficultyContext = "";
    let persona = "";
    let thinkingBudget = 0;

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
        thinkingBudget = 2000; // Allocate thinking budget for complex advanced questions
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
      Return strictly a JSON object.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        thinkingConfig: thinkingBudget > 0 ? { thinkingBudget } : undefined,
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING, description: "A unique identifier for the question" },
            text: { type: Type.STRING, description: "The scenario and the question itself" },
            options: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Exactly 4 multiple choice options" },
          },
          required: ['text', 'options']
        }
      }
    });
    
    const data = JSON.parse(response.text || '{}');
    return {
      id: data.id || crypto.randomUUID(),
      text: data.text,
      options: data.options
    };
  });
};

export const validateAnswer = async (
  question: Question,
  userSelectedOptionIndex: number,
  explanation: string,
  attemptCount: number
): Promise<ValidationResponse> => {
  return callGeminiPro(async (ai) => {
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
      2. If attemptCount >= 2 and user is still wrong, set shouldProceed to true, provide the correctAnswer text, and in feedback, provide a brief, high-impact explanation of why that answer is the industry standard.
      3. Otherwise, provide a constructive hint if incorrect.
      
      Return strictly JSON.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            status: { type: Type.STRING, enum: ['correct', 'incorrect', 'deviating'] },
            feedback: { type: Type.STRING, description: "Detailed feedback or explanation" },
            hint: { type: Type.STRING, description: "A hint if they have attempts left" },
            shouldProceed: { type: Type.BOOLEAN, description: "True if correct OR if max attempts reached" },
            correctAnswer: { type: Type.STRING, description: "The full text of the correct option" }
          },
          required: ['status', 'feedback', 'shouldProceed']
        }
      }
    });
    return JSON.parse(response.text || '{}') as ValidationResponse;
  });
};

export const generateInterviewReport = async (
  topic: string,
  history: any[]
): Promise<InterviewReport> => {
  return callGeminiPro(async (ai) => {
    const prompt = `
      Analyze this interview session on "${topic}".
      History: ${JSON.stringify(history)}
      Provide a balanced performance report.
      Return JSON.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            overallScore: { type: Type.NUMBER },
            summary: { type: Type.STRING },
            weakAreas: { type: Type.ARRAY, items: { type: Type.STRING } },
            strongAreas: { type: Type.ARRAY, items: { type: Type.STRING } },
            suggestedResources: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  url: { type: Type.STRING }
                }
              }
            }
          },
          required: ['overallScore', 'summary', 'weakAreas', 'suggestedResources']
        }
      }
    });
    return JSON.parse(response.text || '{}') as InterviewReport;
  });
};

// --- Chat Logic ---

export type CoachPersona = 'balanced' | 'dsa' | 'architect';

export const createChatSession = (history?: any[], persona: CoachPersona = 'balanced') => {
  const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
  
  const instructions: Record<CoachPersona, string> = {
    balanced: "You are a Senior Engineering Manager at a Tier-1 tech company. You provide balanced coaching on technical accuracy, behavioral nuances, and industry culture. Your tone is supportive but professional.",
    dsa: "You are a Competitive Programming Expert and Algorithms Specialist. You focus on Big O complexity, data structure optimization, and edge cases. Your responses are highly technical, precise, and rigorous.",
    architect: "You are a Principal Cloud Architect. You focus on system design, scalability, distributed systems, and technical trade-offs. You always look at the 'big picture' and architectural principles."
  };

  return ai.chats.create({
    model: 'gemini-3-flash-preview', // Flash is significantly faster for conversational interfaces
    history: history,
    config: {
      systemInstruction: instructions[persona],
    }
  });
};

// --- Image Generation ---

export const generateTopicBadge = async (prompt: string, aspectRatio: AspectRatio, imageSize: ImageSize): Promise<string | null> => {
  const model = (imageSize === ImageSize["2K"] || imageSize === ImageSize["4K"]) 
    ? 'gemini-3-pro-image-preview' 
    : 'gemini-2.5-flash-image';

  try {
    const aistudio = (window as any).aistudio;
    if (model === 'gemini-3-pro-image-preview' && aistudio) {
      const hasKey = await aistudio.hasSelectedApiKey();
      if (!hasKey) {
        await aistudio.openSelectKey();
      }
    }

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model,
      contents: {
        parts: [
          { text: `Professional achievement icon for: ${prompt}. Clean, modern, centered vector style.` }
        ]
      },
      config: {
        imageConfig: {
          aspectRatio: aspectRatio as any,
          imageSize: model === 'gemini-3-pro-image-preview' ? imageSize : undefined
        }
      }
    });

    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
      }
    }
    return null;
  } catch (error: any) {
    console.error("Error generating badge:", error);
    if (error?.message?.includes("Requested entity was not found.") && model === 'gemini-3-pro-image-preview') {
      const aistudio = (window as any).aistudio;
      if (aistudio && typeof aistudio.openSelectKey === 'function') {
        await aistudio.openSelectKey();
      }
    }
    return null;
  }
};
