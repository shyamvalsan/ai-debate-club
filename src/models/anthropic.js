import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';
dotenv.config();

// Mapping of user-friendly model names to actual API model names
const MODEL_MAPPING = {
  'claude-3-7-sonnet-20250219': 'claude-3-7-sonnet-20250219', // Using latest available version
  'claude-3-5-sonnet-20240620': 'claude-3-5-sonnet-20241022',
  'claude-3-opus-20240229': 'claude-3-opus-20240229',
  'claude-sonnet-3.7': 'claude-3-7-sonnet-20250219',
  'claude-sonnet-3.5': 'claude-3-5-sonnet-20241022',
  'claude-haiku-3.5': 'claude-3-5-haiku-20241022',
  'claude-opus-3': 'claude-3-opus-20240229',
};

class AnthropicClient {
  constructor(apiKey) {
    this.client = new Anthropic({
      apiKey: apiKey || process.env.ANTHROPIC_API_KEY,
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
    // Retry on rate limits and certain server errors
    return error?.status === 429 || 
           (error?.status >= 500 && error?.status < 600) ||
           error?.headers?.['x-should-retry'] === 'true';
  }

  // Generate a response with retries
  async generateResponse(modelName, prompt, systemPrompt, maxTokens) {
    const apiModelName = this.getApiModelName(modelName);
    
    return this.withRetry(async () => {
      try {
        console.log(`Using Anthropic model: ${apiModelName}`);
        
        // Create the request parameters
        const requestParams = {
          model: apiModelName,
          max_tokens: maxTokens || 1024,
          temperature: 0.7,
          messages: [{ role: 'user', content: prompt }]
        };
        
        // Add system prompt as a top-level parameter if provided
        if (systemPrompt) {
          requestParams.system = systemPrompt;
        }
        
        const response = await this.client.messages.create(requestParams);
        
        return response.content[0].text;
      } catch (error) {
        console.error('Error in Anthropic request:', error.status, error.message);
        throw error;
      }
    });
  }

  // Stream response method that handles the response in chunks
  async streamResponse(modelName, prompt, systemPrompt, maxTokens, onChunk = () => {}) {
    try {
      const fullResponse = await this.generateResponse(modelName, prompt, systemPrompt, maxTokens);
      onChunk(fullResponse);
      return fullResponse;
    } catch (error) {
      console.error('Error in Anthropic response:', error.status, error.message);
      throw error;
    }
  }
}

export default new AnthropicClient();
