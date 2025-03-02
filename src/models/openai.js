import OpenAI from "openai";
import dotenv from 'dotenv';

dotenv.config();

// Map display names to actual API model names
const MODEL_MAPPING = {
  'gpt-4o': 'gpt-4o',
  'gpt-4-turbo': 'gpt-4-turbo',
  'gpt-4.5-preview': 'gpt-4-turbo-preview',
  'o1': 'o1',
  'o3-mini': 'o3-mini',
  // Add more mappings as needed
};

// Models that use max_completion_tokens instead of max_tokens
const USES_COMPLETION_TOKENS = ['o1', 'o3-mini'];

class OpenAIClient {
  constructor(apiKey) {
    this.client = new OpenAI({
      apiKey: apiKey || process.env.OPENAI_API_KEY,
    });
  }
  
  // Helper to get the proper API model name
  getApiModelName(modelName) {
    return MODEL_MAPPING[modelName] || modelName;
  }
  
  // Helper function to implement retries with exponential backoff
  async withRetry(fn, maxRetries = 3, baseDelay = 1000) {
    let retries = 0;
    
    while (true) {
      try {
        return await fn();
      } catch (error) {
        retries++;
        
        // Check if we've reached max retries or if it's not a retryable error
        if (retries > maxRetries || !this.isRetryableError(error)) {
          throw error;
        }
        
        // Calculate delay with exponential backoff and jitter
        const delay = baseDelay * Math.pow(2, retries) * (0.5 + Math.random() * 0.5);
        console.log(`Rate limit hit. Retrying in ${Math.round(delay/1000)} seconds...`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  // Determine if an error is retryable
  isRetryableError(error) {
    // OpenAI specific error codes for rate limits and server errors
    return error?.status === 429 || 
           (error?.status >= 500 && error?.status < 600) ||
           error?.code === 'rate_limit_exceeded';
  }
  
  // Updated to match the same parameter format as Anthropic client
  async generateResponse(modelName, prompt, systemPrompt = null, maxTokens = 2048) {
    const apiModelName = this.getApiModelName(modelName);
    
    return this.withRetry(async () => {
      try {
        console.log(`Using OpenAI model: ${apiModelName}`);
        
        const messages = [];
        
        // Add system message if provided
        if (systemPrompt) {
          messages.push({ role: 'system', content: systemPrompt });
        }
        
        // Add user message
        messages.push({ role: 'user', content: prompt });
        
        // Create request parameters
        const requestParams = {
          model: apiModelName,
          temperature: 0.7,
          messages: messages,
        };
        
        // Use the correct token parameter based on the model
        if (USES_COMPLETION_TOKENS.includes(apiModelName)) {
          requestParams.max_completion_tokens = maxTokens;
        } else {
          requestParams.max_tokens = maxTokens;
        }
        
        const response = await this.client.chat.completions.create(requestParams);
        
        return response.choices[0].message.content;
      } catch (error) {
        console.error('Error in OpenAI request:', error.message);
        throw error;
      }
    });
  }
  
  // Simplified method for consistency with the Anthropic client
  async streamResponse(modelName, prompt, systemPrompt = null, maxTokens = 2048, onChunk = () => {}) {
    try {
      const fullResponse = await this.generateResponse(modelName, prompt, systemPrompt, maxTokens);
      onChunk(fullResponse);
      return fullResponse;
    } catch (error) {
      console.error('Error in OpenAI response:', error.message);
      throw error;
    }
  }
}

export default new OpenAIClient();
