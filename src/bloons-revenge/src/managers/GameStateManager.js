import UpgradeManager from './UpgradeManager';

class GameStateManager {
  // Initialize a new level's state
  static initializeLevel(level) {
    return {
      levelStats: {
        currentLevel: level,
        bloonsRequired: Math.min(Math.floor(2 + level * 1.5), 25), // Cap at 25
        bloonsEscaped: 0,
        levelTowers: Math.min(3 + Math.floor(level * 0.5), 10), // Cap at 10 towers
        isPerfectClear: false,
      },
      upgradeState: {
        activeUpgrades: [], // All upgrades that have been selected
        tempModifiers: {}, // Current temporary modifiers
        permanentModifiers: {} // Permanent modifiers
      },
      statusEffects: {
        activeModifiers: {}, // Visible active effects (both temp and permanent)
        notifications: []
      }
    };
  }

  // Get upgrade choices based on level
  static getUpgradeChoices(level) {
    return UpgradeManager.getUpgradeChoices(level);
  }

  // Apply selected upgrade to game state
  static applyUpgrade(gameState, upgrade) {
    const newState = { ...gameState };
    
    // Add to active upgrades list for history
    newState.upgradeState.activeUpgrades = [
      ...newState.upgradeState.activeUpgrades || [],
      upgrade
    ];
    
    // Apply upgrade effects based on type
    if (upgrade.type === 'permanent') {
      newState.upgradeState.permanentModifiers = {
        ...newState.upgradeState.permanentModifiers || {},
        [upgrade.id]: upgrade
      };
    } else if (upgrade.type === 'temporary') {
      newState.upgradeState.tempModifiers = {
        ...newState.upgradeState.tempModifiers || {},
        [upgrade.id]: {
          ...upgrade,
          remainingDuration: upgrade.duration
        }
      };
    }
    
    // Update status effects to show active modifiers
    this.updateStatusEffects(newState);
    
    // Apply immediate effects to game state if needed
    if (upgrade.effect.additionalBloons) {
      newState.totalBloons += upgrade.effect.additionalBloons;
    }
    
    return newState;
  }

  // Update status effects based on current modifiers
  static updateStatusEffects(gameState) {
    const activeModifiers = {};
    
    // Add all permanent modifiers
    Object.entries(gameState.upgradeState?.permanentModifiers || {}).forEach(([id, modifier]) => {
      activeModifiers[id] = {
        id,
        name: modifier.name,
        icon: modifier.icon,
        isPermanent: true
      };
    });
    
    // Add all temporary modifiers with remaining duration
    Object.entries(gameState.upgradeState?.tempModifiers || {}).forEach(([id, modifier]) => {
      if (modifier.remainingDuration > 0) {
        activeModifiers[id] = {
          id,
          name: modifier.name,
          icon: modifier.icon,
          duration: modifier.remainingDuration,
          isPermanent: false
        };
      }
    });
    
    gameState.statusEffects = {
      ...gameState.statusEffects,
      activeModifiers
    };
    
    return gameState;
  }

  // Update game state - handle modifier durations, etc.
  static updateGameState(gameState) {
    // This would normally be called on level completion
    if (gameState.gameStatus !== 'playing') return gameState;
    
    const newState = { ...gameState };
    
    // Check for temporary modifiers that need updating
    const updatedTempModifiers = {};
    
    Object.entries(newState.upgradeState?.tempModifiers || {}).forEach(([id, modifier]) => {
      if (modifier.remainingDuration > 0) {
        updatedTempModifiers[id] = {
          ...modifier,
          // This would normally decrement on level completion
          // Not on each frame update
        };
      }
    });
    
    newState.upgradeState = {
      ...newState.upgradeState,
      tempModifiers: updatedTempModifiers
    };
    
    // Update status effects
    this.updateStatusEffects(newState);
    
    // Clean up old notifications
    const currentTime = Date.now();
    newState.statusEffects.notifications = (newState.statusEffects.notifications || []).filter(
      notification => currentTime - notification.timestamp < 5000
    );
    
    return newState;
  }

  // Check for perfect clear and handle level completion
  static handleLevelCompletion(gameState) {
    const newState = { ...gameState };
    const { bloonsRequired, bloonsEscaped } = newState;
    
    // Calculate perfect clear (exactly required bloons escaped, no extras)
    const isPerfectClear = bloonsEscaped === bloonsRequired;
    
    newState.currentLevel += 1;
    newState.score += newState.currentLevel * 100;
    
    // Decrement temporary modifier durations
    const updatedTempModifiers = {};
    
    Object.entries(newState.upgradeState?.tempModifiers || {}).forEach(([id, modifier]) => {
      if (modifier.remainingDuration > 1) {
        updatedTempModifiers[id] = {
          ...modifier,
          remainingDuration: modifier.remainingDuration - 1
        };
      }
    });
    
    newState.upgradeState = {
      ...newState.upgradeState,
      tempModifiers: updatedTempModifiers
    };
    
    // Update status effects
    this.updateStatusEffects(newState);
    
    if (isPerfectClear) {
      newState.gameStatus = 'perfectClear';
      // Add a bonus score for perfect clear
      newState.score += 200;
      
      // Add a notification
      newState.statusEffects.notifications = [
        ...(newState.statusEffects.notifications || []),
        {
          id: Date.now(),
          message: 'Perfect clear! +200 score bonus',
          timestamp: Date.now()
        }
      ];
    } else {
      newState.gameStatus = 'levelComplete';
    }
    
    return newState;
  }

  // Get all active modifiers (both permanent and temporary)
  static getAllModifiers(gameState) {
    if (!gameState.upgradeState) return {};
    
    return {
      ...gameState.upgradeState.permanentModifiers || {},
      ...gameState.upgradeState.tempModifiers || {}
    };
  }
}

export default GameStateManager;