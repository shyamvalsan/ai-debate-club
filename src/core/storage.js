import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define storage locations
const DATA_DIR = path.join(__dirname, '../../data');
const DEBATES_DIR = path.join(DATA_DIR, 'debates');
const ELO_FILE = path.join(DATA_DIR, 'elo-ratings.json');
const TOPICS_FILE = path.join(DATA_DIR, 'debate-topics.json');

// Ensure directories exist
fs.ensureDirSync(DATA_DIR);
fs.ensureDirSync(DEBATES_DIR);

// Initialize ELO ratings if they don't exist
export const initializeEloRatings = async () => {
  if (!fs.existsSync(ELO_FILE)) {
    await fs.writeJson(ELO_FILE, {});
  }
  return await fs.readJson(ELO_FILE);
};

// Save debate to storage
export const saveDebate = async (debate) => {
  const debateFile = path.join(DEBATES_DIR, `${debate.id}.json`);
  await fs.writeJson(debateFile, debate, { spaces: 2 });
  return debateFile;
};

// Load debate from storage
export const loadDebate = async (debateId) => {
  const debateFile = path.join(DEBATES_DIR, `${debateId}.json`);
  if (!fs.existsSync(debateFile)) {
    return null;
  }
  return await fs.readJson(debateFile);
};

// List all debates
export const listDebates = async () => {
  await fs.ensureDir(DEBATES_DIR);
  const files = await fs.readdir(DEBATES_DIR);
  
  const debates = [];
  for (const file of files) {
    if (file.endsWith('.json')) {
      const debate = await fs.readJson(path.join(DEBATES_DIR, file));
      debates.push({
        id: debate.id,
        topic: debate.topic,
        format: debate.format.name,
        participants: debate.participants,
        completed: debate.completed
      });
    }
  }
  
  return debates;
};

// Save ELO ratings
export const saveEloRatings = async (ratings) => {
  await fs.writeJson(ELO_FILE, ratings, { spaces: 2 });
  return ratings;
};

// Get ELO ratings
export const getEloRatings = async () => {
  if (!fs.existsSync(ELO_FILE)) {
    return {};
  }
  return await fs.readJson(ELO_FILE);
};

// Initialize and get debate topics
export const initializeDebateTopics = async () => {
  if (!fs.existsSync(TOPICS_FILE)) {
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
    
    await fs.writeJson(TOPICS_FILE, defaultTopics, { spaces: 2 });
  }
  
  return await fs.readJson(TOPICS_FILE);
};
