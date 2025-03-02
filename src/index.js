import dotenv from 'dotenv';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config();

// Import components
import modelService from './models/index.js';
import { Debate } from './core/debate.js';
import judgingSystem from './core/judge.js';
import elo from './core/elo.js';

// Check for required environment variables
const requiredEnvVars = [
  'ANTHROPIC_API_KEY',
  'OPENAI_API_KEY',
  'GROQ_API_KEY'
];

const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.warn(`Warning: Missing environment variables: ${missingEnvVars.join(', ')}`);
  console.warn('Some functionality may not work correctly. Please check your .env file.');
}

// Get the directory for data storage
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '../data');

// Ensure data directory exists
fs.ensureDirSync(DATA_DIR);

// Initialize ELO system
await elo.initialize();

// Export APIs for programmatic use
export {
  Debate,
  modelService,
  judgingSystem,
  elo
};

// If running as main module, show info
if (import.meta.url === `file://${process.argv[1]}`) {
  const packagePath = path.join(__dirname, '../package.json');
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  
  console.log(`AI Debate Club v${packageJson.version}`);
  console.log('To run debates, use the CLI commands:');
  console.log('  npm run debate');
  console.log('  or');
  console.log('  node src/cli/index.js');
}
