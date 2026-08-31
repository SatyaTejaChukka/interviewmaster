import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  LLMProvider,
  APIKeyConfig,
  ProviderUsageStats,
  UsageDashboard,
  LLMChatMessage,
} from '../types';

const STORAGE_KEY = 'llm_usage_stats';
const RESET_INTERVAL_MS = 24 * 60 * 60 * 1000;
const NVIDIA_INVOKE_URL = 'https://integrate.api.nvidia.com/v1/chat/completions';
const GROQ_MODELS = [
  'llama-3.1-8b-instant',
  'llama-3.3-70b-versatile',
  'llama3-8b-8192',
  'llama3-70b-8192',
  'gemma2-9b-it',
  'deepseek-r1-distill-llama-70b',
  'qwen-2.5-32b',
] as const;
const GEMINI_MODELS = [
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-1.5-flash',
  'gemini-1.5-pro',
] as const;
const OPENROUTER_MODELS = [
  'meta-llama/llama-3.3-70b-instruct:free',
  'meta-llama/llama-3.1-8b-instruct:free',
  'google/gemini-2.0-flash-exp:free',
  'mistralai/mistral-7b-instruct:free',
  'auto',
] as const;

class RateLimiter {
  private requestQueue: Array<() => Promise<void>> = [];
  private isProcessing = false;
  private lastRequestTime = 0;
  private minDelayMs: number;

  constructor(requestsPerMinute: number) {
    this.minDelayMs = 60000 / requestsPerMinute;
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.requestQueue.push(async () => {
        try {
          const now = Date.now();
          const timeSinceLastRequest = now - this.lastRequestTime;

          if (timeSinceLastRequest < this.minDelayMs) {
            await new Promise((wait) =>
              setTimeout(wait, this.minDelayMs - timeSinceLastRequest)
            );
          }

          this.lastRequestTime = Date.now();
          await fn().then(resolve, reject);
        } catch (error) {
          reject(error);
        }
      });

      this.processQueue();
    });
  }

  async waitForTurn(): Promise<void> {
    await this.execute(async () => undefined);
  }

  private async processQueue() {
    if (this.isProcessing || this.requestQueue.length === 0) return;

    this.isProcessing = true;
    const fn = this.requestQueue.shift();

    if (fn) {
      try {
        await fn();
      } catch (error) {
        console.error('Error processing queued request:', error);
      }
    }

    this.isProcessing = false;
    if (this.requestQueue.length > 0) {
      this.processQueue();
    }
  }
}

export class LLMProviderService {
  private nvidiaLimiter = new RateLimiter(20);
  private geminiLimiter = new RateLimiter(10);
  private groqLimiter = new RateLimiter(30);
  private anthropicLimiter = new RateLimiter(10);
  private mistralLimiter = new RateLimiter(20);
  private openRouterLimiter = new RateLimiter(10);

  private apiKeys: Map<LLMProvider, string> = new Map();
  private primaryProvider: LLMProvider = LLMProvider.Nvidia;
  private usageStats: Map<LLMProvider, ProviderUsageStats> = new Map();
  private lastReset: number = Date.now();

  constructor(apiKeyConfigs?: APIKeyConfig[], primaryProvider?: LLMProvider) {
    this.loadUsageStats();
    this.updateConfiguration(apiKeyConfigs, primaryProvider);
  }

