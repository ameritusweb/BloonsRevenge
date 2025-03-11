// src/managers/LeaderboardManager.js

class LeaderboardManager {
    static STORAGE_KEY = 'bloonHighScores';
    static MAX_SCORES = 100; // Maximum number of scores to keep
  
    static getHighScores() {
      const scores = localStorage.getItem(this.STORAGE_KEY);
      return scores ? JSON.parse(scores) : [];
    }
  
    static addScore(name, score, level) {
        if (!name || !score) return null; // Add validation

      const scores = this.getHighScores();
      
      // Add new score with timestamp
    const newScore = {
        name: name.trim(),
        score: Number(score),
        level,
        date: new Date().toISOString()
      };
      
      scores.push(newScore);
  
      // Sort by score (highest first)
      scores.sort((a, b) => b.score - a.score);
  
       // Keep only top scores
        const topScores = scores.slice(0, this.MAX_SCORES);

        // Save back to localStorage
        try {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(topScores));
        console.log('Saved score:', newScore); // Debug log
        } catch (error) {
        console.error('Error saving score:', error);
        }

        // Return position in leaderboard (1-based)
        return scores.findIndex(s => 
        s.score === score && 
        s.name === name && 
        s.date === newScore.date
        ) + 1;
    }
  
    static clearScores() {
      localStorage.removeItem(this.STORAGE_KEY);
    }
  
    static isHighScore(score) {
      const scores = this.getHighScores();
      if (scores.length < this.MAX_SCORES) return true;
      return score > scores[scores.length - 1].score;
    }
  
    static getTopScores(limit = 10) {
      const scores = this.getHighScores();
      return scores.slice(0, limit);
    }
  }
  
  export default LeaderboardManager;