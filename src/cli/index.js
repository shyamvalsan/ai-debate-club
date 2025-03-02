#!/usr/bin/env node

import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs-extra';
import { fileURLToPath } from 'url';
import path from 'path';
import dotenv from 'dotenv';
import process from 'process';
import readline from 'readline';

// Load environment variables
dotenv.config();

// Core components
import { Debate, DEBATE_FORMATS } from '../core/debate.js';
import modelService from '../models/index.js';
import judgingSystem from '../core/judge.js';
import elo from '../core/elo.js';
import { listDebates, loadDebate, saveDebate, initializeDebateTopics } from '../core/storage.js';

// Get package info
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packagePath = path.join(__dirname, '../../package.json');
const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

const program = new Command();

// Initialize app
program
  .name('ai-debate-club')
  .description('A CLI tool for simulating and evaluating debates between language models')
  .version(packageJson.version);

// List available models
program
  .command('models')
  .description('List all available LLM models for debates')
  .action(() => {
    console.log(chalk.bold('\nAvailable Debater Models:'));
    const debaterModels = modelService.getDebaterModels();
    debaterModels.forEach(modelId => {
      const model = modelService.getModelInfo(modelId);
      console.log(`- ${chalk.green(modelId)}: ${model.displayName} (${model.provider})`);
    });
    
    console.log(chalk.bold('\nAvailable Judge Models:'));
    const judgeModels = modelService.getJudgeModels();
    judgeModels.forEach(modelId => {
      const model = modelService.getModelInfo(modelId);
      console.log(`- ${chalk.blue(modelId)}: ${model.displayName} (${model.provider})`);
    });
    
    console.log(''); // Empty line for spacing
  });

// List debate formats
program
  .command('formats')
  .description('List all available debate formats')
  .action(() => {
    console.log(chalk.bold('\nAvailable Debate Formats:'));
    
    for (const [key, format] of Object.entries(DEBATE_FORMATS)) {
      console.log(`- ${chalk.yellow(key)}: ${format.name}`);
      console.log(`  ${format.description}`);
      console.log(`  ${format.rounds.length} rounds: ${format.rounds.map(r => r.name).join(', ')}`);
      if (format.style) {
        console.log(`  Style: ${format.style}`);
      }
      console.log('');
    }
  });

