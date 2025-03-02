const { Configuration, OpenAIApi } = require('openai');
const config = require('../config');

let apiClient = null;

/**
 * Initialize and return the API client
 */
function getApiClient() {
  if (apiClient) {
    return apiClient;
  }

  // Check if API key is configured
  const apiKey = config.getApiKey();
  if (!apiKey) {
    throw new Error('API key not configured. Run "ai-debate-club configure" first.');
  }

  const configuration = new Configuration({
    apiKey,
  });

  const openai = new OpenAIApi(configuration);
  
  apiClient = {
    generateResponse: async (prompt) => {
      const response = await openai.createCompletion({
        model: config.getModel() || 'text-davinci-003',
        prompt,
        max_tokens: 100,
      });
      return response.data.choices[0].text.trim();
    }
  };
  
  return apiClient;
}

module.exports = { getApiClient };
