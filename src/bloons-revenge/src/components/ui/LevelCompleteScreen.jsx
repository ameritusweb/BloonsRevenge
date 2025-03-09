import React from 'react';

const LevelCompleteScreen = ({ level, bloonsRemaining, score, onContinue }) => {
  return (
    <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg text-center max-w-md">
        <h2 className="text-3xl font-bold mb-4 text-green-600">Level {level} Complete!</h2>
        
        <div className="bg-gray-100 p-4 rounded-lg mb-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-left">
              <p className="text-gray-500 text-sm">Bloons Remaining</p>
              <p className="text-xl font-bold">{bloonsRemaining}</p>
            </div>
            <div className="text-left">
              <p className="text-gray-500 text-sm">Current Score</p>
              <p className="text-xl font-bold">{score}</p>
            </div>
          </div>
        </div>
        
        <button 
          className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-3 rounded-lg text-lg font-bold transition-colors"
          onClick={onContinue}
        >
          Next Level
        </button>
      </div>
    </div>
  );
};

export default LevelCompleteScreen;