// Start a new debate
program
  .command('new')
  .description('Start a new debate between two models')
  .action(async () => {
    try {
      // Initialize ELO system
      await elo.initialize();
      
      // Load debate topics
      const topicsData = await initializeDebateTopics();
      
      // Get available models
      const debaterModels = modelService.getDebaterModels();
      const judgeModels = modelService.getJudgeModels();
      
      // Before starting the debate, verify API access
      console.log("Verifying API access...");
      const verifySpinner = ora('Testing connections to AI providers...').start();
      
      try {
        // Check if Anthropic API is working - Fix the incorrect parameter format
        if (process.env.ANTHROPIC_API_KEY) {
          await modelService.clients.anthropic.generateResponse(
            'claude-3-haiku-20240307',  // Use a valid model name
            'Hello', 
            null, // No system prompt
            10 // maxTokens
          );
        }
        
        // Check if OpenAI API is working - Fix the incorrect parameter format
        if (process.env.OPENAI_API_KEY) {
          await modelService.clients.openai.generateResponse(
            'gpt-3.5-turbo',  // Use a valid model name
            'Hello',
            null, // No system prompt
            10 // maxTokens
          );
        }
        
        verifySpinner.succeed("API connections verified successfully");
      } catch (error) {
        verifySpinner.fail(`API connection test failed: ${error.message}`);
        console.log("Continuing anyway, but you might encounter errors during the debate.");
      }
      
      // Interactive session to set up debate
      const answers = await inquirer.prompt([
        {
          type: 'list',
          name: 'topicSelection',
          message: 'How would you like to select a debate topic?',
          choices: [
            { name: 'Choose from existing topics', value: 'existing' },
            { name: 'Enter a custom topic', value: 'custom' }
          ]
        },
        {
          type: 'list',
          name: 'category',
          message: 'Select a topic category:',
          choices: topicsData.map(c => c.category),
          when: (answers) => answers.topicSelection === 'existing'
        },
        {
          type: 'list',
          name: 'topic',
          message: 'Select a debate topic:',
          choices: (answers) => {
            if (answers.topicSelection === 'existing') {
              const category = topicsData.find(c => c.category === answers.category);
              return category.topics;
            }
            return [];
          },
          when: (answers) => answers.topicSelection === 'existing'
        },
        {
          type: 'input',
          name: 'customTopic',
          message: 'Enter your custom debate topic:',
          when: (answers) => answers.topicSelection === 'custom',
          validate: (input) => input.trim().length > 0 ? true : 'Topic cannot be empty'
        },
        {
          type: 'list',
          name: 'format',
          message: 'Select debate format:',
          choices: Object.entries(DEBATE_FORMATS).map(([key, format]) => ({
            name: `${format.name} (${format.description})`,
            value: key
          }))
        },
        {
          type: 'list',
          name: 'model1',
          message: 'Select first debater model:',
          choices: debaterModels
        },
        {
          type: 'list',
          name: 'model2',
          message: 'Select second debater model:',
          choices: (answers) => debaterModels.filter(model => model !== answers.model1)
        },
        {
          type: 'input',
          name: 'position1',
          message: 'Position for the first debater (e.g., "For", "Against", "Pro", "Con"):',
          default: 'For'
        },
        {
          type: 'input',
          name: 'position2',
          message: 'Position for the second debater:',
          default: 'Against'
        },
        {
          type: 'list',
          name: 'streamingPreference',
          message: 'How would you like to see debate responses?',
          choices: [
            { name: 'Stream word by word (may have issues with some APIs)', value: 'stream' },
            { name: 'Show complete responses', value: 'complete' }
          ],
          default: 'complete',
        }
      ]);
      
      const selectedTopic = answers.topicSelection === 'custom' ? 
        answers.customTopic : answers.topic;
      
      console.log(chalk.bold('\nStarting debate:'));
      console.log(`Topic: ${chalk.yellow(selectedTopic)}`);
      console.log(`Format: ${chalk.yellow(DEBATE_FORMATS[answers.format].name)}`);
      console.log(`${answers.position1}: ${chalk.green(answers.model1)}`);
      console.log(`${answers.position2}: ${chalk.green(answers.model2)}`);
      
      // Confirm start
      const { confirm } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirm',
          message: 'Ready to start the debate? The arguments will be presented one by one.',
          default: true
        }
      ]);
      
      if (!confirm) {
        console.log(chalk.yellow('Debate cancelled'));
        return;
      }
      
      // Create debate
      const debate = new Debate(selectedTopic, answers.format);
      debate.addParticipant(answers.model1, answers.position1);
      debate.addParticipant(answers.model2, answers.position2);
      
      // Progress updater for rounds
      const updateProgress = (message) => {
        console.log(chalk.blue(`\n${message}`));
      };
      
      // Stream updater to display content in real-time
      const streamToConsole = (chunk) => {
        process.stdout.write(chunk);
      };
      
      // Set the streaming configuration based on user preference
      const config = {
        useStreaming: false // Always use complete responses, not streaming
      };
      
      // Run debate with improved error handling
      await debate.runDebate(updateProgress, streamToConsole, config);
      
      console.log(chalk.green('\n\nDebate completed!'));
      
      // User prediction before judging
      console.log(chalk.bold('\nBefore seeing the AI judges\' evaluation, who do you think won?'));
      
      const userPrediction = await inquirer.prompt([
        {
          type: 'list',
          name: 'winner',
          message: 'Select who you think won the debate:',
          choices: [
            { 
              name: `${debate.participants[0].displayName} (${debate.participants[0].position})`, 
              value: 0 
            },
            { 
              name: `${debate.participants[1].displayName} (${debate.participants[1].position})`, 
              value: 1 
            }
          ]
        },
        {
          type: 'input',
          name: 'reason',
          message: 'Why do you think they won? (optional):',
          default: ''
        }
      ]);
      
      // Save user prediction to debate object
      debate.userJudgment = {
        winner: debate.participants[userPrediction.winner],
        reason: userPrediction.reason
      };
      await saveDebate(debate);
      
      // Ask for judging panel
      const judgeSelectionPrompt = [
        {
          type: 'confirm',
          name: 'customJudges',
          message: 'Would you like to select specific judges for the panel?',
          default: false
        }
      ];
      
      // Add judge selection questions if user wants custom judges
      for (let i = 1; i <= 3; i++) {
        judgeSelectionPrompt.push({
          type: 'list',
          name: `judge${i}`,
          message: `Select judge ${i} for the panel:`,
          choices: (answers) => {
            // Filter out already selected judges to prevent duplicates
            const selectedJudges = [];
            for (let j = 1; j < i; j++) {
              if (answers[`judge${j}`]) {
                selectedJudges.push(answers[`judge${j}`]);
              }
            }
            return judgeModels.filter(judge => !selectedJudges.includes(judge));
          },
          when: (answers) => answers.customJudges
        });
      }
      
      const judgeSelections = await inquirer.prompt(judgeSelectionPrompt);
      
      // Either use user-selected judges or pick 3 random judges
      let judgePanel;
      if (judgeSelections.customJudges) {
        judgePanel = [
          judgeSelections.judge1,
          judgeSelections.judge2,
          judgeSelections.judge3
        ];
      } else {
        // Randomly select 3 unique judges
        judgePanel = [];
        const availableJudges = [...judgeModels];
        
        for (let i = 0; i < 3 && availableJudges.length > 0; i++) {
          const randomIndex = Math.floor(Math.random() * availableJudges.length);
          judgePanel.push(availableJudges[randomIndex]);
          availableJudges.splice(randomIndex, 1);
        }
        
        // If we don't have 3 unique models, repeat some
        while (judgePanel.length < 3) {
          judgePanel.push(judgeModels[Math.floor(Math.random() * judgeModels.length)]);
        }
      }
      
      console.log(chalk.bold('\nJudging Panel:'));
      judgePanel.forEach((judgeId, index) => {
        const model = modelService.getModelInfo(judgeId);
        console.log(`${index + 1}. ${model.displayName}`);
      });
      
      // Run judging with panel
      const spinner = ora('Panel of judges is evaluating the debate...').start();
      
      try {
        const updateJudgeProgress = (message) => {
          spinner.text = message;
        };
        
        const panelJudgment = await judgingSystem.judgeDebateWithPanel(debate.id, judgePanel, updateJudgeProgress);
        spinner.succeed('Judgment completed!');
        
        // Display result
        console.log(chalk.bold('\nJudgment Summary:'));
        
        const finalResult = panelJudgment.panelJudgment.finalResult;
        console.log(`Winner: ${chalk.green(finalResult.winner.displayName)} (${finalResult.winner.position})`);
        console.log(`Vote count: ${finalResult.voteCount[finalResult.winner.modelId]} out of 3 votes`);
        console.log(`Majority percentage: ${finalResult.majorityPercentage.toFixed(2)}%`);
        
        // Show individual judge votes
        console.log(chalk.bold('\nIndividual Judge Votes:'));
        finalResult.judgeVotes.forEach((vote, index) => {
          console.log(`Judge ${index + 1}: ${vote.judgeName} voted for ${vote.selectedWinner} (${vote.selectedWinnerPosition})`);
        });
        
        // Show ELO change
        const ratingUpdate = finalResult.ratingUpdate;
        console.log(chalk.bold('\nELO Rating Changes:'));
        console.log(`${finalResult.winner.displayName}: ${ratingUpdate.winner.oldRating} → ${ratingUpdate.winner.newRating} (${ratingUpdate.winner.change >= 0 ? '+' : ''}${ratingUpdate.winner.change})`);
        console.log(`${finalResult.loser.displayName}: ${ratingUpdate.loser.oldRating} → ${ratingUpdate.loser.newRating} (${ratingUpdate.loser.change >= 0 ? '+' : ''}${ratingUpdate.loser.change})`);
        
        // Compare user prediction with AI judgment
        const userPredictionCorrect = debate.userJudgment.winner.modelId === finalResult.winner.modelId;
        console.log(chalk.bold('\nYour Prediction:'));
        console.log(`You selected: ${debate.userJudgment.winner.displayName} (${debate.userJudgment.winner.position})`);
        if (debate.userJudgment.reason) {
          console.log(`Your reasoning: ${debate.userJudgment.reason}`);
        }
        console.log(`Your prediction was ${userPredictionCorrect ? chalk.green('correct!') : chalk.yellow('different from the judges\' decision.')}`);
        
        // Ask if user wants to see full judgments
        const { showJudgments } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'showJudgments',
            message: 'Would you like to see the detailed judgments from the panel?',
            default: false
          }
        ]);
        
        if (showJudgments) {
          console.log(chalk.bold('\nDetailed Judgments:'));
          panelJudgment.panelJudgment.judges.forEach((judge, index) => {
            const judgeModel = modelService.getModelInfo(judge.judgeModelId);
            console.log(chalk.bold(`\n--- Judge ${index + 1}: ${judgeModel.displayName} ---\n`));
            console.log(judge.response);
          });
        }
        
      } catch (error) {
        spinner.fail(`Judging failed: ${error.message}`);
      }
      
      console.log(chalk.bold(`\nDebate saved with ID: ${debate.id}`));
      console.log(`Run 'ai-debate-club view ${debate.id}' to see the full debate transcript`);
      
    } catch (error) {
      console.error(chalk.red(`Error: ${error.message}`));
      console.error(error);
    }
  });

