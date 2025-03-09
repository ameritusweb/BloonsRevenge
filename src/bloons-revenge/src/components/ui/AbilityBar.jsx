import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import UpgradeManager from '../../managers/UpgradeManager';

const AbilityBar = forwardRef(({ 
    abilities, 
    isPlaying, 
    modifiers, 
    onSelectAbility 
  }, ref) => {
  // Local state for cooldowns
  const [abilityCooldowns, setAbilityCooldowns] = useState({
    shield: 0,
    speed: 0,
    camo: 0,
    split: 0,
    rubber: 0,
    phase: 0,
    fire: 0,
    mirror: 0
  });
  
  // Local state for selected ability
  const [selectedAbility, setSelectedAbility] = useState('shield');
  
  // Cooldown timer effect
  useEffect(() => {
    if (!isPlaying) return;
    
    const cooldownInterval = setInterval(() => {
      setAbilityCooldowns(prev => {
        const newCooldowns = { ...prev };
        let updated = false;
        
        Object.keys(newCooldowns).forEach(ability => {
          if (newCooldowns[ability] > 0) {
            newCooldowns[ability] = Math.max(0, newCooldowns[ability] - 16.67); // 60fps
            updated = true;
          }
        });
        
        return updated ? newCooldowns : prev;
      });
    }, 16.67); // ~60fps
    
    return () => clearInterval(cooldownInterval);
  }, [isPlaying]);
  
  // Handle ability selection
  const handleSelectAbility = (ability) => {
    setSelectedAbility(ability);
    onSelectAbility(ability);
  };
  
  // Trigger ability cooldown
  const triggerCooldown = (abilityName) => {
    const ability = abilities.find(a => a.name === abilityName);
    if (!ability) return;
    
    // Get base cooldown
    let cooldown = ability.cooldown;
    
    // Apply modifiers
    if (modifiers) {
      cooldown = UpgradeManager.getModifiedCooldown(abilityName, cooldown, modifiers);
    }
    
    setAbilityCooldowns(prev => ({
      ...prev,
      [abilityName]: cooldown
    }));
  };

  useImperativeHandle(ref, () => ({
    triggerCooldown: (abilityName) => {
      const ability = abilities.find(a => a.name === abilityName);
      if (!ability) return;
      
      // Apply cooldown
      let cooldown = ability.cooldown;
      if (modifiers) {
        cooldown = UpgradeManager.getModifiedCooldown(abilityName, cooldown, modifiers);
      }
      
      setAbilityCooldowns(prev => ({
        ...prev,
        [abilityName]: cooldown
      }));
    },
    getSelectedAbility: () => selectedAbility,
    getAvailableAbilities: (excludeAbility) => {
        return abilities
          .filter(a => 
            a.name !== excludeAbility && 
            abilityCooldowns[a.name] <= 0
          )
          .map(a => a.name);
      }
  }));
  
  return (
    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2 flex-wrap justify-center max-w-3xl">
      {abilities.map(ability => {
        const cooldownPercentage = (abilityCooldowns[ability.name] / ability.cooldown) * 100;
        
        return (
          <div key={ability.name} className="relative">
            <button
              className={`w-16 h-16 rounded-lg relative overflow-hidden ${
                selectedAbility === ability.name 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-200 text-gray-700'
              } ${cooldownPercentage > 0 ? 'cursor-not-allowed opacity-50' : ''}`}
              onClick={() => {
                if (cooldownPercentage === 0 && isPlaying) {
                  handleSelectAbility(ability.name);
                }
              }}
              disabled={!isPlaying || cooldownPercentage > 0}
            >
              {/* Cooldown Overlay */}
              <div
                className="absolute bottom-0 left-0 w-full bg-black bg-opacity-50"
                style={{
                  height: `${cooldownPercentage}%`,
                  transition: 'height 0.1s linear'
                }}
              />
              
              {/* Ability Label */}
              <div className="absolute inset-0 flex items-center justify-center z-10">
                <span className="text-xs font-bold">{ability.label}</span>
              </div>
            </button>

            {/* Cooldown Timer */}
            {cooldownPercentage > 0 && (
              <div className="absolute bottom-0 left-0 w-full text-center text-white text-xs bg-black bg-opacity-50 rounded-b-lg">
                {Math.ceil(abilityCooldowns[ability.name] / 1000)}s
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

});

// Add a method for external components to trigger cooldowns
AbilityBar.displayName = 'AbilityBar';

export default React.memo(AbilityBar);