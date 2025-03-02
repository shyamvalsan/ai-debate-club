import Groq from "groq-sdk";
import dotenv from 'dotenv';

dotenv.config();

class GroqClient {
  constructor() {
    this.client = new Groq({
      apiKey: process.env.GROQ_API_KEY,
    });
  }

  async generateResponse(modelId, prompt, systemPrompt = null, maxTokens = 1000) {
    try {
      const messages = [];
      
      if (systemPrompt) {
        messages.push({ role: "system", content: systemPrompt });
      }
      
      messages.push({ role: "user", content: prompt });
      
      const response = await this.client.chat.completions.create({
        model: modelId,
        messages: messages,
        max_tokens: maxTokens,
      });
      
      return response.choices[0].message.content;
    } catch (error) {
      // Handle common API errors
      if (error.status === 401) {
        throw new Error("Authentication error: Please check your Groq API key");
      } else if (error.status === 429) {
        throw new Error("Rate limit exceeded: Please try again later or check your Groq API plan");
      } else if (error.status === 500) {
        throw new Error("Groq API server error: Please try again later");
      } else if (error.message && error.message.includes('model not found')) {
        throw new Error(`Model '${modelId}' not found: This model may not be available with your Groq access`);
      }
      
      console.error(`Error with Groq API: ${error.message}`);
      throw new Error(`Groq API error: ${error.message}`);
    }
  }

  async streamResponse(modelId, prompt, systemPrompt = null, maxTokens = 1000) {
    try {
      const messages = [];
      
      if (systemPrompt) {
        messages.push({ role: "system", content: systemPrompt });
      }
      
      messages.push({ role: "user", content: prompt });
      
      const stream = await this.client.chat.completions.create({
        model: modelId,
        messages: messages,
        max_tokens: maxTokens,
        stream: true
      });
      
      // Create async generator to yield content chunks
      const yieldChunks = async function* () {
        for await (const chunk of stream) {
          if (chunk.choices[0]?.delta?.content) {
            yield chunk.choices[0].delta.content;
          }
        }
      };
      
      return yieldChunks();
    } catch (error) {
      // Handle common API errors
      if (error.status === 401) {
        throw new Error("Authentication error: Please check your Groq API key");
      } else if (error.status === 429) {
        throw new Error("Rate limit exceeded: Please try again later or check your Groq API plan");
      } else if (error.status === 500) {
        throw new Error("Groq API server error: Please try again later");
      } else if (error.message && error.message.includes('model not found')) {
        throw new Error(`Model '${modelId}' not found: This model may not be available with your Groq access`);
      }
      
      console.error(`Error with Groq API: ${error.message}`);
      throw new Error(`Groq API streaming error: ${error.message}`);
    }
  }
}

export default new GroqClient();