// List past debates
program
  .command('list')
  .description('List all past debates')
  .action(async () => {
    try {
      const spinner = ora('Loading debate history...').start();
      const debates = await listDebates();
      spinner.stop();
      
      if (debates.length === 0) {
        console.log(chalk.yellow('No debates found'));
        return;
      }
      
      console.log(chalk.bold(`\nFound ${debates.length} debate(s):`));
      
      debates.forEach((debate, index) => {
        console.log(`\n${index + 1}. ${chalk.green(debate.id)}`);
        console.log(`   Topic: ${chalk.yellow(debate.topic)}`);
        console.log(`   Format: ${debate.format}`);
        console.log(`   Participants: ${debate.participants.map(p => `${p.displayName} (${p.position})`).join(' vs ')}`);
        console.log(`   Status: ${debate.completed ? chalk.green('Completed') : chalk.yellow('In progress')}`);
      });
      
      console.log('\nTo view a debate transcript, run:');
      console.log(chalk.grey('  ai-debate-club view <debate-id>'));
      
    } catch (error) {
      console.error(chalk.red(`Error: ${error.message}`));
    }
  });

// View a debate
program
  .command('view <debateId>')
  .description('View the transcript of a past debate')
  .action(async (debateId) => {
    try {
      const spinner = ora('Loading debate...').start();
      const debate = await loadDebate(debateId);
      spinner.stop();
      
      if (!debate) {
        console.log(chalk.red(`Debate with ID ${debateId} not found`));
        return;
      }
      
      console.log(chalk.bold(`\nDebate: ${debate.id}`));
      console.log(`Topic: ${chalk.yellow(debate.topic)}`);
      console.log(`Format: ${debate.format.name}`);
      console.log(`Participants:`);
      debate.participants.forEach(p => {
        console.log(`- ${p.displayName} (${p.position})`);
      });
      
      console.log(chalk.bold('\nTranscript:'));
      
      // Group history by round
      const roundsData = {};
      for (const entry of debate.history) {
        if (!roundsData[entry.round]) {
          roundsData[entry.round] = [];
        }
        roundsData[entry.round].push(entry);
      }
      
      // Display each round
      for (let i = 0; i < Object.keys(roundsData).length; i++) {
        const round = debate.format.rounds[i];
        console.log(chalk.bold(`\n--- Round ${i + 1}: ${round.name} ---`));
        
        for (const entry of roundsData[i]) {
          const participant = debate.participants.find(p => p.modelId === entry.modelId);
          console.log(chalk.bold(`\n${participant.displayName} (${participant.position}):`));
          console.log(entry.response);
        }
      }
      
      // Show judgment if available
      if (debate.judgment) {
        console.log(chalk.bold('\n--- Judgment ---'));
        
        if (debate.judgment.result.winner) {
          const winner = debate.judgment.result.winner;
          console.log(`Winner: ${chalk.green(winner.displayName)} (${winner.position})`);
        } else if (debate.judgment.result.isDraw) {
          console.log(chalk.yellow('Result: Draw'));
        } else {
          console.log(chalk.yellow('Result: Unable to determine a clear winner'));
        }
        
        // Ask if user wants to see full judgment
        const { showJudgment } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'showJudgment',
            message: 'Would you like to see the full judgment?',
            default: true
          }
        ]);
        
        if (showJudgment) {
          console.log(chalk.bold('\nFull Judgment:'));
          console.log(debate.judgment.response);
        }
      }
      
    } catch (error) {
      console.error(chalk.red(`Error: ${error.message}`));
    }
  });

