import modelService from '../models/index.js';
import { saveDebate } from './storage.js';

export const DEBATE_FORMATS = {
  STANDARD: {
    name: 'Standard Debate',
    description: 'A standard debate with opening statements, rebuttals, and closing statements',
    rounds: [
      { type: 'opening', name: 'Opening Statement', tokens: 2000 },
      { type: 'rebuttal', name: 'Rebuttal', tokens: 1500 },
      { type: 'counter-rebuttal', name: 'Counter-Rebuttal', tokens: 1500 },
      { type: 'closing', name: 'Closing Statement', tokens: 1500 }
    ]
  },
  
  SHORT: {
    name: 'Short Debate',
    description: 'A shorter debate format with opening and closing only',
    rounds: [
      { type: 'opening', name: 'Opening Statement', tokens: 1500 },
      { type: 'closing', name: 'Closing Statement', tokens: 1500 }
    ]
  },
  
  COMPREHENSIVE: {
    name: 'Comprehensive Debate',
    description: 'A detailed debate with multiple rounds of rebuttals',
    rounds: [
      { type: 'opening', name: 'Opening Statement', tokens: 2000 },
      { type: 'rebuttal', name: 'First Rebuttal', tokens: 1500 },
      { type: 'counter-rebuttal', name: 'First Counter-Rebuttal', tokens: 1500 },
      { type: 'rebuttal', name: 'Second Rebuttal', tokens: 1000 },
      { type: 'counter-rebuttal', name: 'Second Counter-Rebuttal', tokens: 1000 },
      { type: 'closing', name: 'Closing Statement', tokens: 2000 }
    ]
  },
  
  SOCRATIC: {
    name: 'Socratic Dialogue',
    description: 'A philosophical debate based on questioning to stimulate critical thinking',
    style: 'socratic',
    rounds: [
      { type: 'opening', name: 'Initial Position', tokens: 1500 },
      { type: 'questioning', name: 'Socratic Questioning', tokens: 1500 },
      { type: 'response', name: 'Response to Questions', tokens: 1500 },
      { type: 'closing', name: 'Final Position', tokens: 1500 }
    ]
  },
  
  OXFORD: {
    name: 'Oxford-Style Debate',
    description: 'A formal debate with strict rules and timed speeches',
    style: 'oxford',
    rounds: [
      { type: 'opening', name: 'Opening Statement', tokens: 2000 },
      { type: 'rebuttal', name: 'First Rebuttal', tokens: 1500 },
      { type: 'cross-examination', name: 'Cross-Examination', tokens: 1000 },
      { type: 'closing', name: 'Closing Statement', tokens: 1500 }
    ]
  },
  
  LINCOLN_DOUGLAS: {
    name: 'Lincoln-Douglas Debate',
    description: 'A one-on-one debate format focusing on values and philosophical arguments',
    style: 'lincoln-douglas',
    rounds: [
      { type: 'opening', name: 'Affirmative Constructive', tokens: 2000 },
      { type: 'opening', name: 'Negative Constructive', tokens: 2000 },
      { type: 'rebuttal', name: 'Affirmative Rebuttal', tokens: 1500 },
      { type: 'rebuttal', name: 'Negative Rebuttal', tokens: 1500 },
      { type: 'closing', name: 'Closing Statements', tokens: 1500 }
    ]
  },
  
  NYAYASUTRA: {
    name: 'Nyayasutra Debate',
    description: 'An ancient Indian debate format based on logical reasoning and structured arguments',
    style: 'nyayasutra',
    rounds: [
      { type: 'opening', name: 'Pratijna (Proposition)', tokens: 1500 },
      { type: 'hetu', name: 'Hetu (Reason)', tokens: 1500 },
      { type: 'udaharana', name: 'Udaharana (Example)', tokens: 1500 },
      { type: 'closing', name: 'Nigamana (Conclusion)', tokens: 1500 }
    ]
  },
  
  CONFUCIAN: {
    name: 'Confucian Dialogue',
    description: 'A respectful debate style emphasizing harmony and mutual understanding',
    style: 'confucian',
    rounds: [
      { type: 'opening', name: 'Initial Wisdom', tokens: 1500 },
      { type: 'elaboration', name: 'Elaboration of Views', tokens: 1500 },
      { type: 'reconciliation', name: 'Seeking Harmony', tokens: 1500 },
      { type: 'closing', name: 'Virtuous Conclusion', tokens: 1500 }
    ]
  },
  
  BUDDHIST: {
    name: 'Buddhist Debate Style',
    description: 'A contemplative debate style examining truth from multiple perspectives',
    style: 'buddhist',
    rounds: [
      { type: 'opening', name: 'Initial View', tokens: 1500 },
      { type: 'contemplation', name: 'Middle Path Examination', tokens: 1500 },
      { type: 'rebuttal', name: 'Refuting Extremes', tokens: 1500 },
      { type: 'closing', name: 'Enlightened Conclusion', tokens: 1500 }
    ]
  },
  
  RAP_BATTLE: {
    name: 'Rap Battle',
    description: 'A creative debate format using rhythm, rhyme and wordplay',
    style: 'rap_battle',
    rounds: [
      { type: 'opening', name: 'Opening Verse', tokens: 1000 },
      { type: 'diss', name: 'Diss Track', tokens: 1000 },
      { type: 'comeback', name: 'Comeback Verse', tokens: 1000 },
      { type: 'closing', name: 'Final Bars', tokens: 1000 }
    ]
  },
  
  PARLIAMENTARY: {
    name: 'Parliamentary Debate',
    description: 'A formal legislative-style debate with government and opposition roles',
    style: 'parliamentary',
    rounds: [
      { type: 'opening', name: 'Prime Minister Speech', tokens: 2000 },
      { type: 'opening', name: 'Leader of Opposition Speech', tokens: 2000 },
      { type: 'rebuttal', name: 'Government Rebuttal', tokens: 1500 },
      { type: 'rebuttal', name: 'Opposition Rebuttal', tokens: 1500 },
      { type: 'closing', name: 'Closing Speeches', tokens: 1500 }
    ]
  },
};

