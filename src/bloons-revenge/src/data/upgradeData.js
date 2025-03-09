// All available upgrades in the game
const upgradeData = {
    earlyGame: [
      {
        id: 'speedBurst',
        name: 'Speed Burst',
        description: 'Speed ability duration increased by 50% and cooldown reduced by 2 seconds',
        tier: 'early',
        type: 'permanent',
        icon: '⚡',
        effect: {
          abilityModifier: {
            speed: {
              durationMultiplier: 1.5,
              cooldownReduction: 2000
            }
          }
        }
      },
      {
        id: 'protectiveAura',
        name: 'Protective Aura',
        description: 'Shield ability protects nearby bloons within a small radius',
        tier: 'early',
        type: 'permanent',
        icon: '🛡️',
        effect: {
          abilityModifier: {
            shield: {
              areaOfEffect: 2
            }
          }
        }
      },
      {
        id: 'pathShortcut',
        name: 'Path Shortcut',
        description: 'Bloons move 20% faster for the next 3 levels',
        tier: 'early',
        type: 'temporary',
        duration: 3,
        icon: '🔄',
        effect: {
          bloonSpeedMultiplier: 1.2
        }
      }
    ],
    midGame: [
      {
        id: 'bloonReinforcement',
        name: 'Bloon Reinforcement',
        description: 'Start each level with 3 additional bloons',
        tier: 'mid',
        type: 'permanent',
        icon: '➕',
        effect: {
          additionalBloons: 3
        }
      },
      {
        id: 'burnoutMode',
        name: 'Burnout Mode',
        description: 'Fire ability creates trails that last twice as long',
        tier: 'mid',
        type: 'permanent',
        icon: '🔥',
        effect: {
          abilityModifier: {
            fire: {
              durationMultiplier: 2
            }
          }
        }
      },
      {
        id: 'overcharge',
        name: 'Overcharge',
        description: 'All abilities get a 30% cooldown reduction for the next 2 levels',
        tier: 'mid',
        type: 'temporary',
        duration: 2,
        icon: '⚡',
        effect: {
          abilityCooldownReduction: 0.3
        }
      }
    ],
    lateGame: [
      {
        id: 'ghostMode',
        name: 'Ghost Mode',
        description: 'Phase ability makes bloons completely untargetable',
        tier: 'late',
        type: 'permanent',
        icon: '👻',
        effect: {
          abilityModifier: {
            phase: {
              untargetable: true
            }
          }
        }
      },
      {
        id: 'towerJamming',
        name: 'Tower Jamming',
        description: 'Towers near rubber-reflected projectiles are disabled for 5 seconds',
        tier: 'late',
        type: 'permanent',
        icon: '🔇',
        effect: {
          abilityModifier: {
            rubber: {
              disableDuration: 5,
              areaOfEffect: 3
            }
          }
        }
      },
      {
        id: 'abilityFusion',
        name: 'Ability Fusion',
        description: 'For the next 2 levels, activating an ability has a 25% chance to activate a random second ability',
        tier: 'late',
        type: 'temporary',
        duration: 2,
        icon: '🔮',
        effect: {
          abilityFusionChance: 0.25
        }
      }
    ],
    endGame: [
      {
        id: 'permanentCamo',
        name: 'Permanent Camo',
        description: 'Bloons are automatically camo for 3 seconds when spawned',
        tier: 'end',
        type: 'permanent',
        icon: '🥷',
        effect: {
          autoCamoDuration: 3
        }
      },
      {
        id: 'bloonDetonation',
        name: 'Bloon Detonation',
        description: 'When a bloon escapes, it creates an explosion that disables nearby towers',
        tier: 'end',
        type: 'permanent',
        icon: '💥',
        effect: {
          escapeExplosion: {
            radius: 4,
            disableDuration: 3
          }
        }
      },
      {
        id: 'extraRetry',
        name: 'Extra Retry',
        description: 'If you fail a level, you can retry once with your remaining bloons',
        tier: 'end',
        type: 'permanent',
        icon: '🔄',
        effect: {
          retryAttempts: 1
        }
      }
    ]
  };
  
  export default upgradeData;