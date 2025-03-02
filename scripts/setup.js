#!/usr/bin/env node

import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import inquirer from 'inquirer';
import dotenv from 'dotenv';

// Get directory paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');
const dataDir = path.join(rootDir, 'data');
const debatesDir = path.join(dataDir, 'debates');

async function setup() {
  console.log(chalk.blue('AI Debate Club - Setup Script'));
  console.log(chalk.blue('==============================\n'));
  
  // Create necessary directories
  console.log('Creating data directories...');
  await fs.ensureDir(dataDir);
  await fs.ensureDir(debatesDir);
  console.log(chalk.green('✓ Data directories created\n'));
  
  // Check if .env file exists
  const envPath = path.join(rootDir, '.env');
  const envExamplePath = path.join(rootDir, '.env.example');
  
  if (!fs.existsSync(envPath)) {
    console.log('Creating .env file from template...');
    
    if (!fs.existsSync(envExamplePath)) {
      console.log(chalk.red('❌ .env.example file not found'));
      return;
    }
    
    // Copy example file
    await fs.copy(envExamplePath, envPath);
    console.log(chalk.green('✓ .env file created from template\n'));
    
    // Ask user for API keys
    console.log(chalk.yellow('You need to set up API keys for the following services:'));
    console.log('- Anthropic (https://console.anthropic.com/)');
    console.log('- OpenAI (https://platform.openai.com/api-keys)');
    console.log('- Groq (https://console.groq.com/keys)\n');
    
    const { setupKeys } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'setupKeys',
        message: 'Would you like to enter your API keys now?',
        default: true
      }
    ]);
    
    if (setupKeys) {
      const keys = await inquirer.prompt([
        {
          type: 'input',
          name: 'ANTHROPIC_API_KEY',
          message: 'Enter your Anthropic API key:',
          validate: input => input.trim() !== '' || 'API key cannot be empty'
        },
        {
          type: 'input',
          name: 'OPENAI_API_KEY',
          message: 'Enter your OpenAI API key:',
          validate: input => input.trim() !== '' || 'API key cannot be empty'
        },
        {
          type: 'input',
          name: 'GROQ_API_KEY',
          message: 'Enter your Groq API key:',
          validate: input => input.trim() !== '' || 'API key cannot be empty'
        }
      ]);
      
      // Read the current .env content
      let envContent = await fs.readFile(envPath, 'utf8');
      
      // Replace API keys
      Object.entries(keys).forEach(([key, value]) => {
        const regex = new RegExp(`${key}=.*`, 'g');
        envContent = envContent.replace(regex, `${key}=${value}`);
      });
      
      // Write updated content
      await fs.writeFile(envPath, envContent);
      console.log(chalk.green('✓ API keys added to .env file\n'));
    } else {
      console.log(chalk.yellow('Please edit the .env file manually to add your API keys\n'));
    }
  } else {
    console.log(chalk.green('✓ .env file already exists\n'));
    
    // Load .env file and check if keys are set
    dotenv.config({ path: envPath });
    const missingKeys = ['ANTHROPIC_API_KEY', 'OPENAI_API_KEY', 'GROQ_API_KEY'].filter(
      key => !process.env[key]
    );
    
    if (missingKeys.length > 0) {
      console.log(chalk.yellow(`Warning: The following API keys are missing in your .env file: ${missingKeys.join(', ')}`));
      console.log(chalk.yellow('Please edit the .env file to add these keys\n'));
    }
  }
  
  // Initialize default topics file
  const topicsFile = path.join(dataDir, 'debate-topics.json');
  
  if (!fs.existsSync(topicsFile)) {
    console.log('Creating default debate topics file...');
    
    const defaultTopics = [
      {
        "category": "Technology",
        "topics": [
          "Artificial intelligence will ultimately benefit humanity more than harm it",
          "Social media has a net negative impact on society",
          "Cryptocurrencies should replace traditional banking systems",
          "Governments should regulate big tech companies more strictly",
          "Universal basic income is necessary in an AI-automated future"
        ]
      },
      {
        "category": "Ethics",
        "topics": [
          "The ends justify the means in ethical decision making",
          "Capital punishment is never morally justified",
          "There are universal moral principles that apply across all cultures",
          "Individual privacy should be prioritized over national security",
          "Wealthy nations have an ethical obligation to accept refugees"
        ]
      },
      {
        "category": "Education",
        "topics": [
          "Standardized testing should be eliminated from education systems",
          "Liberal arts education is more valuable than technical education",
          "Higher education should be free for all citizens",
          "Homeschooling provides better education outcomes than public schooling",
          "Technology in classrooms enhances the learning experience"
        ]
      }
    ];
    
    await fs.writeJson(topicsFile, defaultTopics, { spaces: 2 });
    console.log(chalk.green('✓ Default debate topics created\n'));
  } else {
    console.log(chalk.green('✓ Debate topics file already exists\n'));
  }
  
  // Initialize empty ELO ratings file
  const eloFile = path.join(dataDir, 'elo-ratings.json');
  
  if (!fs.existsSync(eloFile)) {
    console.log('Creating ELO ratings file...');
    await fs.writeJson(eloFile, {}, { spaces: 2 });
    console.log(chalk.green('✓ ELO ratings file created\n'));
  } else {
    console.log(chalk.green('✓ ELO ratings file already exists\n'));
  }
  
  // Make CLI executable
  console.log('Setting up CLI...');
  const cliPath = path.join(rootDir, 'src/cli/index.js');
  
  try {
    await fs.chmod(cliPath, 0o755);
    console.log(chalk.green('✓ CLI permissions set\n'));
  } catch (error) {
    console.log(chalk.yellow(`Warning: Could not make CLI executable: ${error.message}\n`));
  }
  
  // Final message
  console.log(chalk.green('✅ Setup complete!'));
  console.log('\nYou can now run debates using the following command:');
  console.log(chalk.blue('  npm run debate'));
  console.log('\nOr if you install globally:');
  console.log(chalk.blue('  npm install -g .'));
  console.log(chalk.blue('  ai-debate-club'));
}

// Run setup
setup().catch(err => {
  console.error(chalk.red(`Error during setup: ${err.message}`));
  process.exit(1);
});
