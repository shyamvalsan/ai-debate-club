/**
 * Configuration for all supported LLM models
 */

export const MODELS = {
  // Anthropic Models
  'claude-sonnet-3.7': {
    provider: 'anthropic',
    apiModel: 'claude-3-sonnet-20240229', // Using latest available model
    displayName: 'Claude Sonnet 3.7',
    maxTokens: 4096,
    capabilities: {
      debater: true,
      judge: true
    }
  },
  'claude-sonnet-3.7-thinking': {
    provider: 'anthropic',
    apiModel: 'claude-3-sonnet-20240229', // Using latest available model
    displayName: 'Claude Sonnet 3.7 (Thinking)',
    maxTokens: 4096,
    capabilities: {
      debater: true,
      judge: true
    },
    systemPrompt: "Think step-by-step about the arguments before providing your response."
  },
  'claude-sonnet-3.5': {
    provider: 'anthropic',
    apiModel: 'claude-3-sonnet-20240229',
    displayName: 'Claude Sonnet 3.5',
    maxTokens: 4096,
    capabilities: {
      debater: true,
      judge: true
    }
  },
  'claude-opus-3': {
    provider: 'anthropic',
    apiModel: 'claude-3-opus-20240229',
    displayName: 'Claude Opus 3',
    maxTokens: 4096,
    capabilities: {
      debater: true,
      judge: true
    }
  },

  // OpenAI Models
  'gpt-4o': {
    provider: 'openai',
    apiModel: 'gpt-4o',
    displayName: 'GPT-4o',
    maxTokens: 4096,
    capabilities: {
      debater: true,
      judge: true
    }
  },
  'gpt-4.5-preview': {
    provider: 'openai',
    apiModel: 'gpt-4.5-preview',
    displayName: 'GPT-4.5 Preview',
    maxTokens: 4096,
    capabilities: {
      debater: true,
      judge: true
    }
  },
  'o1': {
    provider: 'openai',
    apiModel: 'o1',
    displayName: 'O1',
    maxTokens: 4096,
    capabilities: {
      debater: true,
      judge: true
    }
  },
  'o3-mini': {
    provider: 'openai',
    apiModel: 'o3-mini',
    displayName: 'O3 Mini',
    maxTokens: 4096,
    capabilities: {
      debater: true,
      judge: true
    }
  },

  // Groq Models
  'llama-3.3-70b-versatile': {
    provider: 'groq',
    apiModel: 'llama-3.3-70b-versatile',
    displayName: 'Llama 3.3 70B Versatile',
    maxTokens: 4096,
    capabilities: {
      debater: true,
      judge: true
    }
  },
  'deepseek-r1-distill-llama-70b': {
    provider: 'groq',
    apiModel: 'deepseek-r1-distill-llama-70b',
    displayName: 'DeepSeek R1 Distill Llama 70B',
    maxTokens: 4096,
    capabilities: {
      debater: true,
      judge: true
    }
  },
  'mistral-saba-24b': {
    provider: 'groq',
    apiModel: 'mistral-saba-24b',
    displayName: 'Mistral Saba 24B',
    maxTokens: 4096,
    capabilities: {
      debater: true,
      judge: true
    }
  }
};

export const getModelsByProvider = (provider) => {
  return Object.entries(MODELS)
    .filter(([_, config]) => config.provider === provider)
    .reduce((acc, [id, config]) => {
      acc[id] = config;
      return acc;
    }, {});
};

export const getDebaterModels = () => {
  return Object.entries(MODELS)
    .filter(([_, config]) => config.capabilities.debater)
    .reduce((acc, [id, config]) => {
      acc[id] = config;
      return acc;
    }, {});
};

export const getJudgeModels = () => {
  return Object.entries(MODELS)
    .filter(([_, config]) => config.capabilities.judge)
    .reduce((acc, [id, config]) => {
      acc[id] = config;
      return acc;
    }, {});
};
