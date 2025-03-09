import * as BABYLON from '@babylonjs/core';
import UpgradeManager from '../managers/UpgradeManager';

class Bloon {
  constructor(scene, startPosition, pathPoints, modifiers = {}) {
    this.scene = scene;
    this.pathPoints = pathPoints;
    
    // Create mesh
    this.mesh = BABYLON.MeshBuilder.CreateSphere(
      "bloon",
      { diameter: 0.8 },
      scene
    );
    this.mesh.position = startPosition.clone();
    
    // Create material
    this.material = new BABYLON.StandardMaterial("bloonMat", scene);
    this.material.diffuseColor = new BABYLON.Color3(1, 0, 0);
    this.material.specularColor = new BABYLON.Color3(0.2, 0.2, 0.2);
    this.material.specularPower = 16;
    this.mesh.material = this.material;
    
    // Movement properties
    this.baseSpeed = 0.05;
    this.speed = this.baseSpeed;
    this.pathIndex = 0;
    
    // Ability states
    this.abilities = {
      shield: false,
      speed: false,
      camo: false,
      phase: false,
      fire: false,
      mirror: false,
      rubber: false,
      split: false
    };
    
    // Keep track of splits and mirrors to prevent infinite loops
    this.hasSplit = false;
    this.hasMirrored = false;
    
    // Store active trails and effects
    this.activeEffects = [];
    this.fireTrail = [];
    
    // Apply modifiers from upgrades
    if (modifiers) {
      UpgradeManager.applyBloonUpgrades(this, modifiers);
    }
  }
  
  activateAbility(abilityName, modifiers = {}) {
    // Return if ability is already active
    if (this.abilities[abilityName]) return;
    
    this.abilities[abilityName] = true;
    
    // Get modified duration if applicable
    const getModifiedDuration = (baseDuration) => {
      return UpgradeManager.getModifiedDuration(abilityName, baseDuration, modifiers);
    };
    
    switch(abilityName) {
      case 'shield':
        this.material.diffuseColor = new BABYLON.Color3(0, 1, 1);
        
        // Check for aura effect from upgrade
        const hasAura = modifiers?.permanentModifiers?.protectiveAura?.effect?.abilityModifier?.shield?.areaOfEffect;
        
        if (hasAura) {
          // Create shield aura visual
          const aura = BABYLON.MeshBuilder.CreateSphere(
            "shieldAura",
            { diameter: hasAura * 2 },
            this.scene
          );
          aura.parent = this.mesh;
          
          const auraMaterial = new BABYLON.StandardMaterial("auraMat", this.scene);
          auraMaterial.diffuseColor = new BABYLON.Color3(0, 0.7, 0.7);
          auraMaterial.alpha = 0.3;
          aura.material = auraMaterial;
          
          this.activeEffects.push(aura);
        }
        
        setTimeout(() => {
          this.abilities.shield = false;
          this.material.diffuseColor = new BABYLON.Color3(1, 0, 0);
          
          // Clean up any shield effects
          this.activeEffects.forEach(effect => {
            if (effect.name === "shieldAura") {
              effect.dispose();
            }
          });
          this.activeEffects = this.activeEffects.filter(effect => effect.name !== "shieldAura");
        }, getModifiedDuration(3000));
        break;
        
      case 'speed':
        // Base speed boost
        this.speed = this.baseSpeed * 3;
        
        setTimeout(() => {
          this.abilities.speed = false;
          this.speed = this.baseSpeed;
        }, getModifiedDuration(2000));
        break;
        
      case 'camo':
        this.material.alpha = 0.3;
        
        setTimeout(() => {
          this.abilities.camo = false;
          this.material.alpha = 1;
        }, getModifiedDuration(3000));
        break;
        
      case 'phase':
        // Visual effect
        this.material.emissiveColor = new BABYLON.Color3(0.5, 0, 0.5);
        this.material.alpha = 0.7;
        
        // Create trail effect if supported by Babylon.js version
        try {
          const trail = new BABYLON.TrailMesh('phaseTrail', this.mesh, this.scene, 0.2, 30);
          const trailMaterial = new BABYLON.StandardMaterial('trailMat', this.scene);
          trailMaterial.emissiveColor = new BABYLON.Color3(0.5, 0, 0.5);
          trailMaterial.alpha = 0.3;
          trail.material = trailMaterial;
          
          this.activeEffects.push(trail);
        } catch (e) {
          console.log('TrailMesh not supported in this version of Babylon.js');
        }
        
        setTimeout(() => {
          this.abilities.phase = false;
          this.material.emissiveColor = new BABYLON.Color3(0, 0, 0);
          this.material.alpha = 1;
          
          // Clean up trail
          this.activeEffects.forEach(effect => {
            if (effect.name === "phaseTrail") {
              effect.dispose();
            }
          });
          this.activeEffects = this.activeEffects.filter(effect => effect.name !== "phaseTrail");
        }, getModifiedDuration(2000));
        break;
        
      case 'fire':
        this.material.emissiveColor = new BABYLON.Color3(1, 0.3, 0);
        this.fireTrail = [];
        
        // Fire particle system
        const fireSystem = new BABYLON.ParticleSystem("fire", 100, this.scene);
        // Set up particle system properties...
        // For brevity, detailed particle setup is omitted
        
        // Start fire node creation
        const createFireNode = () => {
          const node = BABYLON.MeshBuilder.CreateSphere("fireNode", { diameter: 0.3 }, this.scene);
          node.position = this.mesh.position.clone();
          
          const nodeMaterial = new BABYLON.StandardMaterial("fireNodeMat", this.scene);
          nodeMaterial.emissiveColor = new BABYLON.Color3(1, 0.3, 0);
          nodeMaterial.alpha = 0.6;
          node.material = nodeMaterial;
          
          this.fireTrail.push(node);
          
          // Fade out and remove after time
          const duration = modifiers?.permanentModifiers?.burnoutMode ? 6000 : 3000;
          
          setTimeout(() => {
            const fadeOut = setInterval(() => {
              nodeMaterial.alpha -= 0.05;
              if (nodeMaterial.alpha <= 0) {
                clearInterval(fadeOut);
                node.dispose();
                this.fireTrail = this.fireTrail.filter(n => n !== node);
              }
            }, 50);
          }, duration);
        };
        
        // Create fire nodes periodically
        const trailInterval = setInterval(createFireNode, 200);
        
        setTimeout(() => {
          this.abilities.fire = false;
          this.material.emissiveColor = new BABYLON.Color3(0, 0, 0);
          clearInterval(trailInterval);
          
          // Let existing fire nodes stay until their timers run out
        }, getModifiedDuration(4000));
        break;
        
      case 'mirror':
        this.material.diffuseColor = new BABYLON.Color3(0.8, 0.8, 0.8);
        this.material.specularColor = new BABYLON.Color3(1, 1, 1);
        this.material.specularPower = 64;
        
        setTimeout(() => {
          this.abilities.mirror = false;
          this.material.diffuseColor = new BABYLON.Color3(1, 0, 0);
          this.material.specularColor = new BABYLON.Color3(0.2, 0.2, 0.2);
          this.material.specularPower = 16;
        }, getModifiedDuration(5000));
        break;
      
      case 'rubber':
        this.material.diffuseColor = new BABYLON.Color3(0.8, 0.8, 0.8);
        this.material.specularColor = new BABYLON.Color3(1, 1, 1);
        this.material.specularPower = 32;
        
        setTimeout(() => {
          this.abilities.rubber = false;
          this.material.diffuseColor = new BABYLON.Color3(1, 0, 0);
          this.material.specularColor = new BABYLON.Color3(0.2, 0.2, 0.2);
          this.material.specularPower = 16;
        }, getModifiedDuration(4000));
        break;
        
      case 'split':
        if (!this.abilities.split) {
          this.abilities.split = true;
          this.material.diffuseColor = new BABYLON.Color3(1, 0.5, 0);
          // Split happens when hit by projectile
        }
        break;
    }
  }
  
