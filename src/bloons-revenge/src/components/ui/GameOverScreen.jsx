import React, { useState, useEffect } from 'react';
import LeaderboardManager from '../../managers/LeaderboardManager';

const GameOverScreen = ({ 
  finalScore, 
  levelsCompleted, 
  bloonsRemaining, 
  playerName,
  onRestart, 
  onReturnToMenu 
}) => {
  const [leaderboardRank, setLeaderboardRank] = useState(null);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [topScores, setTopScores] = useState([]);

  useEffect(() => {
    // Add score to leaderboard
    const rank = LeaderboardManager.addScore(playerName, finalScore, levelsCompleted);
    setLeaderboardRank(rank);
    setTopScores(LeaderboardManager.getTopScores());
  }, [finalScore, levelsCompleted, playerName]);

  return (
    <div className="absolute inset-0 bg-black bg-opacity-80 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg text-center max-w-md w-full">
        <h2 className="text-3xl font-bold mb-2 text-red-600">Game Over!</h2>
        
        {!showLeaderboard ? (
          <>
            <div className="bg-gray-100 p-6 rounded-lg mb-6">
              <div className="mb-4">
                <p className="text-gray-500 text-sm">Final Score</p>
                <p className="text-4xl font-bold text-blue-600">{finalScore}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-500 text-sm">Levels Completed</p>
                  <p className="text-xl font-bold">{levelsCompleted}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-sm">Bloons Left</p>
                  <p className="text-xl font-bold">{bloonsRemaining}</p>
                </div>
              </div>

              {leaderboardRank && leaderboardRank <= 10 && (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-blue-600 font-bold">
                    New High Score! Rank #{leaderboardRank}
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <button 
                className="w-full bg-blue-500 hover:bg-blue-600 text-white px-8 py-3 rounded-lg text-lg font-bold transition-colors"
                onClick={onRestart}
              >
                Play Again
              </button>

              <button 
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 px-8 py-3 rounded-lg text-lg font-bold transition-colors"
                onClick={() => setShowLeaderboard(true)}
              >
                View Leaderboard
              </button>

              <button 
                className="w-full border-2 border-gray-300 hover:bg-gray-50 text-gray-600 px-8 py-3 rounded-lg text-lg font-bold transition-colors"
                onClick={onReturnToMenu}
              >
                Return to Menu
              </button>
            </div>
          </>
        ) : (
          <div>
            <h3 className="text-2xl font-bold mb-4">Top Scores</h3>
            <div className="space-y-2 mb-6">
              {topScores.map((score, index) => (
                <div 
                  key={index}
                  className={`flex justify-between items-center p-3 rounded
                    ${score.name === playerName && score.score === finalScore 
                      ? 'bg-blue-50 border-2 border-blue-200' 
                      : 'bg-gray-50'}`}
                >
                  <div className="flex items-center">
                    <span className="font-bold text-lg w-8">{index + 1}.</span>
                    <span className="font-medium">{score.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-blue-600">{score.score}</span>
                    <span className="text-sm text-gray-500 ml-2">Level {score.level}</span>
                  </div>
                </div>
              ))}
            </div>
            <button
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 px-8 py-3 rounded-lg text-lg font-bold transition-colors"
              onClick={() => setShowLeaderboard(false)}
            >
              Back to Results
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default GameOverScreen;