  updateConfiguration(
    apiKeyConfigs?: APIKeyConfig[],
    primaryProvider?: LLMProvider
  ): void {
    this.apiKeys.clear();

    const envKeys: Partial<Record<LLMProvider, string | undefined>> = {
      [LLMProvider.Nvidia]: (import.meta as any).env.VITE_NVIDIA_API_KEY,
      [LLMProvider.Gemini]: (import.meta as any).env.VITE_GEMINI_API_KEY,
      [LLMProvider.Groq]: (import.meta as any).env.VITE_GROQ_API_KEY,
      [LLMProvider.Claude]: (import.meta as any).env.VITE_CLAUDE_API_KEY,
      [LLMProvider.Mistral]: (import.meta as any).env.VITE_MISTRAL_API_KEY,
      [LLMProvider.OpenRouter]: (import.meta as any).env.VITE_OPENROUTER_API_KEY,
    };

    Object.entries(envKeys).forEach(([provider, apiKey]) => {
      if (apiKey?.trim()) {
        this.apiKeys.set(
          provider as LLMProvider,
          this.normalizeApiKey(provider as LLMProvider, apiKey)
        );
      }
    });

    apiKeyConfigs?.forEach((config) => {
      if (config.isActive !== false && config.apiKey?.trim()) {
        this.apiKeys.set(
          config.provider,
          this.normalizeApiKey(config.provider, config.apiKey)
        );
      }
    });

    if (primaryProvider) {
      this.primaryProvider = primaryProvider;
    }

    if (!this.apiKeys.has(this.primaryProvider)) {
      this.primaryProvider =
        this.getFirstConfiguredProvider() || LLMProvider.Nvidia;
    }

    this.apiKeys.forEach((_, provider) => {
      if (!this.usageStats.has(provider)) {
        this.initializeProviderStats(provider);
      }
    });
  }

  private getFirstConfiguredProvider(): LLMProvider | null {
    const configured = this.apiKeys.keys().next();
    return configured.done ? null : configured.value;
  }

  private normalizeApiKey(provider: LLMProvider, apiKey: string): string {
    const trimmed = apiKey.trim();

    if (provider === LLMProvider.Nvidia && trimmed && !trimmed.startsWith('nvapi-')) {
      return `nvapi-${trimmed}`;
    }

    return trimmed;
  }

  private initializeProviderStats(provider: LLMProvider): void {
    this.usageStats.set(provider, {
      provider,
      requestsToday: 0,
      tokensConsumed: 0,
      successCount: 0,
      failureCount: 0,
      lastUsed: null,
      avgResponseTime: 0,
      isHealthy: true,
    });
  }

  private loadUsageStats(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);

        if (Date.now() - data.lastReset > RESET_INTERVAL_MS) {
          this.resetUsageStats();
          return;
        }

