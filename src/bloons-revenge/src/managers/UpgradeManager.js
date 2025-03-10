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

    // Handle temporary modifiers
    if (modifiers.tempModifiers) {
      Object.values(modifiers.tempModifiers).forEach(modifier => {
        // Speed multiplier
        if (modifier.effect?.bloonSpeedMultiplier) {
          bloon.speed *= modifier.effect.bloonSpeedMultiplier;
        }
        
        // Auto-camo
        if (modifier.effect?.autoCamoDuration) {
          bloon.activateAbility('camo');
        }

        // Start with shield
        if (modifier.effect?.startWithShield) {
          bloon.abilities.shield = true;
          bloon.material.diffuseColor = new BABYLON.Color3(0, 1, 1);
        }
      });
    }

    // Handle permanent modifiers
    if (modifiers.permanentModifiers) {
      Object.values(modifiers.permanentModifiers).forEach(modifier => {
        // Death explosion
        if (modifier.id === 'bloonDetonation') {
          bloon.deathExplosion = true;
          bloon.deathExplosionRadius = modifier.effect?.explosionRadius || 3;
          bloon.deathExplosionDisableDuration = modifier.effect?.disableDuration || 2000;
        }

        // Permanent invisibility
        if (modifier.effect?.permanentInvisibility) {
          bloon.abilities.camo = true;
          bloon.material.alpha = 0.3;
        }

        // Ghost mode (untargetable while phased)
        if (modifier.id === 'ghostMode') {
          bloon.ghostMode = true;
        }

        // Apply any ability-specific modifiers
        if (modifier.effect?.abilityModifier) {
          Object.entries(modifier.effect.abilityModifier).forEach(([ability, mods]) => {
            // Store ability modifiers for later use
            if (!bloon.abilityModifiers) bloon.abilityModifiers = {};
            if (!bloon.abilityModifiers[ability]) bloon.abilityModifiers[ability] = {};
            
            Object.assign(bloon.abilityModifiers[ability], mods);
          });
        }
      });
    }

    // Store the original modifiers for reference
    bloon.modifiers = modifiers;
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