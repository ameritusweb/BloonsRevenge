import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as BABYLON from '@babylonjs/core';

// Import game managers
import GameStateManager from '../managers/GameStateManager';
import UpgradeManager from '../managers/UpgradeManager';

// Import game classes and generators
import Bloon from '../game/Bloon';
import LevelGenerator from '../game/LevelGenerator';
import GameEvents from '../game/GameEvents';

// Import UI components
import StatusEffectsHUD from './ui/StatusEffectsHUD';
import UpgradeHistory from './ui/UpgradeHistory';
import UpgradeModal from './ui/UpgradeModal';
import PerfectClearAnimation from './ui/PerfectClearAnimation';
import LevelCompleteScreen from './ui/LevelCompleteScreen';
import GameOverScreen from './ui/GameOverScreen';
import AbilityBar from './ui/AbilityBar';

const abilities = [
    { name: 'shield', label: 'Shield', cooldown: 5000 },
    { name: 'speed', label: 'Speed Boost', cooldown: 3000 },
    { name: 'camo', label: 'Camo', cooldown: 6000 },
    { name: 'phase', label: 'Phase', cooldown: 8000 },
    { name: 'fire', label: 'Fire Trail', cooldown: 10000 },
    { name: 'mirror', label: 'Mirror', cooldown: 12000 },
    { name: 'rubber', label: 'Rubber', cooldown: 8000 },
    { name: 'split', label: 'Splitter', cooldown: 10000 }
  ];