        this.lastReset = data.lastReset;
        Object.entries(data.stats || {}).forEach(([provider, stats]) => {
          this.usageStats.set(provider as LLMProvider, stats as ProviderUsageStats);
        });
      }
    } catch (error) {
      console.error('Failed to load usage stats:', error);
      this.resetUsageStats();
    }
  }

  private saveUsageStats(): void {
    try {
      const stats: Record<string, ProviderUsageStats> = {};
      this.usageStats.forEach((value, key) => {
        stats[key] = value;
      });

      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          lastReset: this.lastReset,
          stats,
        })
      );
    } catch (error) {
      console.error('Failed to save usage stats:', error);
    }
  }

  private resetUsageStats(): void {
    this.lastReset = Date.now();
    this.usageStats.forEach((stats) => {
      stats.requestsToday = 0;
      stats.tokensConsumed = 0;
      stats.successCount = 0;
      stats.failureCount = 0;
    });
    this.saveUsageStats();
  }

  private trackRequest(
    provider: LLMProvider,
    success: boolean,
    responseTime: number,
    tokensUsed: number = 0
  ): void {
    let stats = this.usageStats.get(provider);
    if (!stats) {
      this.initializeProviderStats(provider);
      stats = this.usageStats.get(provider)!;
    }

    stats.requestsToday++;
    stats.tokensConsumed += tokensUsed;
    stats.lastUsed = Date.now();

    if (success) {
      stats.successCount++;
      stats.isHealthy = true;
    } else {
      stats.failureCount++;
      const totalRequests = stats.successCount + stats.failureCount;
      stats.isHealthy = stats.failureCount / totalRequests < 0.5;
    }

    const totalRequests = stats.successCount + stats.failureCount;
    stats.avgResponseTime =
      (stats.avgResponseTime * (totalRequests - 1) + responseTime) / totalRequests;

    this.saveUsageStats();
  }

  private getProviderPriority(): LLMProvider[] {
    const configured: LLMProvider[] = [];

    if (this.apiKeys.has(this.primaryProvider)) {
      configured.push(this.primaryProvider);
    }

    const all = [
      LLMProvider.Nvidia,
      LLMProvider.Gemini,
      LLMProvider.Groq,
      LLMProvider.Claude,
      LLMProvider.Mistral,
      LLMProvider.OpenRouter,
    ];

    for (const provider of all) {
      if (provider !== this.primaryProvider && this.apiKeys.has(provider)) {
        configured.push(provider);
      }
    }

    return configured;
  }

  async request<T>(
    requestFn: (provider: LLMProvider, apiKey: string) => Promise<T>,
    providersToTry?: LLMProvider[]
  ): Promise<T> {
    const providers = providersToTry || this.getProviderPriority();

    if (providers.length === 0) {
      throw new Error('No LLM providers configured. Add an API key in Profile or set a VITE_* key in your environment.');
    }

    let lastError: Error | null = null;
    const providerErrors: string[] = [];

    for (const provider of providers) {
      const startTime = Date.now();
      try {
        const apiKey = this.apiKeys.get(provider);
        if (!apiKey) continue;

        const limiter = this.getLimiter(provider);
        const result = await limiter.execute(() => requestFn(provider, apiKey));

        const responseTime = Date.now() - startTime;
        const tokensUsed = this.estimateTokens(String(result));
        this.trackRequest(provider, true, responseTime, tokensUsed);

        return result;
      } catch (error) {
        const responseTime = Date.now() - startTime;
        this.trackRequest(provider, false, responseTime);

        lastError = error as Error;
        providerErrors.push(`${provider}: ${lastError.message}`);
        console.warn(`Provider ${provider} failed, trying next...`, error);
      }
    }

    throw new Error(
      `All LLM providers failed. ${providerErrors.join(' | ') || `Last error: ${lastError?.message}`}`
    );
  }

  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  async generateContent(prompt: string): Promise<string> {
    return this.request(async (provider, apiKey) =>
      this.callProviderGenerate(provider, apiKey, prompt)
    );
  }

  async generateValidatedContent<T>(
    prompt: string,
    validate: (text: string) => T | null
  ): Promise<T> {
    const providers = this.getProviderPriority();

    if (providers.length === 0) {
      throw new Error(
        'No LLM providers configured. Add an API key in Profile or set a VITE_* key in your environment.'
      );
    }

    const errors: string[] = [];

    for (const provider of providers) {
      const startTime = Date.now();
      try {
        const apiKey = this.apiKeys.get(provider);
        if (!apiKey) continue;

        const limiter = this.getLimiter(provider);
        const text = await limiter.execute(() =>
          this.callProviderGenerate(provider, apiKey, prompt)
        );
        const parsed = validate(text);

        const responseTime = Date.now() - startTime;
        if (parsed !== null) {
          this.trackRequest(provider, true, responseTime, this.estimateTokens(text));
          return parsed;
        }

        this.trackRequest(provider, false, responseTime);
        errors.push(`${provider}: invalid response format`);
        console.warn(`Provider ${provider} returned unparseable content, trying next...`);
      } catch (error) {
        const responseTime = Date.now() - startTime;
        this.trackRequest(provider, false, responseTime);
        errors.push(`${provider}: ${(error as Error).message}`);
        console.warn(`Provider ${provider} failed, trying next...`, error);
      }
    }

    throw new Error(
      `All LLM providers failed or returned invalid responses. ${errors.join(' | ')}`
    );
  }

  private async callProviderGenerate(
    provider: LLMProvider,
    apiKey: string,
    prompt: string
  ): Promise<string> {
    switch (provider) {
      case LLMProvider.Nvidia:
        return this.generateWithNvidia(apiKey, prompt);
      case LLMProvider.Gemini:
        return this.generateWithGemini(apiKey, prompt);
      case LLMProvider.Groq:
        return this.generateWithGroq(apiKey, prompt);
      case LLMProvider.Claude:
        return this.generateWithClaude(apiKey, prompt);
      case LLMProvider.Mistral:
        return this.generateWithMistral(apiKey, prompt);
      case LLMProvider.OpenRouter:
        return this.generateWithOpenRouter(apiKey, prompt);
      default:
        throw new Error(`Unknown provider: ${provider}`);
    }
  }

  async *streamChat(messages: LLMChatMessage[]): AsyncGenerator<string> {
    const providers = this.getProviderPriority();

    if (providers.length === 0) {
      throw new Error('No LLM providers configured. Add an API key in Profile or set a VITE_* key in your environment.');
    }

    let lastError: Error | null = null;
    const providerErrors: string[] = [];

    for (const provider of providers) {
      const startTime = Date.now();
      try {
        const apiKey = this.apiKeys.get(provider);
        if (!apiKey) continue;

        await this.getLimiter(provider).waitForTurn();

        let fullResponse = '';
        for await (const chunk of this.getChatStream(provider, apiKey, messages)) {
          if (!chunk) continue;
          fullResponse += chunk;
          yield chunk;
        }

        const responseTime = Date.now() - startTime;
        this.trackRequest(provider, true, responseTime, this.estimateTokens(fullResponse));
        return;
      } catch (error) {
        const responseTime = Date.now() - startTime;
        this.trackRequest(provider, false, responseTime);

        lastError = error as Error;
        providerErrors.push(`${provider}: ${lastError.message}`);
        console.warn(`Provider ${provider} chat stream failed, trying next...`, error);
      }
    }

    throw new Error(
      `All LLM providers failed. ${providerErrors.join(' | ') || `Last error: ${lastError?.message}`}`
    );
  }

  private async *getChatStream(
    provider: LLMProvider,
    apiKey: string,
    messages: LLMChatMessage[]
  ): AsyncGenerator<string> {
    if (provider === LLMProvider.Nvidia) {
      yield* this.streamWithNvidia(apiKey, messages);
      return;
    }

    const response = await this.generateChatResponse(provider, apiKey, messages);
    if (response) {
      yield response;
    }
  }

  private async generateWithNvidia(apiKey: string, prompt: string): Promise<string> {
    return this.generateChatWithNvidia(apiKey, [{ role: 'user', content: prompt }], false);
  }

  private isRetryableGeminiError(error: Error): boolean {
    const message = error.message.toLowerCase();
    return (
      message.includes('503') ||
      message.includes('429') ||
      message.includes('high demand') ||
      message.includes('overloaded') ||
      message.includes('resource_exhausted')
    );
  }

  private async generateWithGemini(apiKey: string, prompt: string): Promise<string> {
    const genAI = new GoogleGenerativeAI(apiKey);
    let lastError: Error | null = null;

    for (const modelName of GEMINI_MODELS) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const response = await model.generateContent(prompt);
        return response.response.text();
      } catch (error) {
        lastError = error as Error;
        if (!this.isRetryableGeminiError(lastError)) {
          throw lastError;
        }
        console.warn(`Gemini model ${modelName} unavailable, trying next...`, lastError.message);
      }
    }

    throw lastError || new Error('Gemini failed');
  }

  private async generateWithGroq(apiKey: string, prompt: string): Promise<string> {
    let lastError: Error | null = null;
    for (const model of GROQ_MODELS) {
      try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.7,
            max_tokens: 2000,
          }),
        });

        if (!response.ok) {
          const errMessage = await this.getErrorMessage(response, `Groq (${model})`);
          lastError = new Error(errMessage);
          console.warn(`Groq model ${model} failed, trying next model:`, errMessage);
          continue;
        }

        const data = await response.json();
        return this.extractAssistantText(data.choices?.[0]?.message?.content);
      } catch (error) {
        lastError = error as Error;
        console.warn(`Groq model ${model} fetch failed:`, error);
      }
    }
    throw lastError || new Error('Groq failed across all available models');
  }

  private async generateWithClaude(apiKey: string, prompt: string): Promise<string> {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      throw new Error(await this.getErrorMessage(response, 'Claude'));
    }

    const data = await response.json();
    return this.extractAssistantText(data.content?.[0]?.text);
  }

  private async generateWithMistral(apiKey: string, prompt: string): Promise<string> {
    const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'mistral-small-latest',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      throw new Error(await this.getErrorMessage(response, 'Mistral'));
    }

    const data = await response.json();
    return this.extractAssistantText(data.choices?.[0]?.message?.content);
  }

  private async generateWithOpenRouter(apiKey: string, prompt: string): Promise<string> {
    let lastError: Error | null = null;
    for (const model of OPENROUTER_MODELS) {
      try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.7,
            max_tokens: 2000,
          }),
        });

        if (!response.ok) {
          const errMessage = await this.getErrorMessage(response, `OpenRouter (${model})`);
          lastError = new Error(errMessage);
          console.warn(`OpenRouter model ${model} failed, trying next model:`, errMessage);
          continue;
        }

        const data = await response.json();
        return this.extractAssistantText(data.choices?.[0]?.message?.content);
      } catch (error) {
        lastError = error as Error;
        console.warn(`OpenRouter model ${model} fetch failed:`, error);
      }
    }
    throw lastError || new Error('OpenRouter failed across all available models');
  }

  private async generateChatResponse(
    provider: LLMProvider,
    apiKey: string,
    messages: LLMChatMessage[]
  ): Promise<string> {
    switch (provider) {
      case LLMProvider.Nvidia:
        return this.generateChatWithNvidia(apiKey, messages, false);
      case LLMProvider.Gemini:
        return this.generateChatWithGemini(apiKey, messages);
      case LLMProvider.Groq:
        return this.generateChatWithGroq(apiKey, messages);
      case LLMProvider.Claude:
        return this.generateChatWithClaude(apiKey, messages);
      case LLMProvider.Mistral:
        return this.generateChatWithMistral(apiKey, messages);
      case LLMProvider.OpenRouter:
        return this.generateChatWithOpenRouter(apiKey, messages);
      default:
        throw new Error(`Unknown provider: ${provider}`);
    }
  }

  private async generateChatWithNvidia(
    apiKey: string,
    messages: LLMChatMessage[],
    stream: boolean
  ): Promise<string> {
    let response: Response;
    try {
      response = await fetch(NVIDIA_INVOKE_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: stream ? 'text/event-stream' : 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'mistralai/mistral-medium-3.5-128b',
          reasoning_effort: 'high',
          messages: this.toOpenAIMessages(messages),
          max_tokens: 16384,
          temperature: 0.7,
          top_p: 1,
          stream,
        }),
      });
    } catch (error) {
      if ((error as Error).message === 'Failed to fetch') {
        throw new Error(
          'NVIDIA request blocked by the browser or network. Use Groq or Gemini as your primary provider.'
        );
      }
      throw error;
    }

    if (!response.ok) {
      throw new Error(await this.getErrorMessage(response, 'NVIDIA'));
    }

    const data = await response.json();
    return this.extractAssistantText(data.choices?.[0]?.message?.content);
  }

  private async *streamWithNvidia(
    apiKey: string,
    messages: LLMChatMessage[]
  ): AsyncGenerator<string> {
    const response = await fetch(NVIDIA_INVOKE_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'text/event-stream',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'mistralai/mistral-medium-3.5-128b',
        reasoning_effort: 'high',
        messages: this.toOpenAIMessages(messages),
        max_tokens: 16384,
        temperature: 0.7,
        top_p: 1,
        stream: true,
      }),
    });

    if (!response.ok) {
      throw new Error(await this.getErrorMessage(response, 'NVIDIA'));
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('NVIDIA stream could not be opened.');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      buffer += decoder.decode(value || new Uint8Array(), { stream: !done });

      const events = buffer.split('\n\n');
      buffer = events.pop() || '';

      for (const event of events) {
        const dataLines = event
          .split(/\r?\n/)
          .filter((line) => line.startsWith('data:'))
          .map((line) => line.slice(5).trim());

        if (dataLines.length === 0) continue;

        const data = dataLines.join('\n');
        if (data === '[DONE]') {
          return;
        }

        try {
          const parsed = JSON.parse(data);
          const chunk = this.extractAssistantText(
            parsed.choices?.[0]?.delta?.content ?? parsed.choices?.[0]?.message?.content
          );

          if (chunk) {
            yield chunk;
          }
        } catch (error) {
          console.warn('Failed to parse NVIDIA stream chunk:', error);
        }
      }

      if (done) {
        if (buffer.trim()) {
          const finalData = buffer
            .split(/\r?\n/)
            .filter((line) => line.startsWith('data:'))
            .map((line) => line.slice(5).trim())
            .join('\n');

          if (finalData && finalData !== '[DONE]') {
            try {
              const parsed = JSON.parse(finalData);
              const chunk = this.extractAssistantText(
                parsed.choices?.[0]?.delta?.content ?? parsed.choices?.[0]?.message?.content
              );
              if (chunk) {
                yield chunk;
              }
            } catch (error) {
              console.warn('Failed to parse final NVIDIA stream chunk:', error);
            }
          }
        }
        return;
      }
    }
  }

  private async generateChatWithGemini(
    apiKey: string,
    messages: LLMChatMessage[]
  ): Promise<string> {
    const genAI = new GoogleGenerativeAI(apiKey);
    const { systemInstruction, conversation } = this.splitSystemInstruction(messages);
    const prompt = this.buildConversationPrompt(conversation);
    let lastError: Error | null = null;

    for (const modelName of GEMINI_MODELS) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          systemInstruction: systemInstruction || undefined,
        });
        const response = await model.generateContent(prompt);
        return response.response.text();
      } catch (error) {
        lastError = error as Error;
        if (!this.isRetryableGeminiError(lastError)) {
          throw lastError;
        }
        console.warn(`Gemini model ${modelName} unavailable, trying next...`, lastError.message);
      }
    }

    throw lastError || new Error('Gemini failed');
  }

  private async generateChatWithGroq(
    apiKey: string,
    messages: LLMChatMessage[]
  ): Promise<string> {
    let lastError: Error | null = null;
    for (const model of GROQ_MODELS) {
      try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model,
            messages: this.toOpenAIMessages(messages),
            temperature: 0.7,
            max_tokens: 2000,
          }),
        });

        if (!response.ok) {
          const errMessage = await this.getErrorMessage(response, `Groq (${model})`);
          lastError = new Error(errMessage);
          console.warn(`Groq chat model ${model} failed, trying next:`, errMessage);
          continue;
        }

        const data = await response.json();
        return this.extractAssistantText(data.choices?.[0]?.message?.content);
      } catch (error) {
        lastError = error as Error;
        console.warn(`Groq chat model ${model} fetch failed:`, error);
      }
    }
    throw lastError || new Error('Groq chat failed across all available models');
  }

  private async generateChatWithClaude(
    apiKey: string,
    messages: LLMChatMessage[]
  ): Promise<string> {
    const { systemInstruction, conversation } = this.splitSystemInstruction(messages);
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        system: systemInstruction || undefined,
        max_tokens: 2000,
        messages: conversation.map((message) => ({
          role: message.role,
          content: message.content,
        })),
      }),
    });

    if (!response.ok) {
      throw new Error(await this.getErrorMessage(response, 'Claude'));
    }

    const data = await response.json();
    const text = Array.isArray(data.content)
      ? data.content
          .map((item: { text?: string }) => item?.text || '')
          .join('')
      : '';
    return this.extractAssistantText(text);
  }

  private async generateChatWithMistral(
    apiKey: string,
    messages: LLMChatMessage[]
  ): Promise<string> {
    const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'mistral-small-latest',
        messages: this.toOpenAIMessages(messages),
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      throw new Error(await this.getErrorMessage(response, 'Mistral'));
    }

    const data = await response.json();
    return this.extractAssistantText(data.choices?.[0]?.message?.content);
  }

  private async generateChatWithOpenRouter(
    apiKey: string,
    messages: LLMChatMessage[]
  ): Promise<string> {
    let lastError: Error | null = null;
    for (const model of OPENROUTER_MODELS) {
      try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model,
            messages: this.toOpenAIMessages(messages),
            temperature: 0.7,
            max_tokens: 2000,
          }),
        });

        if (!response.ok) {
          const errMessage = await this.getErrorMessage(response, `OpenRouter (${model})`);
          lastError = new Error(errMessage);
          console.warn(`OpenRouter chat model ${model} failed, trying next:`, errMessage);
          continue;
        }

        const data = await response.json();
        return this.extractAssistantText(data.choices?.[0]?.message?.content);
      } catch (error) {
        lastError = error as Error;
        console.warn(`OpenRouter chat model ${model} fetch failed:`, error);
      }
    }
    throw lastError || new Error('OpenRouter chat failed across all available models');
  }

  private splitSystemInstruction(messages: LLMChatMessage[]): {
    systemInstruction: string;
    conversation: Array<{ role: 'user' | 'assistant'; content: string }>;
  } {
    const systemMessages = messages
      .filter((message) => message.role === 'system' && message.content.trim())
      .map((message) => message.content.trim());

    const conversation = messages
      .filter(
        (message): message is { role: 'user' | 'assistant'; content: string } =>
          message.role !== 'system' && message.content.trim().length > 0
      )
      .map((message) => ({
        role: message.role,
        content: message.content.trim(),
      }));

    return {
      systemInstruction: systemMessages.join('\n\n'),
      conversation,
    };
  }

  private buildConversationPrompt(
    conversation: Array<{ role: 'user' | 'assistant'; content: string }>
  ): string {
    const transcript = conversation
      .map((message) => `${message.role === 'assistant' ? 'Assistant' : 'User'}: ${message.content}`)
      .join('\n\n');

    return [
      'Continue the conversation below and answer as the assistant.',
      'Return only the assistant reply for the latest user message.',
      '',
      transcript,
      '',
      'Assistant:',
    ].join('\n');
  }

  private toOpenAIMessages(messages: LLMChatMessage[]): Array<{ role: 'system' | 'user' | 'assistant'; content: string }> {
    return messages
      .filter((message) => message.content.trim().length > 0)
      .map((message) => ({
        role: message.role,
        content: message.content.trim(),
      }));
  }

  private extractAssistantText(content: unknown): string {
    if (typeof content === 'string') {
      return content;
    }

    if (Array.isArray(content)) {
      return content
        .map((part) => {
          if (typeof part === 'string') return part;
          if (part && typeof part === 'object' && 'text' in part && typeof part.text === 'string') {
            return part.text;
          }
          return '';
        })
        .join('');
    }

    return '';
  }

  private async getErrorMessage(response: Response, providerName: string): Promise<string> {
    const raw = await response.text();

    try {
      const data = JSON.parse(raw);
      return (
        data.error?.message ||
        data.message ||
        `${providerName} API error (${response.status})`
      );
    } catch {
      return raw || `${providerName} API error (${response.status})`;
    }
  }

  private getLimiter(provider: LLMProvider): RateLimiter {
    switch (provider) {
      case LLMProvider.Nvidia:
        return this.nvidiaLimiter;
      case LLMProvider.Gemini:
        return this.geminiLimiter;
      case LLMProvider.Groq:
        return this.groqLimiter;
      case LLMProvider.Claude:
        return this.anthropicLimiter;
      case LLMProvider.Mistral:
        return this.mistralLimiter;
      case LLMProvider.OpenRouter:
        return this.openRouterLimiter;
      default:
        return this.nvidiaLimiter;
    }
  }

  setAPIKey(provider: LLMProvider, apiKey: string): void {
    this.apiKeys.set(provider, this.normalizeApiKey(provider, apiKey));
  }

  removeAPIKey(provider: LLMProvider): void {
    this.apiKeys.delete(provider);
  }

  setPrimaryProvider(provider: LLMProvider): void {
    if (this.apiKeys.has(provider)) {
      this.primaryProvider = provider;
    }
  }

  getAvailableProviders(): LLMProvider[] {
    return Array.from(this.apiKeys.keys());
  }

  getConfiguredProviders(): LLMProvider[] {
    return this.getProviderPriority();
  }

  getPrimaryProvider(): LLMProvider {
    return this.primaryProvider;
  }

  hasFallbackProviders(): boolean {
    return this.getProviderPriority().length > 1;
  }

  getUsageDashboard(): UsageDashboard {
    const providerStats = Array.from(this.usageStats.values());
    const totalRequests = providerStats.reduce((sum, s) => sum + s.requestsToday, 0);
    const totalTokens = providerStats.reduce((sum, s) => sum + s.tokensConsumed, 0);

    const costPerProvider: Record<LLMProvider, number> = {
      [LLMProvider.Nvidia]: 0,
      [LLMProvider.Gemini]: 0.075,
      [LLMProvider.Groq]: 0,
      [LLMProvider.Claude]: 3.0,
      [LLMProvider.Mistral]: 0.14,
      [LLMProvider.OpenRouter]: 0.5,
    };

    const estimatedCost = providerStats.reduce((sum, s) => {
      const costPer1M = costPerProvider[s.provider] || 0;
      return sum + (s.tokensConsumed / 1000000) * costPer1M;
    }, 0);

    return {
      totalRequests,
      totalTokens,
      estimatedCost,
      providerStats,
      lastReset: this.lastReset,
    };
  }

  getProviderStats(provider: LLMProvider): ProviderUsageStats | null {
    return this.usageStats.get(provider) || null;
  }

  getRateLimitWarnings(): Array<{ provider: LLMProvider; warning: string }> {
    const warnings: Array<{ provider: LLMProvider; warning: string }> = [];

    this.usageStats.forEach((stats, provider) => {
      const limits: Record<LLMProvider, number> = {
        [LLMProvider.Nvidia]: 5000,
        [LLMProvider.Gemini]: 1500,
        [LLMProvider.Groq]: 14400,
        [LLMProvider.Claude]: 1000,
        [LLMProvider.Mistral]: 6000,
        [LLMProvider.OpenRouter]: 500,
      };

      const limit = limits[provider];
      const usage = stats.requestsToday;
      const percentage = (usage / limit) * 100;

      if (percentage >= 90) {
        warnings.push({
          provider,
          warning: `${percentage.toFixed(0)}% of daily limit used (${usage}/${limit} requests)`,
        });
      } else if (percentage >= 75) {
        warnings.push({
          provider,
          warning: `Approaching limit: ${percentage.toFixed(0)}% used`,
        });
      }
    });

    return warnings;
  }

  resetStats(): void {
    this.resetUsageStats();
  }
}

let providerInstance: LLMProviderService | null = null;

export function getLLMProvider(
  apiKeyConfigs?: APIKeyConfig[],
  primaryProvider?: LLMProvider
): LLMProviderService {
  if (!providerInstance) {
    providerInstance = new LLMProviderService(apiKeyConfigs, primaryProvider);
  } else if (apiKeyConfigs || primaryProvider) {
    providerInstance.updateConfiguration(apiKeyConfigs, primaryProvider);
  }
  return providerInstance;
}

export function resetLLMProvider(): void {
  providerInstance = null;
}
