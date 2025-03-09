import upgradeData from '../data/upgradeData';

class UpgradeManager {
  // Get upgrade choices based on level
  static getUpgradeChoices(level) {
    let tier;
    if (level <= 5) {
      tier = 'earlyGame';
    } else if (level <= 10) {
      tier = 'midGame';
    } else if (level <= 15) {
      tier = 'lateGame';
    } else {
      tier = 'endGame';
    }
    
    // Return a random selection of 3 upgrades from the appropriate tier
    const availableUpgrades = upgradeData[tier];
    const shuffled = [...availableUpgrades].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, Math.min(3, shuffled.length));
  }

  // Apply upgrade effects to a bloon
  static applyBloonUpgrades(bloon, modifiers) {
    if (!modifiers) return;

    Object.values(modifiers).forEach(modifier => {
      // Apply speed multiplier
      if (modifier.effect?.bloonSpeedMultiplier) {
        bloon.speed *= modifier.effect.bloonSpeedMultiplier;
      }
      
      // Apply auto-camo
      if (modifier.effect?.autoCamoDuration) {
        bloon.activateAbility('camo');
      }
    });
  }

  // Get modified cooldown for an ability
  static getModifiedCooldown(abilityName, baseCooldown, modifiers) {
    if (!modifiers) return baseCooldown;
    
    let modifiedCooldown = baseCooldown;
    
    Object.values(modifiers).forEach(modifier => {
      // Apply ability-specific cooldown reduction
      if (modifier.effect?.abilityModifier?.[abilityName]?.cooldownReduction) {
        modifiedCooldown -= modifier.effect.abilityModifier[abilityName].cooldownReduction;
      }
      
      // Apply global cooldown reduction
      if (modifier.effect?.abilityCooldownReduction) {
        modifiedCooldown *= (1 - modifier.effect.abilityCooldownReduction);
      }
    });
    
    return Math.max(500, modifiedCooldown); // Minimum 0.5s cooldown
  }

  // Get modified duration for an ability
  static getModifiedDuration(abilityName, baseDuration, modifiers) {
    if (!modifiers) return baseDuration;
    
    let modifiedDuration = baseDuration;
    
    Object.values(modifiers).forEach(modifier => {
      if (modifier.effect?.abilityModifier?.[abilityName]?.durationMultiplier) {
        modifiedDuration *= modifier.effect.abilityModifier[abilityName].durationMultiplier;
      }
    });
    
    return modifiedDuration;
  }

  // Check if ability fusion should happen
  static shouldTriggerAbilityFusion(modifiers) {
    if (!modifiers) return false;
    
    for (const modifier of Object.values(modifiers)) {
      if (modifier.effect?.abilityFusionChance && Math.random() < modifier.effect.abilityFusionChance) {
        return true;
      }
    }
    
    return false;
  }
}

export default UpgradeManager;