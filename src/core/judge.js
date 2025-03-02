import modelService from '../models/index.js';
import elo from './elo.js';
import { loadDebate } from './storage.js';

export class JudgingSystem {
  constructor() {
    this.criteria = [
      {
        name: 'Argument Quality',
        description: 'Strength, clarity, and logical soundness of the arguments presented',
        weight: 0.35
      },
      {
        name: 'Evidence Use',
        description: 'Appropriate and effective use of evidence, data, and examples',
        weight: 0.25
      },
      {
        name: 'Rebuttal Effectiveness',
        description: 'Success in addressing and countering opponent\'s arguments',
        weight: 0.25
      },
      {
        name: 'Presentation',
        description: 'Clarity, persuasiveness, and overall quality of communication',
        weight: 0.15
      }
    ];
  }
  
  async judgeDebate(debateId, judgeModelId) {
    const debate = await loadDebate(debateId);
    
    if (!debate || !debate.completed) {
      throw new Error("Cannot judge: debate not found or not completed");
    }
    
    const modelInfo = modelService.getModelInfo(judgeModelId);
    if (!modelInfo || !modelInfo.capabilities.judge) {
      throw new Error(`Model ${judgeModelId} is not a valid judge`);
    }
    
    // Get the debate summary and construct the judging prompt
    const judgingPrompt = this._constructJudgingPrompt(debate);
    
    // Get judgment from the judge model
    const judgmentResponse = await modelService.generateResponse(
      judgeModelId,
      judgingPrompt,
      {
        systemPrompt: "You are an expert debate judge. Carefully evaluate the arguments of both sides according to the provided criteria. Be fair, impartial, and detailed in your analysis. Make sure to provide a clear winner based on the better arguments.",
        maxTokens: 3000
      }
    );
    
    // Extract scores and results
    const result = this._parseJudgmentResponse(judgmentResponse, debate);
    
    // Update ELO ratings if there's a clear winner
    if (result.winner && result.loser) {
      const ratingUpdate = await elo.updateRatings(result.winner.modelId, result.loser.modelId);
      result.ratingUpdate = ratingUpdate;
    } else if (result.isDraw) {
      const ratingUpdate = await elo.updateRatingsWithDraw(
        debate.participants[0].modelId,
        debate.participants[1].modelId
      );
      result.ratingUpdate = ratingUpdate;
    }
    
    // Add judgment to debate record
    debate.judgment = {
      judgeModelId,
      response: judgmentResponse,
      result: result
    };
    
    return {
      debate,
      judgment: debate.judgment
    };
  }
  
  async judgeDebateWithPanel(debateId, judgeModelIds, onProgressUpdate = null) {
    const debate = await loadDebate(debateId);
    
    if (!debate || !debate.completed) {
      throw new Error("Cannot judge: debate not found or not completed");
    }
    
    // Validate that we have the right number of judges
    if (!Array.isArray(judgeModelIds) || judgeModelIds.length !== 3) {
      throw new Error("Exactly 3 judge models are required for panel judgment");
    }
    
    // Validate that all models are valid judges
    for (const modelId of judgeModelIds) {
      const modelInfo = modelService.getModelInfo(modelId);
      if (!modelInfo || !modelInfo.capabilities.judge) {
        throw new Error(`Model ${modelId} is not a valid judge`);
      }
    }
    
    // Get judgments from each judge
    const judgments = [];
    
    for (let i = 0; i < judgeModelIds.length; i++) {
      const judgeModelId = judgeModelIds[i];
      
      if (onProgressUpdate) {
        onProgressUpdate(`Judge ${i + 1}/${judgeModelIds.length} (${modelService.getModelInfo(judgeModelId).displayName}) is evaluating...`);
      }
      
      // Construct judging prompt
      const judgingPrompt = this._constructJudgingPrompt(debate, true);
      
      // Get judgment from the judge model
      const judgmentResponse = await modelService.generateResponse(
        judgeModelId,
        judgingPrompt,
        {
          systemPrompt: "You are an expert debate judge. Carefully evaluate the arguments of both sides according to the provided criteria. Be fair, impartial, and detailed in your analysis. You MUST select a winner - no ties or draws allowed.",
          maxTokens: 3000
        }
      );
      
      // Extract result and add to judgments
      const result = this._parseJudgmentResponse(judgmentResponse, debate);
      
      // Ensure a winner was selected
      if (!result.winner || !result.loser) {
        throw new Error(`Judge ${modelService.getModelInfo(judgeModelId).displayName} failed to select a definitive winner`);
      }
      
      judgments.push({
        judgeModelId,
        response: judgmentResponse,
        result: result
      });
    }
    
    // Aggregate the results
    const finalResult = this._aggregateJudgments(judgments, debate);
    
    // Update ELO ratings based on the final result
    const ratingUpdate = await elo.updateRatings(finalResult.winner.modelId, finalResult.loser.modelId);
    finalResult.ratingUpdate = ratingUpdate;
    
    // Add panel judgment to debate record
    debate.panelJudgment = {
      judges: judgments,
      finalResult: finalResult
    };
    
    return {
      debate,
      panelJudgment: debate.panelJudgment
    };
  }
  
