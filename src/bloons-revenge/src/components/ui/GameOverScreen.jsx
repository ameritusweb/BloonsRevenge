import React from 'react';

const GameOverScreen = ({ finalScore, levelsCompleted, bloonsRemaining, onRestart }) => {
  return (
    <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg text-center max-w-md">
        <h2 className="text-3xl font-bold mb-2 text-red-600">Game Over!</h2>
        <p className="text-gray-600 mb-6">You ran out of bloons to complete the level.</p>
        
        <div className="bg-gray-100 p-4 rounded-lg mb-6">
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-gray-500 text-sm">Final Score</p>
              <p className="text-3xl font-bold text-indigo-600">{finalScore}</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="text-left">
                <p className="text-gray-500 text-sm">Levels Completed</p>
                <p className="text-xl font-bold">{levelsCompleted}</p>
              </div>
              <div className="text-left">
                <p className="text-gray-500 text-sm">Remaining Bloons</p>
                <p className="text-xl font-bold">{bloonsRemaining}</p>
              </div>
            </div>
          </div>
        </div>
        
        <button 
          className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-3 rounded-lg text-lg font-bold transition-colors"
          onClick={onRestart}
        >
          Play Again
        </button>
      </div>
    </div>
  );
};

export default GameOverScreen;