export class Debate {
  constructor(topic, formatType = 'STANDARD') {
    this.id = Date.now().toString();
    this.topic = topic;
    this.format = DEBATE_FORMATS[formatType];
    this.participants = [];
    this.history = [];
    this.currentRound = 0;
    this.completed = false;
  }

  addParticipant(modelId, position) {
    this.participants.push({
      modelId,
      position,
      displayName: modelService.getModelInfo(modelId).displayName
    });
    return this;
  }

  async runDebate(onProgressUpdate = null, onStreamUpdate = null) {
    if (this.participants.length !== 2) {
      throw new Error("Debate requires exactly 2 participants");
    }
    const [participant1, participant2] = this.participants;
    
    // For each round in the debate format
    for (let roundIdx = 0; roundIdx < this.format.rounds.length; roundIdx++) {
      this.currentRound = roundIdx;
      const round = this.format.rounds[roundIdx];
      
      // Generate prompts and collect responses for each participant
      for (const participant of [participant1, participant2]) {
        const prompt = this._generatePrompt(participant, roundIdx);
        
        if (onProgressUpdate) {
          onProgressUpdate(`${round.name} - ${participant.displayName} (${participant.position})`);
        }
        
        // Initialize streaming response if handler provided
        if (onStreamUpdate) {
          // Display header for the current speaker
          onStreamUpdate(`\n--- ${participant.displayName} (${participant.position}) - ${round.name} ---\n\n`);
          
          // Stream the response
          let completeResponse = '';
          
          try {
            // Use non-streaming method to avoid streaming issues
            completeResponse = await modelService.generateResponse(
              participant.modelId,
              prompt,
              {
                maxTokens: round.tokens,
                systemPrompt: this._getSystemPrompt(participant, roundIdx)
              }
            );
            
            // Provide the full response at once
            onStreamUpdate(completeResponse);
          } catch (error) {
            console.error('Error in debate response:', error);
            onStreamUpdate(`\nError: ${error.message}\n`);
            completeResponse = `Error generating response: ${error.message}`;
          }
          
          // Record the complete response in debate history
          this.history.push({
            round: roundIdx,
            roundName: round.name,
            modelId: participant.modelId,
            position: participant.position,
            prompt,
            response: completeResponse
          });
        } else {
          // Non-streaming fallback
          let response;
          try {
            response = await modelService.generateResponse(
              participant.modelId,
              prompt, 
              {
                maxTokens: round.tokens,
                systemPrompt: this._getSystemPrompt(participant, roundIdx)
              }
            );
          } catch (error) {
            console.error('Error in debate response:', error);
            response = `Error generating response: ${error.message}`;
          }
          
          // Record the response in debate history
          this.history.push({
            round: roundIdx,
            roundName: round.name,
            modelId: participant.modelId,
            position: participant.position,
            prompt,
            response
          });
        }
      }
      
      if (onProgressUpdate) {
        onProgressUpdate(`Completed round ${roundIdx + 1} of ${this.format.rounds.length}`);
      }
    }
    
    this.completed = true;
    
    // Save debate to storage
    await saveDebate(this);
    
    return this.history;
  }