  update() {
    if (this.pathIndex < this.pathPoints.length - 1) {
      const start = this.pathPoints[this.pathIndex];
      const end = this.pathPoints[this.pathIndex + 1];
      const direction = end.subtract(start);
      direction.normalize();
      
      this.mesh.position.addInPlace(direction.scale(this.speed));
      
      if (BABYLON.Vector3.Distance(this.mesh.position, end) < 0.1) {
        this.pathIndex++;
      }
    }
    
    // Update fire trail effects if active
    if (this.abilities.fire && this.fireTrail.length > 0) {
      this.fireTrail.forEach(node => {
        // Logic for disabling nearby towers would go here
        // This is handled by the Tower class
      });
    }
  }
  
  dispose() {
    // Clean up any active effects
    this.activeEffects.forEach(effect => {
      effect.dispose();
    });
    
    // Clean up fire trail
    this.fireTrail.forEach(node => {
      node.dispose();
    });
    
    // Dispose mesh
    this.mesh.dispose();
  }
  
  // Handle getting hit by projectile
  onHit(tower, projectile) {
    if (this.abilities.shield) {
      // Shield blocks the hit
      this.abilities.shield = false;
      this.material.diffuseColor = new BABYLON.Color3(1, 0, 0);
      return false;
    }
    
    if (this.abilities.phase) {
      // Phase lets projectiles pass through
      return false;
    }
    
    if (this.abilities.rubber) {
      // Bounce projectile back toward tower
      return { action: 'bounce', target: tower };
    }
    
    if (this.abilities.mirror && !this.hasMirrored) {
      // Trigger mirror effect
      this.hasMirrored = true;
      return { action: 'mirror', position: this.mesh.position.clone() };
    }
    
    if (this.abilities.split && !this.hasSplit) {
      // Trigger split effect
      this.hasSplit = true;
      return { action: 'split', position: this.mesh.position.clone() };
    }
    
    // Normal hit
    return true;
  }
}

export default Bloon;