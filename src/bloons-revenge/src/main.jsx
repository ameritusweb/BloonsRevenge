import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { useState } from 'react'
import BloonsRevenge from './components/BloonsRevenge'
import LeaderboardManager from './managers/LeaderboardManager'
import './index.css'

document.title = 'Bloons Revenge';

function FloatingBloon({ delay }) {
  return (
    <div 
      className="absolute w-12 h-12 rounded-full bg-yellow-400 animate-float"
      style={{ 
        animationDelay: `${delay}s`,
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1), inset -3px -3px 6px rgba(0, 0, 0, 0.2)'
      }}
    >
      <div className="absolute bottom-1 right-1 w-3 h-3 bg-white rounded-full opacity-50"></div>
    </div>
  );
}

function GameWrapper() {
  const [gameState, setGameState] = useState({
    status: 'menu',
    playerName: ''
  });

  const [animatedText, setAnimatedText] = useState('');
  const fullText = "Survive the towers, lead your bloons to victory!";

  useEffect(() => {
    let index = 0;
    const interval = setInterval(() => {
      if (index <= fullText.length) {
        setAnimatedText(fullText.slice(0, index));
        index++;
      } else {
        clearInterval(interval);
      }
    }, 50);

    return () => clearInterval(interval);
  }, []);

  const handleStartGame = (playerName) => {
    setGameState({
      status: 'playing',
      playerName
    });
  };

  const handleReturnToMenu = () => {
    setGameState({
      status: 'menu',
      playerName: gameState.playerName
    });
  };

  // Generate random positions for floating bloons
  const [bloonPositions] = useState(() =>
    Array.from({ length: 8 }, (_, i) => ({
      top: `${Math.random() * 70 + 10}%`,
      left: `${Math.random() * 70 + 10}%`,
      delay: i * 1.5
    }))
  );

  return (
    <div className="w-full h-screen">
      {gameState.status === 'menu' ? (
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex items-center justify-center overflow-hidden">
          {/* Decorative floating bloons */}
          {bloonPositions.map((pos, i) => (
            <div key={i} style={{ 
              position: 'absolute',
              top: pos.top,
              left: pos.left,
            }}>
              <FloatingBloon delay={pos.delay} />
            </div>
          ))}

          {/* Main content */}
          <div className="relative max-w-md w-full p-8 bg-white/10 backdrop-blur-lg rounded-xl shadow-2xl border border-white/20">
            <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-yellow-400 rounded-full w-12 h-12 shadow-lg">
              <div className="absolute bottom-1 right-1 w-3 h-3 bg-white rounded-full opacity-50"></div>
            </div>

            <h1 className="text-5xl font-bold text-center mb-2 text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-red-400 to-purple-500">
              Bloons Revenge
            </h1>
            
            <p className="text-center mb-8 text-white/80 h-6">
              {animatedText}
            </p>

            <div className="space-y-6">
              <div className="group">
                <label className="block text-sm font-medium text-white/80 mb-2">
                  Enter Your Name
                </label>
                <input
                  type="text"
                  value={gameState.playerName}
                  onChange={(e) => setGameState(prev => ({ ...prev, playerName: e.target.value }))}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent text-white transition-all"
                  placeholder="Player Name"
                  maxLength={20}
                />
              </div>

              <button
                onClick={() => handleStartGame(gameState.playerName)}
                disabled={!gameState.playerName.trim()}
                className={`w-full py-3 rounded-lg font-bold text-lg transform transition-all duration-200 hover:scale-105 hover:-translate-y-1
                  ${gameState.playerName.trim() 
                    ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white shadow-lg hover:shadow-xl' 
                    : 'bg-gray-600 text-gray-400'}`}
              >
                Start Game
              </button>

              {/* Game Tips */}
              <div className="mt-8 p-4 bg-white/5 rounded-lg border border-white/10">
                <h3 className="text-white font-bold mb-2">Game Tips</h3>
                <ul className="text-sm text-white/70 space-y-1">
                  <li>• Bloons start yellow, turn red after first hit</li>
                  <li>• Use abilities to protect your bloons</li>
                  <li>• Fire trail creates safe zones</li>
                  <li>• Perfect clears grant special upgrades</li>
                </ul>
              </div>

              {/* High Scores */}
              <div className="mt-4">
                <h2 className="text-xl font-bold mb-4 text-center text-white">High Scores</h2>
                <div className="space-y-2">
                  {LeaderboardManager.getTopScores(5).map((score, index) => (
                    <div
                      key={index}
                      className="flex justify-between items-center p-3 bg-white/5 rounded-lg border border-white/10 backdrop-blur-sm"
                    >
                      <div className="flex items-center">
                        <span className="font-bold text-lg w-8 text-yellow-400">{index + 1}.</span>
                        <span className="font-medium text-white">{score.name}</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className="text-sm text-white/60">Level {score.level}</span>
                        <span className="font-bold text-yellow-400">{score.score}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <BloonsRevenge 
          playerName={gameState.playerName}
          onReturnToMenu={handleReturnToMenu}
        />
      )}
    </div>
  );
}

// Add floating animation to index.css
const style = document.createElement('style');
style.textContent = `
@keyframes float {
  0% {
    transform: translate(0, 0) rotate(0deg);
  }
  25% {
    transform: translate(-10px, -15px) rotate(-5deg);
  }
  50% {
    transform: translate(10px, -25px) rotate(5deg);
  }
  75% {
    transform: translate(-10px, -15px) rotate(-5deg);
  }
  100% {
    transform: translate(0, 0) rotate(0deg);
  }
}

.animate-float {
  animation: float 8s ease-in-out infinite;
}
`;
document.head.appendChild(style);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <GameWrapper />
  </StrictMode>,
);