  _aggregateJudgments(judgments, debate) {
    // Count votes for each participant
    const voteCount = {};
    
    for (const judgment of judgments) {
      const winnerId = judgment.result.winner.modelId;
      voteCount[winnerId] = (voteCount[winnerId] || 0) + 1;
    }
    
    // Determine the overall winner based on majority vote
    let winnerModelId = null;
    let maxVotes = 0;
    
    for (const [modelId, votes] of Object.entries(voteCount)) {
      if (votes > maxVotes) {
        winnerModelId = modelId;
        maxVotes = votes;
      }
    }
    
    const winner = debate.participants.find(p => p.modelId === winnerModelId);
    const loser = debate.participants.find(p => p.modelId !== winnerModelId);
    
    // Calculate how many judges selected each participant
    const judgeVotes = judgments.map(j => {
      const judgeInfo = modelService.getModelInfo(j.judgeModelId);
      return {
        judgeName: judgeInfo ? judgeInfo.displayName : j.judgeModelId,
        selectedWinner: j.result.winner.displayName,
        selectedWinnerPosition: j.result.winner.position
      };
    });
    
    return {
      winner,
      loser,
      voteCount,
      majorityPercentage: (maxVotes / judgments.length) * 100,
      judgeVotes
    };
  }
  
  _constructJudgingPrompt(debate, requireWinner = false) {
    let prompt = `# Debate Evaluation\n\n`;
    prompt += `## Topic: "${debate.topic}"\n\n`;
    
    prompt += `## Participants:\n`;
    prompt += `- Participant A (${debate.participants[0].position}): ${debate.participants[0].displayName}\n`;
    prompt += `- Participant B (${debate.participants[1].position}): ${debate.participants[1].displayName}\n\n`;
    
    prompt += `## Evaluation Criteria:\n`;
    for (const criterion of this.criteria) {
      prompt += `- ${criterion.name} (${criterion.weight * 100}%): ${criterion.description}\n`;
    }
    prompt += `\n`;
    
    prompt += `## Debate Transcript:\n\n`;
    
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
      prompt += `### Round ${i + 1}: ${round.name}\n\n`;
      
      for (const entry of roundsData[i]) {
        const participant = debate.participants.findIndex(p => p.modelId === entry.modelId);
        prompt += `#### Participant ${participant === 0 ? 'A' : 'B'} (${entry.position}):\n\n`;
        prompt += `${entry.response}\n\n`;
      }
    }
    
    prompt += `## Judging Instructions:\n\n`;
    prompt += `1. Evaluate both participants according to the provided criteria.\n`;
    prompt += `2. Score each participant on each criterion on a scale of 1-10.\n`;
    prompt += `3. For each criterion, explain your reasoning for the scores.\n`;
    prompt += `4. Calculate weighted total scores based on criteria weights.\n`;
    
    if (requireWinner) {
      prompt += `5. You MUST select a winner. Ties or draws are NOT permitted. If scores are very close, analyze deeper aspects to determine superiority.\n`;
      prompt += `6. Clearly state your decision with "The winner is [Participant Name] ([Position])" at the end of your evaluation.\n`;
    } else {
      prompt += `5. Determine a winner based on the higher total score, or declare a draw if scores are within 0.5 points.\n`;
    }
    
    prompt += `6. Provide a summary of the key strengths and weaknesses of each participant.\n`;
    prompt += `7. Format your response with clear sections and a final verdict.\n\n`;
    
    prompt += `Begin your evaluation now:`;
    
    return prompt;
  }
  
  _parseJudgmentResponse(judgment, debate) {
    // This is a simplified parser that assumes a structured judgment
    // In a real-world scenario, you might want to use a more robust parsing method
    // or ask the model to return a structured format like JSON
    
    // Try to identify the winner from the judgment text
    const participant1 = debate.participants[0];
    const participant2 = debate.participants[1];
    
    const result = {
      raw: judgment,
      scores: {},
      reasoning: judgment,
      isDraw: judgment.toLowerCase().includes('draw') || judgment.toLowerCase().includes('tie')
    };
    
    // Check for winner mentions
    const position1Mentions = (judgment.match(new RegExp(participant1.position, 'gi')) || []).length;
    const position2Mentions = (judgment.match(new RegExp(participant2.position, 'gi')) || []).length;
    
    // Try to determine winner from "winner" keyword proximity
    const winnerIndicators = [
      'winner is', 'winner:', 'wins the debate', 'is the winner',
      'stronger case', 'more convincing', 'better arguments', 'outperformed'
    ];

    let winner = null;
    let loser = null;
    
    // Check if any winner indicator is close to a participant position
    for (const indicator of winnerIndicators) {
      const indicatorMatches = [...judgment.matchAll(new RegExp(indicator, 'gi'))];
      for (const match of indicatorMatches) {
        const matchPos = match.index;
        const nearbyText = judgment.substring(
          Math.max(0, matchPos - 50),
          Math.min(judgment.length, matchPos + 50)
        );
        
        if (nearbyText.toLowerCase().includes(participant1.position.toLowerCase())) {
          winner = participant1;
          loser = participant2;
          break;
        } else if (nearbyText.toLowerCase().includes(participant2.position.toLowerCase())) {
          winner = participant2;
          loser = participant1;
          break;
        }
      }
      
      if (winner) break;
    }
    
    // Set winner and loser if determined
    if (winner) {
      result.winner = winner;
      result.loser = loser;
    }
    
    return result;
  }
}

export default new JudgingSystem();