const BloonsRevenge = () => {
  const canvasRef = useRef(null);
  const eventEmitterRef = useRef(new GameEvents());
  const levelGeneratorRef = useRef(null);
  const sceneRef = useRef(null);
  const activeLevel = useRef(null);
  const bloons = useRef([]);
  
  const abilityBarRef = useRef(null);
  const selectedAbilityRef = useRef('shield');
  
  // Initialize game state with GameStateManager
  const [gameState, setGameState] = useState(() => ({
    totalBloons: 25,
    score: 0,
    gameStatus: 'playing',
    currentLevel: 1,
    bloonsActive: 0,
    bloonsRequired: 3,
    bloonsEscaped: 0,
    bloonsDestroyed: 0,
    upgradeState: {
      activeUpgrades: [],
      tempModifiers: {},
      permanentModifiers: {}
    },
    statusEffects: {
      activeModifiers: {},
      notifications: []
    }
  }));

  // Reset level function
  const resetLevel = useCallback(() => {
    setGameState(prev => {
      const nextLevel = prev.currentLevel + 1;
      const newState = {
        ...prev,
        totalBloons: 25,
        currentLevel: nextLevel,
        bloonsEscaped: 0,
        bloonsActive: 0,
        bloonsDestroyed: 0,
        bloonsRequired: Math.min(Math.floor(2 + nextLevel * 1.5), 25),
        gameStatus: 'playing'
      };
      
      return newState;
    });
    
    // Clean up previous level
    if (activeLevel.current) {
      activeLevel.current.cleanup();
    }
    
    // Clean up existing bloons
    bloons.current.forEach(bloon => bloon.dispose());
    bloons.current = [];
  }, []);

  // Handle upgrade selection
  const handleUpgradeSelect = useCallback((upgrade) => {
    setGameState(prev => {
      const updatedState = GameStateManager.applyUpgrade(prev, upgrade);
      return {
        ...updatedState,
        gameStatus: 'levelComplete',
        upgradeChoices: null,
        statusEffects: {
          ...updatedState.statusEffects,
          notifications: [
            ...(updatedState.statusEffects.notifications || []),
            {
              id: Date.now(),
              message: `Activated: ${upgrade.name}`,
              timestamp: Date.now()
            }
          ]
        }
      };
    });
  }, []);

  // Handle restart game
  const handleRestart = useCallback(() => {
    setGameState({
      totalBloons: 25,
      score: 0,
      gameStatus: 'playing',
      currentLevel: 1,
      bloonsActive: 0,
      bloonsRequired: 3,
      bloonsEscaped: 0,
      bloonsDestroyed: 0,
      upgradeState: {
        activeUpgrades: [],
        tempModifiers: {},
        permanentModifiers: {}
      },
      statusEffects: {
        activeModifiers: {},
        notifications: []
      }
    });
    
    // Reset level
    if (sceneRef.current) {
      // Clean up previous level
      if (activeLevel.current) {
        activeLevel.current.cleanup();
      }
      
      // Clean up existing bloons
      bloons.current.forEach(bloon => bloon.dispose());
      bloons.current = [];
      
      // Create new level
      activeLevel.current = levelGeneratorRef.current.createLevel(sceneRef.current, { level: 1 });
    }
  }, []);

  const handleAbilitySelected = useCallback((abilityName) => {
    selectedAbilityRef.current = abilityName;
  }, []);

  // Add these handlers before the useEffect

const handleBloonDestroyed = useCallback((data) => {
  // Remove from active bloons
  bloons.current = bloons.current.filter(b => b !== data.bloon);

  // Update game state
  setGameState(prev => {
    // Check if we can still complete the level
    const remainingNeeded = prev.bloonsRequired - prev.bloonsEscaped;
    if (prev.totalBloons + prev.bloonsActive < remainingNeeded) {
      return {
        ...prev,
        bloonsActive: prev.bloonsActive - 1,
        score: prev.score + (prev.totalBloons * 50), // Bonus for remaining bloons
        gameStatus: 'gameOver'
      };
    }

    // Add notification for special cases
    if (data.wasClone) {
      return {
        ...prev,
        statusEffects: {
          ...prev.statusEffects,
          notifications: [
            ...(prev.statusEffects.notifications || []),
            {
              id: Date.now(),
              message: 'Clone destroyed!',
              timestamp: Date.now()
            }
          ]
        }
      };
    }

    return {
      ...prev,
      bloonsDestroyed: prev.bloonsDestroyed + 1,
      bloonsActive: prev.bloonsActive - 1
    };
  });
}, []);

const handleSpecialEffects = useCallback((eventType, data) => {
  switch(eventType) {
    case 'bloonMirrored':
      // Create mirror clones
      const angles = [Math.PI/4, -Math.PI/4];
      angles.forEach(angle => {
        const mirrorBloon = new Bloon(
          sceneRef.current,
          data.position.clone(),  // Clone the position
          eventEmitterRef.current,
          data.pathPoints,        // Use the original bloon's path points
          { isClone: true }
        );
        
        // IMPORTANT: Set pathIndex before adding offset
        mirrorBloon.pathIndex = data.pathIndex;
        
        // Calculate offset perpendicular to path
        const currentPoint = mirrorBloon.pathPoints[mirrorBloon.pathIndex];
        const nextPoint = mirrorBloon.pathPoints[Math.min(mirrorBloon.pathIndex + 1, mirrorBloon.pathPoints.length - 1)];
        
        const pathDirection = nextPoint.subtract(currentPoint);
        pathDirection.normalize();
        
        const perpDirection = new BABYLON.Vector3(
          -pathDirection.z,
          0,
          pathDirection.x
        );
        
        mirrorBloon.mesh.position.addInPlace(perpDirection.scale(angle === Math.PI/4 ? 0.5 : -0.5));
        bloons.current.push(mirrorBloon);
      });
      break;

    case 'bloonSplit':
      // Create split bloons
      for (let i = 0; i < 2; i++) {
        const splitBloon = new Bloon(
          sceneRef.current,
          data.position.clone(),  // Clone the position
          eventEmitterRef.current,
          data.pathPoints,        // Use the original bloon's path points
          { 
            isClone: true,
            scale: 0.6 
          }
        );
        
        // IMPORTANT: Set pathIndex before adding offset
        splitBloon.pathIndex = data.pathIndex;
        
        // Calculate offset perpendicular to path
        const currentPoint = splitBloon.pathPoints[splitBloon.pathIndex];
        const nextPoint = splitBloon.pathPoints[Math.min(splitBloon.pathIndex + 1, splitBloon.pathPoints.length - 1)];
        
        const pathDirection = nextPoint.subtract(currentPoint);
        pathDirection.normalize();
        
        const perpDirection = new BABYLON.Vector3(
          -pathDirection.z,
          0,
          pathDirection.x
        );
        
        splitBloon.mesh.position.addInPlace(perpDirection.scale(i === 0 ? 0.5 : -0.5));
        splitBloon.speed *= 1.2; // Make split bloons slightly faster
        bloons.current.push(splitBloon);
      }

      setGameState(prev => ({
        ...prev,
        bloonsActive: prev.bloonsActive + 2
      }));
      break;

    case 'bloonShieldBroken':
    case 'bloonBounced':
    case 'bloonPhased':
      // Add notification for special events
      setGameState(prev => ({
        ...prev,
        statusEffects: {
          ...prev.statusEffects,
          notifications: [
            ...(prev.statusEffects.notifications || []),
            {
              id: Date.now(),
              message: `${eventType.replace('bloon', '')}!`,
              timestamp: Date.now()
            }
          ]
        }
      }));
      break;
  }
}, []);

  // Babylon.js game setup
  useEffect(() => {
    if (!canvasRef.current) return;

    const eventEmitter = eventEmitterRef.current;

        // Handle bloon escape
        const handleBloonEscape = (data) => {
          const bloon = data.bloon;
          // Remove from active bloons
          bloons.current = bloons.current.filter(b => b !== bloon);
          
           // Update game state
      setGameState(prev => {
        const newBloonsEscaped = prev.bloonsEscaped + 1;
        
        // If we've reached the required number of bloons
        if (newBloonsEscaped >= prev.bloonsRequired) {
          // Emit level complete event
          eventEmitterRef.current.emit('levelComplete', {
            bloonsEscaped: newBloonsEscaped,
            bloonsRequired: prev.bloonsRequired,
            bloonsDestroyed: prev.bloonsDestroyed
          });
        }
        
        // Check game over
        if (prev.totalBloons + prev.bloonsActive < prev.bloonsRequired - newBloonsEscaped) {
          return {
            ...prev,
            bloonsEscaped: newBloonsEscaped,
            bloonsActive: prev.bloonsActive - 1,
            score: prev.score + (prev.totalBloons * 50), // Bonus for remaining bloons
            gameStatus: 'gameOver'
          };
        }
        
        return {
          ...prev,
          bloonsEscaped: newBloonsEscaped,
          bloonsActive: prev.bloonsActive - 1
        };
      });
    
          // Create explosion effect for bloon detonation upgrade
          const hasDetonation = gameState.upgradeState?.permanentModifiers?.bloonDetonation;
          if (hasDetonation) {
            const radius = hasDetonation.effect.escapeExplosion.radius || 4;
            const disableDuration = hasDetonation.effect.escapeExplosion.disableDuration || 3;
            
            // Create explosion visual effect
            const explosion = BABYLON.MeshBuilder.CreateSphere(
              "explosion",
              { diameter: 1 },
              scene
            );
            explosion.position = bloon.mesh.position.clone();
            explosion.position.y = 0.5;
            
            const explosionMaterial = new BABYLON.StandardMaterial("explosionMat", scene);
            explosionMaterial.diffuseColor = new BABYLON.Color3(1, 0.5, 0);
            explosionMaterial.emissiveColor = new BABYLON.Color3(1, 0.3, 0);
            explosion.material = explosionMaterial;
            
            // Animate explosion
            const frameRate = 30;
            const explosionAnimation = new BABYLON.Animation(
              "explosionAnim",
              "scaling", 
              frameRate, 
              BABYLON.Animation.ANIMATIONTYPE_VECTOR3, 
              BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
            );
            
            const explosionKeyframes = [];
            explosionKeyframes.push({
              frame: 0,
              value: new BABYLON.Vector3(0.1, 0.1, 0.1)
            });
            explosionKeyframes.push({
              frame: 10,
              value: new BABYLON.Vector3(radius, radius, radius)
            });
            explosionKeyframes.push({
              frame: frameRate,
              value: new BABYLON.Vector3(radius, radius, radius)
            });
            
            explosionAnimation.setKeys(explosionKeyframes);
            
            // Animate material alpha
            const alphaAnimation = new BABYLON.Animation(
              "alphaAnim",
              "material.alpha", 
              frameRate, 
              BABYLON.Animation.ANIMATIONTYPE_FLOAT, 
              BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
            );
            
            const alphaKeyframes = [];
            alphaKeyframes.push({
              frame: 0,
              value: 0.8
            });
            alphaKeyframes.push({
              frame: 10,
              value: 0.6
            });
            alphaKeyframes.push({
              frame: frameRate,
              value: 0
            });
            
            alphaAnimation.setKeys(alphaKeyframes);
            
            explosion.animations = [explosionAnimation, alphaAnimation];
            
            // Play animation
            scene.beginAnimation(explosion, 0, frameRate, false, 1, () => {
              explosion.dispose();
            });
            
            // Disable towers in range
            activeLevel.current.towers.forEach(tower => {
              const distance = BABYLON.Vector3.Distance(
                tower.base.position, 
                bloon.mesh.position
              );
              
              if (distance <= radius) {
                tower.disableTower(disableDuration * 1000);
              }
            });
          }
    
          bloon.escape();
          
          // Dispose bloon
          bloon.dispose();
          
          // Update game state
          setGameState(prev => {
            const newBloonsEscaped = prev.bloonsEscaped;

            // Check game over
            if (prev.totalBloons + prev.bloonsActive < prev.bloonsRequired - newBloonsEscaped) {
              return {
                ...prev,
                score: prev.score + (prev.totalBloons * 50), // Bonus for remaining bloons
                gameStatus: 'gameOver'
              };
            }
            
            // Continue playing
            return {
              ...prev
            };
          });
        };

    // Setup event listeners
    eventEmitter.on('bloonDestroyed', handleBloonDestroyed);
    eventEmitter.on('bloonEscaped', handleBloonEscape);
    
    // Special effect handlers
    eventEmitter.on('bloonMirrored', (data) => handleSpecialEffects('bloonMirrored', data));
    eventEmitter.on('bloonSplit', (data) => handleSpecialEffects('bloonSplit', data));
    eventEmitter.on('bloonShieldBroken', (data) => handleSpecialEffects('bloonShieldBroken', data));
    eventEmitter.on('bloonBounced', (data) => handleSpecialEffects('bloonBounced', data));
    eventEmitter.on('bloonPhased', (data) => handleSpecialEffects('bloonPhased', data));

    eventEmitter.on('levelComplete', (data) => {
      const isPerfect = data.bloonsEscaped === data.bloonsRequired && data.bloonsDestroyed === 0;
      
      setGameState(prev => {
        if (isPerfect) {
          return {
            ...prev,
            gameStatus: 'perfectClear',
            score: prev.score + (prev.currentLevel * 100),
            upgradeChoices: UpgradeManager.getUpgradeChoices(prev.currentLevel)
          };
        } else {
          return {
            ...prev,
            gameStatus: 'levelComplete',
            score: prev.score + (prev.currentLevel * 100)
          };
        }
      });
    });

    // Initialize Babylon.js engine and scene
    const engine = new BABYLON.Engine(canvasRef.current, true);
    const scene = new BABYLON.Scene(engine);
    sceneRef.current = scene;

    levelGeneratorRef.current = new LevelGenerator(scene, eventEmitter);
    
    // Camera setup
    const camera = new BABYLON.ArcRotateCamera(
      "camera",
      0,
      Math.PI / 3,
      25,
      BABYLON.Vector3.Zero(),
      scene
    );
    camera.attachControl(canvasRef.current, true);
    camera.lowerRadiusLimit = 10;
    camera.upperRadiusLimit = 30;

    // Lighting
    const light = new BABYLON.HemisphericLight(
      "light",
      new BABYLON.Vector3(0, 1, 0),
      scene
    );

    // Create first level
    activeLevel.current = levelGeneratorRef.current.createLevel(scene, {
      level: gameState.currentLevel
    });
    
    // Variables for game loop
    let lastSpawnTime = 0;
    const spawnInterval = 2000;
    
    // Spawn bloon function
    const spawnBloon = () => {
      // Check if we have enough bloons to spawn
      if (gameState.totalBloons <= 0) return;
      
      // Get start position from level path
      const startPosition = activeLevel.current.pathPoints[0].clone();
      
      // Create bloon
      const bloon = new Bloon(
        scene,
        startPosition,
        eventEmitterRef.current, 
        activeLevel.current.pathPoints,
        GameStateManager.getAllModifiers(gameState)
      );
      
      // Apply theme modifiers
      if (activeLevel.current.themeModifiers) {
        bloon.speed *= activeLevel.current.themeModifiers.bloonSpeedMultiplier;
      }
      
      // Register click handler for abilities
      bloon.mesh.actionManager = new BABYLON.ActionManager(scene);
      bloon.mesh.actionManager.registerAction(
        new BABYLON.ExecuteCodeAction(
          BABYLON.ActionManager.OnPickTrigger,
          (evt) => {

            const wasEnabled = camera.inputs.attached.pointers.detachControl();
            evt.skipNextObservers = true;

            setTimeout(() => {
                if (wasEnabled) {
                  camera.inputs.attachInput(camera.inputs.attached.pointers);
                }
              }, 100);

            const currentAbility = selectedAbilityRef.current;
            if (!bloon.abilities[currentAbility]) {
                // Apply the ability
                bloon.activateAbility(currentAbility, GameStateManager.getAllModifiers(gameState));
                
                // Trigger cooldown via the ref
                if (abilityBarRef.current) {
                    abilityBarRef.current.triggerCooldown(currentAbility);
                }
              
              // Check for ability fusion effect from upgrades
              if (UpgradeManager.shouldTriggerAbilityFusion(allModifiers)) {
                // Request available abilities from the AbilityBar component
                if (abilityBarRef.current) {
                  const availableAbilities = abilityBarRef.current.getAvailableAbilities(currentAbility);
                  
                  if (availableAbilities.length > 0) {
                    // Select random additional ability
                    const randomAbility = availableAbilities[
                      Math.floor(Math.random() * availableAbilities.length)
                    ];
                    
                    // Activate the second ability
                    bloon.activateAbility(randomAbility, allModifiers);
                    
                    // Add notification
                    setGameState(prev => ({
                      ...prev,
                      statusEffects: {
                        ...prev.statusEffects,
                        notifications: [
                          ...(prev.statusEffects.notifications || []),
                          {
                            id: Date.now(),
                            message: `Fusion Activated: ${randomAbility}!`,
                            timestamp: Date.now()
                          }
                        ]
                      }
                    }));
                }
              }
            }
          }
          }
      ));
      
      // Add to bloons array
      bloons.current.push(bloon);
      
      // Reduce total bloons count
      setGameState(prev => ({
        ...prev,
        totalBloons: prev.totalBloons - 1,
        bloonsActive: prev.bloonsActive + 1
      }));
    };
    
    // Main render loop
    scene.registerBeforeRender(() => {
      const currentTime = Date.now();
      
      // Spawn bloons if playing
      if (gameState.gameStatus === 'playing') {
        if (currentTime - lastSpawnTime > spawnInterval) {
          spawnBloon();
          lastSpawnTime = currentTime;
        }
      }
      
      // Update bloons
      bloons.current.forEach(bloon => {
        bloon.update();
        
        // Check if bloon reached the end
        if (bloon.pathIndex >= activeLevel.current.pathPoints.length - 1) {
          bloon.escape();
        }
      });
      
      // Update towers
        if (gameState.gameStatus === 'playing' && activeLevel.current && activeLevel.current.towers) {
            activeLevel.current.towers.forEach(tower => {
            // Pass the bloons array to each tower
            tower.update(bloons.current, currentTime);
            });
        }

      // Update level theme effects
      if (activeLevel.current?.themeModifiers?.update) {
        activeLevel.current.themeModifiers.update(scene, engine.getDeltaTime(), currentTime);
      }
      
      if (gameState.gameStatus === 'playing') {
        // Clean up old notifications
        if (gameState.statusEffects?.notifications?.length > 0) {
          const expirationTime = 5000; // 5 seconds for notification lifetime
          setGameState(prev => ({
            ...prev,
            statusEffects: {
              ...prev.statusEffects,
              notifications: prev.statusEffects.notifications.filter(
                notification => currentTime - notification.timestamp < expirationTime
              )
            }
          }));
        }
      }
    });
    
    // Run render loop
    engine.runRenderLoop(() => {
      scene.render();
    });
    
    // Handle window resize
    const handleResize = () => {
      engine.resize();
    };
    
    window.addEventListener('resize', handleResize);
    
    // Cleanup
    return () => {
      eventEmitter.off('bloonDestroyed', handleBloonDestroyed);
      eventEmitter.off('bloonEscaped', handleBloonEscape);
      eventEmitter.off('bloonMirrored');
      eventEmitter.off('bloonSplit');
      eventEmitter.off('bloonShieldBroken');
      eventEmitter.off('bloonBounced');
      eventEmitter.off('bloonPhased');
      eventEmitter.off('levelComplete');
      
      window.removeEventListener('resize', handleResize);
      engine.dispose();
      
      if (activeLevel.current) {
        activeLevel.current.cleanup();
      }
      
      bloons.current.forEach(bloon => bloon.dispose());
    };
  }, [
    gameState.currentLevel,
    gameState.gameStatus
  ]);

  return (
    <div className="w-full h-screen relative">
      <canvas ref={canvasRef} className="w-full h-full" />
      
      {/* Game Stats HUD */}
      <div className="absolute top-4 left-4 bg-black bg-opacity-50 text-white p-4 rounded">
        <div className="mb-2 text-xl font-bold">Level {gameState.currentLevel}</div>
        <div className="mb-2">Bloons Left: {gameState.totalBloons + gameState.bloonsActive}</div>
        <div className="mb-2">Escaped: {gameState.bloonsEscaped} / {gameState.bloonsRequired}</div>
        <div>Score: {gameState.score}</div>
        {activeLevel.current?.theme && (
          <div className="mt-2 text-xs">
            Theme: {activeLevel.current.theme}
          </div>
        )}
      </div>

      {/* Status Effects HUD - Shows active modifiers from upgrades */}
      {gameState.statusEffects && (
        <StatusEffectsHUD
          activeModifiers={gameState.statusEffects.activeModifiers || {}}
          notifications={gameState.statusEffects.notifications || []}
        />
      )}

      {/* Upgrade History Button and Panel */}
      {gameState.upgradeState && (
        <UpgradeHistory
          upgrades={gameState.upgradeState.activeUpgrades || []}
        />
      )}

      {/* Perfect Clear Animation and Upgrade Selection */}
      {gameState.gameStatus === 'perfectClear' && (
        <PerfectClearAnimation
          onComplete={() => {
            // Show upgrade selection after animation completes
            setGameState(prev => ({
              ...prev,
              gameStatus: 'selectingUpgrade'
            }));
          }}
        />
      )}
      
      {/* Upgrade Selection Modal */}
      {gameState.gameStatus === 'selectingUpgrade' && gameState.upgradeChoices && (
        <UpgradeModal
          upgrades={gameState.upgradeChoices}
          onSelect={handleUpgradeSelect}
          level={gameState.currentLevel}
        />
      )}

      {/* Level Complete Overlay */}
      {gameState.gameStatus === 'levelComplete' && (
        <LevelCompleteScreen
          level={gameState.currentLevel}
          bloonsRemaining={gameState.totalBloons + gameState.bloonsActive}
          score={gameState.score}
          onContinue={resetLevel}
        />
      )}

      {/* Game Over Overlay */}
      {gameState.gameStatus === 'gameOver' && (
        <GameOverScreen
          finalScore={gameState.score}
          levelsCompleted={gameState.currentLevel}
          bloonsRemaining={gameState.totalBloons + gameState.bloonsActive}
          onRestart={handleRestart}
        />
      )}

        <AbilityBar
        ref={abilityBarRef}
        abilities={abilities}
        isPlaying={gameState.gameStatus === 'playing'}
        modifiers={GameStateManager.getAllModifiers(gameState)}
        onSelectAbility={handleAbilitySelected}
        />
    </div>
  );
};

export default BloonsRevenge;