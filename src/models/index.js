import { MODELS } from '../config/models.js';
import anthropicClient from './anthropic.js';
import openaiClient from './openai.js';
import groqClient from './groq.js';

class ModelService {
  constructor() {
    this.clients = {
      anthropic: anthropicClient,
      openai: openaiClient,
      groq: groqClient
    };
  }

  async generateResponse(modelId, prompt, options = {}) {
    const modelConfig = MODELS[modelId];
    
    if (!modelConfig) {
      throw new Error(`Model ${modelId} not found in configuration`);
    }
    
    const client = this.clients[modelConfig.provider];
    
    if (!client) {
      throw new Error(`Provider ${modelConfig.provider} not implemented`);
    }

    const systemPrompt = options.systemPrompt || modelConfig.systemPrompt || null;
    const maxTokens = options.maxTokens || modelConfig.maxTokens || 1000;
    
    return await client.generateResponse(
      modelConfig.apiModel,
      prompt,
      systemPrompt,
      maxTokens
    );
  }

  async streamResponse(modelId, prompt, options = {}) {
    const modelConfig = MODELS[modelId];
    
    if (!modelConfig) {
      throw new Error(`Model ${modelId} not found in configuration`);
    }
    
    const client = this.clients[modelConfig.provider];
    
    if (!client) {
      throw new Error(`Provider ${modelConfig.provider} not implemented`);
    }
    
    if (!client.streamResponse) {
      throw new Error(`Provider ${modelConfig.provider} does not support streaming`);
    }

    const systemPrompt = options.systemPrompt || modelConfig.systemPrompt || null;
    const maxTokens = options.maxTokens || modelConfig.maxTokens || 1000;
    
    // Return a custom async iterable to make it compatible with for-await-of syntax
    const streamResponse = await client.streamResponse(
      modelConfig.apiModel,
      prompt,
      systemPrompt,
      maxTokens
    );
    
    return {
      [Symbol.asyncIterator]() {
        return {
          done: false,
          next() {
            if (this.done) {
              return Promise.resolve({ done: true });
            }
            this.done = true;
            return Promise.resolve({ value: streamResponse, done: false });
          }
        };
      }
    };
  }

  getModelInfo(modelId) {
    return MODELS[modelId] || null;
  }

  getDebaterModels() {
    return Object.entries(MODELS)
      .filter(([_, config]) => config.capabilities.debater)
      .map(([id, _]) => id);
  }

  getJudgeModels() {
    return Object.entries(MODELS)
      .filter(([_, config]) => config.capabilities.judge)
      .map(([id, _]) => id);
  }
}

export default new ModelService();