// View ELO rankings
program
  .command('rankings')
  .description('View current ELO rankings of models')
  .action(async () => {
    try {
      // Initialize ELO system
      await elo.initialize();
      
      const rankings = await elo.getRankings();
      
      if (rankings.length === 0) {
        console.log(chalk.yellow('No ELO rankings available yet. Run some debates to see rankings.'));
        return;
      }
      
      console.log(chalk.bold('\nCurrent ELO Rankings:'));
      
      rankings.forEach((item, index) => {
        const model = modelService.getModelInfo(item.id);
        const displayName = model ? model.displayName : item.id;
        console.log(`${index + 1}. ${chalk.green(displayName)}: ${item.rating}`);
      });
      
    } catch (error) {
      console.error(chalk.red(`Error: ${error.message}`));
    }
  });

// Judge an existing debate
program
  .command('judge <debateId>')
  .description('Judge an existing debate with a panel of 3 judges')
  .option('-j, --judges <modelIds>', 'Specify comma-separated judge model IDs')
  .action(async (debateId, options) => {
    try {
      // Load the debate
      const spinner = ora('Loading debate...').start();
      const debate = await loadDebate(debateId);
      
      if (!debate) {
        spinner.fail(`Debate with ID ${debateId} not found`);
        return;
      }
      
      if (!debate.completed) {
        spinner.fail('Cannot judge an incomplete debate');
        return;
      }
      
      spinner.succeed('Debate loaded');
      
      // If already judged, confirm re-judging
      if (debate.judgment) {
        const { confirm } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'confirm',
            message: 'This debate has already been judged. Re-judge it?',
            default: false
          }
        ]);
        
        if (!confirm) {
          console.log(chalk.yellow('Judging cancelled'));
          return;
        }
      }
      
      // Get judge model
      let judgeModelId = options.model;
      
      if (!judgeModelId) {
        const judgeModels = modelService.getJudgeModels();
        
        const { model } = await inquirer.prompt([
          {
            type: 'list',
            name: 'model',
            message: 'Select judge model:',
            choices: judgeModels
          }
        ]);
        
        judgeModelId = model;
      }
      
      // Run judging
      spinner.text = 'Judge is evaluating the debate...';
      spinner.start();
      
      try {
        const judgment = await judgingSystem.judgeDebate(debate.id, judgeModelId);
        spinner.succeed('Judgment completed!');
        
        // Save updated debate with judgment
        await saveDebate(judgment.debate);
        
        // Display result
        console.log(chalk.bold('\nJudgment Summary:'));
        
        if (judgment.judgment.result.winner) {
          const winner = judgment.judgment.result.winner;
          console.log(`Winner: ${chalk.green(winner.displayName)} (${winner.position})`);
          
          // Show ELO change if available
          if (judgment.judgment.result.ratingUpdate) {
            const ratingUpdate = judgment.judgment.result.ratingUpdate;
            console.log(`\nELO Rating Changes:`);
            console.log(`${winner.displayName}: ${ratingUpdate.winner.oldRating} → ${ratingUpdate.winner.newRating} (${ratingUpdate.winner.change >= 0 ? '+' : ''}${ratingUpdate.winner.change})`);
            console.log(`${judgment.judgment.result.loser.displayName}: ${ratingUpdate.loser.oldRating} → ${ratingUpdate.loser.newRating} (${ratingUpdate.loser.change >= 0 ? '+' : ''}${ratingUpdate.loser.change})`);
          }
        } else if (judgment.judgment.result.isDraw) {
          console.log(chalk.yellow('Result: Draw'));
          
          // Show ELO change if available
          if (judgment.judgment.result.ratingUpdate) {
            const ratingUpdate = judgment.judgment.result.ratingUpdate;
            console.log(`\nELO Rating Changes:`);
            console.log(`${debate.participants[0].displayName}: ${ratingUpdate.model1.oldRating} → ${ratingUpdate.model1.newRating} (${ratingUpdate.model1.change >= 0 ? '+' : ''}${ratingUpdate.model1.change})`);
            console.log(`${debate.participants[1].displayName}: ${ratingUpdate.model2.oldRating} → ${ratingUpdate.model2.newRating} (${ratingUpdate.model2.change >= 0 ? '+' : ''}${ratingUpdate.model2.change})`);
          }
        } else {
          console.log(chalk.yellow('Result: Unable to determine a clear winner'));
        }
        
        // Ask if user wants to see full judgment
        const { showJudgment } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'showJudgment',
            message: 'Would you like to see the full judgment?',
            default: true
          }
        ]);
        
        if (showJudgment) {
          console.log(chalk.bold('\nFull Judgment:'));
          console.log(judgment.judgment.response);
        }
        
      } catch (error) {
        spinner.fail(`Judging failed: ${error.message}`);
      }
    } catch (error) {
      console.error(chalk.red(`Error: ${error.message}`));
    }
  });

