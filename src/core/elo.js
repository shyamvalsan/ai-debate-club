import { getEloRatings, saveEloRatings } from './storage.js';

// Default ELO starting rating
const DEFAULT_RATING = 1500;

// K-factor determines how much ratings change after each match
const K_FACTOR = 32;

export class EloSystem {
  constructor() {
    this.ratings = {};
  }
  
  async initialize() {
    this.ratings = await getEloRatings();
    return this;
  }
  
  async updateRatings(winnerId, loserId) {
    // Ensure models have ratings
    if (!this.ratings[winnerId]) {
      this.ratings[winnerId] = DEFAULT_RATING;
    }
    
    if (!this.ratings[loserId]) {
      this.ratings[loserId] = DEFAULT_RATING;
    }
    
    // Calculate expected scores
    const winnerRating = this.ratings[winnerId];
    const loserRating = this.ratings[loserId];
    
    const expectedWinnerScore = this._getExpectedScore(winnerRating, loserRating);
    const expectedLoserScore = this._getExpectedScore(loserRating, winnerRating);
    
    // Update ratings based on actual outcome (1 for win, 0 for loss)
    this.ratings[winnerId] = Math.round(winnerRating + K_FACTOR * (1 - expectedWinnerScore));
    this.ratings[loserId] = Math.round(loserRating + K_FACTOR * (0 - expectedLoserScore));
    
    // Save updated ratings
    await saveEloRatings(this.ratings);
    
    return {
      winner: {
        id: winnerId,
        oldRating: winnerRating,
        newRating: this.ratings[winnerId],
        change: this.ratings[winnerId] - winnerRating
      },
      loser: {
        id: loserId,
        oldRating: loserRating,
        newRating: this.ratings[loserId],
        change: this.ratings[loserId] - loserRating
      }
    };
  }
  
  async updateRatingsWithDraw(modelId1, modelId2) {
    // Ensure models have ratings
    if (!this.ratings[modelId1]) {
      this.ratings[modelId1] = DEFAULT_RATING;
    }
    
    if (!this.ratings[modelId2]) {
      this.ratings[modelId2] = DEFAULT_RATING;
    }
    
    // Calculate expected scores
    const rating1 = this.ratings[modelId1];
    const rating2 = this.ratings[modelId2];
    
    const expectedScore1 = this._getExpectedScore(rating1, rating2);
    const expectedScore2 = this._getExpectedScore(rating2, rating1);
    
    // Update ratings based on draw outcome (0.5 for draw)
    this.ratings[modelId1] = Math.round(rating1 + K_FACTOR * (0.5 - expectedScore1));
    this.ratings[modelId2] = Math.round(rating2 + K_FACTOR * (0.5 - expectedScore2));
    
    // Save updated ratings
    await saveEloRatings(this.ratings);
    
    return {
      model1: {
        id: modelId1,
        oldRating: rating1,
        newRating: this.ratings[modelId1],
        change: this.ratings[modelId1] - rating1
      },
      model2: {
        id: modelId2,
        oldRating: rating2,
        newRating: this.ratings[modelId2],
        change: this.ratings[modelId2] - rating2
      }
    };
  }
  
  _getExpectedScore(rating1, rating2) {
    return 1 / (1 + Math.pow(10, (rating2 - rating1) / 400));
  }
  
  async getRankings() {
    return Object.entries(this.ratings)
      .map(([id, rating]) => ({ id, rating }))
      .sort((a, b) => b.rating - a.rating);
  }
}

export default new EloSystem();
