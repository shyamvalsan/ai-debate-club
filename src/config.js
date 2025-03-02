const fs = require('fs');
const path = require('path');
const os = require('os');

const CONFIG_FILE = path.join(os.homedir(), '.ai-debate-club.json');

// Default configuration
const DEFAULT_CONFIG = {
  apiKey: '',
  model: 'text-davinci-003'
};

let config = null;

/**
 * Load configuration from file
 */
function loadConfig() {
  if (config) return config;
  
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const fileContent = fs.readFileSync(CONFIG_FILE, 'utf8');
      config = JSON.parse(fileContent);
    } else {
      config = DEFAULT_CONFIG;
      saveConfig(config);
    }
  } catch (error) {
    console.error('Error loading config:', error.message);
    config = DEFAULT_CONFIG;
  }
  
  return config;
}

/**
 * Save configuration to file
 */
function saveConfig(newConfig) {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(newConfig, null, 2), 'utf8');
  config = newConfig;
}

/**
 * Get API key
 */
function getApiKey() {
  const cfg = loadConfig();
  // Also check for environment variable
  return process.env.AI_DEBATE_CLUB_API_KEY || cfg.apiKey;
}

/**
 * Get model name
 */
function getModel() {
  const cfg = loadConfig();
  return cfg.model;
}

/**
 * Set API key
 */
function setApiKey(apiKey) {
  const cfg = loadConfig();
  cfg.apiKey = apiKey;
  saveConfig(cfg);
}

module.exports = {
  loadConfig,
  saveConfig,
  getApiKey,
  setApiKey,
  getModel
};