// Export debates to markdown
program
  .command('export <debateId>')
  .description('Export a debate to Markdown')
  .option('-o, --output <path>', 'Output file path')
  .action(async (debateId, options) => {
    try {
      const spinner = ora('Loading debate...').start();
      const debate = await loadDebate(debateId);
      
      if (!debate) {
        spinner.fail(`Debate with ID ${debateId} not found`);
        return;
      }
      
      // Generate markdown content
      let markdown = `# Debate: ${debate.topic}\n\n`;
      markdown += `- **Format**: ${debate.format.name}\n`;
      markdown += `- **Date**: ${new Date(parseInt(debate.id)).toLocaleDateString()}\n\n`;
      
      markdown += `## Participants\n\n`;
      debate.participants.forEach(p => {
        markdown += `- **${p.position}**: ${p.displayName}\n`;
      });
      
      markdown += `\n## Transcript\n\n`;
      
      // Group history by round
      const roundsData = {};
      for (const entry of debate.history) {
        if (!roundsData[entry.round]) {
          roundsData[entry.round] = [];
        }
        roundsData[entry.round].push(entry);
      }
      
      // Format debate rounds
      for (let i = 0; i < Object.keys(roundsData).length; i++) {
        const round = debate.format.rounds[i];
        markdown += `### Round ${i + 1}: ${round.name}\n\n`;
        
        for (const entry of roundsData[i]) {
          const participant = debate.participants.find(p => p.modelId === entry.modelId);
          markdown += `#### ${participant.displayName} (${participant.position})\n\n`;
          markdown += `${entry.response}\n\n`;
        }
      }
      
      // Add user judgment if available
      if (debate.userJudgment) {
        markdown += `## User Judgment\n\n`;
        markdown += `User selected: **${debate.userJudgment.winner.displayName} (${debate.userJudgment.winner.position})**\n\n`;
        if (debate.userJudgment.reason) {
          markdown += `Reasoning: ${debate.userJudgment.reason}\n\n`;
        }
      }
      
      // Add panel judgment if available
      if (debate.panelJudgment) {
        markdown += `## Panel Judgment\n\n`;
        
        const finalResult = debate.panelJudgment.finalResult;
        markdown += `**Winner**: ${finalResult.winner.displayName} (${finalResult.winner.position})\n\n`;
        markdown += `Vote count: ${finalResult.voteCount[finalResult.winner.modelId]} out of 3 votes\n`;
        markdown += `Majority percentage: ${finalResult.majorityPercentage.toFixed(2)}%\n\n`;
        
        // Show individual judge votes
        markdown += `### Individual Judge Votes\n\n`;
        finalResult.judgeVotes.forEach((vote, index) => {
          markdown += `- Judge ${index + 1} (${vote.judgeName}): voted for ${vote.selectedWinner} (${vote.selectedWinnerPosition})\n`;
        });
        
        markdown += `\n### Detailed Judgments\n\n`;
        debate.panelJudgment.judges.forEach((judge, index) => {
          const judgeModel = modelService.getModelInfo(judge.judgeModelId);
          markdown += `#### Judge ${index + 1}: ${judgeModel.displayName}\n\n`;
          markdown += `${judge.response}\n\n`;
        });
      }
      // Add single judgment if available (older debates)
      else if (debate.judgment) {
        markdown += `## Judgment\n\n`;
        markdown += `Judged by: **${modelService.getModelInfo(debate.judgment.judgeModelId).displayName}**\n\n`;
        
        if (debate.judgment.result.winner) {
          const winner = debate.judgment.result.winner;
          markdown += `**Winner**: ${winner.displayName} (${winner.position})\n\n`;
        } else if (debate.judgment.result.isDraw) {
          markdown += `**Result**: Draw\n\n`;
        }
        
        markdown += `### Full Evaluation\n\n`;
        markdown += debate.judgment.response;
      }
      
      spinner.succeed('Debate exported to Markdown');
      
      // Determine output path
      let outputPath = options.output;
      if (!outputPath) {
        outputPath = `./debate-${debateId}.md`;
      }
      
      // Write to file
      await fs.writeFile(outputPath, markdown);
      
      console.log(`\nDebate exported to: ${outputPath}`);
      
    } catch (error) {
      console.error(chalk.red(`Error: ${error.message}`));
    }
  });

// Parse command-line arguments
program.parse();

// Display help if no arguments provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}

const handleNew = async () => {
  console.log('Verifying API access...');
  try {
    // Make sure the API client is initialized
    const apiClient = getApiClient(); // This might be the issue - ensure this function exists

    if (!apiClient) {
      throw new Error('API client not initialized. Check your configuration.');
    }

    const testResult = await apiClient.generateResponse('test');
    console.log('✓ API connection successful!');
    // Continue with the new command logic
  } catch (error) {
    console.error(`✖ API connection test failed: ${error.message}`);
    console.log('Ensure your API key is properly set in the configuration.');
  }
};