  _generatePrompt(participant, roundIdx) {
    const round = this.format.rounds[roundIdx];
    const otherParticipant = this.participants.find(p => p.modelId !== participant.modelId);
    
    // Base prompt that includes debate topic and position
    let prompt = `DEBATE TOPIC: ${this.topic}\n\n`;
    prompt += `Your position: ${participant.position}\n\n`;
    
    // Add context from previous rounds if any
    if (roundIdx > 0) {
      prompt += "Previous rounds:\n\n";
      for (let i = 0; i < roundIdx; i++) {
        const prevRound = this.format.rounds[i];
        const participantHistory = this.history.filter(h => h.round === i);
        
        prompt += `=== ${prevRound.name} ===\n\n`;
        
        // Get participant's own previous statement
        const ownPrevious = participantHistory.find(h => h.modelId === participant.modelId);
        if (ownPrevious) {
          prompt += `Your statement:\n${ownPrevious.response}\n\n`;
        }
        
        // Get opponent's previous statement
        const opponentPrevious = participantHistory.find(h => h.modelId === otherParticipant.modelId);
        if (opponentPrevious) {
          prompt += `Opponent's statement:\n${opponentPrevious.response}\n\n`;
        }
      }
    }
    
    // Add specific instructions based on the round type
    prompt += `=== ${round.name} ===\n\n`;
    
    switch(round.type) {
      case 'opening':
        prompt += `Present your initial arguments for the ${participant.position} position on the topic "${this.topic}". Provide clear reasoning and evidence to support your position.`;
        break;
      case 'rebuttal':
        prompt += `Address and counter the arguments made by your opponent in their previous statement. Identify weaknesses in their reasoning and strengthen your own position.`;
        break;
      case 'counter-rebuttal':
        prompt += `Respond to your opponent's rebuttals and defend your original arguments. Address any criticisms they made and reinforce the strength of your position.`;
        break;
      case 'closing':
        prompt += `Provide a compelling conclusion to the debate. Summarize your key arguments, address the most important points of contention, and explain why your position is ultimately stronger.`;
        break;
      default:
        prompt += `Present your arguments for the ${participant.position} position on the topic "${this.topic}".`;
    }
    
    return prompt;
  }

  _getSystemPrompt(participant, roundIdx) {
    const basePrompt = `You are participating in a formal debate. The topic is: "${this.topic}". Your position is: ${participant.position}. This is the ${this.format.rounds[roundIdx].name} round.`;
    
    // Add style-specific instructions if available
    if (this.format.style) {
      const styleInstructions = {
        'socratic': 'Use the Socratic method of questioning to reveal insights. Focus on asking thoughtful questions and examining assumptions.',
        'oxford': 'Follow the formal Oxford debating style. Be eloquent, structured, and respectful of procedure.',
        'lincoln-douglas': 'Focus on values and philosophical frameworks. Present clear value contentions and address the moral dimensions of the topic.',
        'nyayasutra': 'Follow the ancient Indian Nyaya school of logic. Structure your argument with clear proposition, reason, example, and conclusion.',
        'confucian': 'Emphasize harmony, respect, and the pursuit of wisdom. Use references to tradition and prioritize collective well-being.',
        'buddhist': 'Consider multiple perspectives and avoid extremes. Focus on compassionate reasoning and the elimination of suffering.',
        'rap_battle': 'Use rhymes, wordplay, and creative language. Be persuasive but also entertaining with your flow and delivery.',
        'parliamentary': 'Use formal parliamentary language and procedure. Address "the chair" and follow the conventions of legislative debate.'
      };
      
      return `${basePrompt} ${styleInstructions[this.format.style] || ''}`;
    }
    
    return basePrompt;
  }

  getDebateSummary() {
    return {
      id: this.id,
      topic: this.topic,
      format: this.format.name,
      participants: this.participants.map(p => ({
        position: p.position,
        model: p.displayName
      })),
      rounds: this.format.rounds.length,
      completed: this.completed
    };
  }
}
