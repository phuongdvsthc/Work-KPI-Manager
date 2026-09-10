import { AIProvider, AIProviderOptions, AIContextData, AIProviderConfig } from '../../types/ai';

/**
 * AI Provider Factory and Base Abstraction
 * Isolates the business logic from specific LLM SDKs.
 */

export class NullAIProvider implements AIProvider {
  async generateText(prompt: string, contextData: AIContextData, options?: AIProviderOptions): Promise<{ text: string, usage?: any }> {
    console.warn('[NullAIProvider] AI is not configured or disabled. Returning fallback.');
    return { text: 'AI services are currently unavailable.', usage: { input_tokens: 10, output_tokens: 20, total_tokens: 30, finish_reason: 'stop' } };
  }

  async generateStructured<T>(prompt: string, contextData: AIContextData, schema: Record<string, any>, options?: AIProviderOptions): Promise<{ data: T, usage?: any }> {
    console.warn('[NullAIProvider] AI is not configured or disabled. Returning empty structured fallback.');
    return { data: {} as T, usage: { input_tokens: 15, output_tokens: 25, total_tokens: 40, finish_reason: 'stop' } };
  }

  async healthCheck(): Promise<boolean> {
    return true; 
  }
}

// export class GeminiProvider implements AIProvider { 
//   constructor(private config: AIProviderConfig) {} 
//   ... 
// }

/**
 * Factory method to instantiate the correct provider based on runtime configuration.
 */
export const createAIProvider = (config: AIProviderConfig): AIProvider => {
  // 1. Check if disabled or missing key
  if (!config.enabled || !config.apiKey) {
    return new NullAIProvider();
  }

  // 2. Route based on configured provider
  switch (config.provider.toLowerCase()) {
    // case 'gemini':
    //   return new GeminiProvider(config);
    default:
      console.warn(`[createAIProvider] Unknown provider: ${config.provider}. Falling back to NullAIProvider.`);
      return new NullAIProvider();
  }
};
