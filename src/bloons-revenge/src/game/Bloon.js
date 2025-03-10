import * as BABYLON from '@babylonjs/core';
import UpgradeManager from '../managers/UpgradeManager';

class Bloon {
  constructor(scene, startPosition, eventEmitter, pathPoints, modifiers = {}) {
    this.scene = scene;
    this.eventEmitter = eventEmitter;
    this.pathPoints = pathPoints;
    
    // Create mesh
    this.mesh = BABYLON.MeshBuilder.CreateSphere(
      "bloon",
      { diameter: 1.6 },
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
    this.baseSpeed = 0.03;
    this.speed = this.baseSpeed;
    this.pathIndex = 0;
    this.isDead = false;
    
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
        this.speed = this.baseSpeed * 5;
        
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
    if (!this.isDead && this.pathIndex < this.pathPoints.length - 1) {
      const nextPoint = this.pathPoints[this.pathIndex + 1];
      
      // Calculate direction from current position to next point
      const direction = nextPoint.subtract(this.mesh.position);
      direction.normalize();
      
      this.mesh.position.addInPlace(direction.scale(this.speed));
      
      // Check if we've reached the next point
      if (BABYLON.Vector3.Distance(this.mesh.position, nextPoint) < 0.1) {
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
    this.isDead = true;

    this.eventEmitter.emit('bloonDisposed', { 
      bloon: this,
      position: this.mesh.position?.clone(),
      wasClone: this.isClone
    });

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

  escape() {
    if (!this.hasEscaped && !this.isDead) {
      this.hasEscaped = true;
      this.eventEmitter.emit('bloonEscaped', { 
        bloon: this,
        position: this.mesh.position.clone(),
        pathIndex: this.pathIndex,
        wasClone: this.isClone
      });
      this.dispose();
    }
  }
  
  createMirrorClones() {
    const angles = [Math.PI/4, -Math.PI/4];
    const splitEffects = [];
    
    angles.forEach(angle => {
      // Create mirror split particle effect
      const splitEffect = new BABYLON.ParticleSystem("mirrorSplit", 50, this.scene);
      splitEffect.particleTexture = new BABYLON.Texture("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=="); // Placeholder
      splitEffect.emitter = this.mesh.position.clone();
      
      // Set up particle properties
      splitEffect.minEmitBox = new BABYLON.Vector3(-0.2, -0.2, -0.2);
      splitEffect.maxEmitBox = new BABYLON.Vector3(0.2, 0.2, 0.2);
      splitEffect.color1 = new BABYLON.Color4(0.8, 0.8, 1, 1);
      splitEffect.color2 = new BABYLON.Color4(0.6, 0.6, 0.8, 1);
      splitEffect.minSize = 0.1;
      splitEffect.maxSize = 0.2;
      splitEffect.minLifeTime = 0.3;
      splitEffect.maxLifeTime = 0.5;
      splitEffect.emitRate = 50;
      splitEffect.start();
      
      splitEffects.push(splitEffect);
    });
  
    // Clean up effects after a short delay
    setTimeout(() => {
      splitEffects.forEach(effect => effect.dispose());
    }, 500);
  
    // Notify that mirror clones should be created
    this.eventEmitter.emit('bloonMirrored', {
      bloon: this,
      position: this.mesh.position.clone(),
      angles: angles
    });
  }
  
  createDeathExplosion() {
    // Create explosion mesh
    const explosion = BABYLON.MeshBuilder.CreateSphere(
      "explosion",
      { diameter: 1 },
      this.scene
    );
    explosion.position = this.mesh.position.clone();
    
    // Create explosion material
    const explosionMaterial = new BABYLON.StandardMaterial("explosionMat", this.scene);
    explosionMaterial.diffuseColor = new BABYLON.Color3(1, 0.5, 0);
    explosionMaterial.emissiveColor = new BABYLON.Color3(1, 0.3, 0);
    explosionMaterial.alpha = 0.8;
    explosion.material = explosionMaterial;
  
    // Create particle system for explosion
    const particles = new BABYLON.ParticleSystem("explosionParticles", 200, this.scene);
    particles.particleTexture = new BABYLON.Texture("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=="); // Placeholder
    particles.emitter = this.mesh.position;
    particles.minEmitBox = new BABYLON.Vector3(-0.5, -0.5, -0.5);
    particles.maxEmitBox = new BABYLON.Vector3(0.5, 0.5, 0.5);
    particles.color1 = new BABYLON.Color4(1, 0.5, 0, 1);
    particles.color2 = new BABYLON.Color4(1, 0.2, 0, 1);
    particles.minSize = 0.3;
    particles.maxSize = 1;
    particles.minLifeTime = 0.2;
    particles.maxLifeTime = 0.4;
    particles.emitRate = 500;
    particles.blendMode = BABYLON.ParticleSystem.BLENDMODE_ADD;
    particles.gravity = new BABYLON.Vector3(0, 8, 0);
    particles.direction1 = new BABYLON.Vector3(-1, 8, 1);
    particles.direction2 = new BABYLON.Vector3(1, 8, -1);
    particles.start();
  
    // Animate explosion
    const explosionAnimation = new BABYLON.Animation(
      "explosionAnim",
      "scaling",
      60,
      BABYLON.Animation.ANIMATIONTYPE_VECTOR3,
      BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
    );
  
    const keyFrames = [];
    keyFrames.push({
      frame: 0,
      value: new BABYLON.Vector3(0.1, 0.1, 0.1)
    });
    keyFrames.push({
      frame: 30,
      value: new BABYLON.Vector3(3, 3, 3)
    });
  
    explosionAnimation.setKeys(keyFrames);
    explosion.animations = [explosionAnimation];
  
    // Play animation and clean up
    this.scene.beginAnimation(explosion, 0, 30, false, 1, () => {
      setTimeout(() => {
        particles.dispose();
        explosion.dispose();
      }, 400);
    });
  
    // Emit event for game logic
    this.eventEmitter.emit('bloonExploded', {
      bloon: this,
      position: this.mesh.position.clone(),
      radius: 3 // Explosion radius
    });
  }
  
  createShieldBreakEffect() {
    // Create shield break particles
    const shieldBreak = new BABYLON.ParticleSystem("shieldBreak", 50, this.scene);
    shieldBreak.particleTexture = new BABYLON.Texture("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=="); // Placeholder
    shieldBreak.emitter = this.mesh.position.clone();
    
    // Set up particle properties
    shieldBreak.minEmitBox = new BABYLON.Vector3(-0.2, -0.2, -0.2);
    shieldBreak.maxEmitBox = new BABYLON.Vector3(0.2, 0.2, 0.2);
    shieldBreak.color1 = new BABYLON.Color4(0, 1, 1, 1);
    shieldBreak.color2 = new BABYLON.Color4(0, 0.5, 1, 1);
    shieldBreak.minSize = 0.1;
    shieldBreak.maxSize = 0.3;
    shieldBreak.minLifeTime = 0.2;
    shieldBreak.maxLifeTime = 0.4;
    shieldBreak.emitRate = 100;
    shieldBreak.blendMode = BABYLON.ParticleSystem.BLENDMODE_ADD;
    
    // Create shield break flash
    const flash = new BABYLON.HighlightLayer("shieldFlash", this.scene);
    flash.addMesh(this.mesh, new BABYLON.Color3(0, 1, 1));
    
    // Start effects
    shieldBreak.start();
    
    // Clean up after effects finish
    setTimeout(() => {
      shieldBreak.dispose();
      flash.dispose();
    }, 400);
  }
  
  createPopEffect() {
    // Create pop particles
    const pop = new BABYLON.ParticleSystem("pop", 30, this.scene);
    pop.particleTexture = new BABYLON.Texture("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=="); // Placeholder
    pop.emitter = this.mesh.position.clone();
    
    // Set up particle properties
    pop.minEmitBox = new BABYLON.Vector3(-0.1, -0.1, -0.1);
    pop.maxEmitBox = new BABYLON.Vector3(0.1, 0.1, 0.1);
    pop.color1 = new BABYLON.Color4(1, 0, 0, 1);
    pop.color2 = new BABYLON.Color4(0.8, 0, 0, 1);
    pop.minSize = 0.05;
    pop.maxSize = 0.15;
    pop.minLifeTime = 0.2;
    pop.maxLifeTime = 0.4;
    pop.emitRate = 100;
    pop.blendMode = BABYLON.ParticleSystem.BLENDMODE_ADD;
    pop.gravity = new BABYLON.Vector3(0, 5, 0);
    
    // Create pop flash
    const flash = new BABYLON.HighlightLayer("popFlash", this.scene);
    flash.addMesh(this.mesh, new BABYLON.Color3(1, 0, 0));
    
    // Start effects
    pop.start();
    
    // Clean up after effects finish
    setTimeout(() => {
      pop.dispose();
      flash.dispose();
    }, 400);
  }

  // Handle getting hit by projectile
  onHit(tower, projectile) {
    if (this.abilities.shield) {
      // Shield blocks the hit
      this.abilities.shield = false;
      this.material.diffuseColor = new BABYLON.Color3(1, 0, 0);
      this.createShieldBreakEffect();
      this.eventEmitter.emit('bloonShieldBroken', { bloon: this });
      return false;
    }
    
    if (this.abilities.phase) {
      // Phase lets projectiles pass through
      this.eventEmitter.emit('bloonPhased', { bloon: this });
      return false;
    }
    
    if (this.abilities.rubber) {
      // Bounce projectile back toward tower
      this.eventEmitter.emit('bloonBounced', { bloon: this, tower });
      return { action: 'bounce', target: tower };
    }
    
    if (this.abilities.mirror && !this.hasMirrored) {
      // Trigger mirror effect
      this.hasMirrored = true;
      this.createMirrorClones();
      this.eventEmitter.emit('bloonMirrored', { 
        bloon: this, 
        position: this.mesh.position.clone(),
        pathIndex: this.pathIndex,
        pathPoints: this.pathPoints 
      });
      return { action: 'mirror', position: this.mesh.position.clone() };
    }
    
    if (this.abilities.split && !this.hasSplit) {
      // Trigger split effect
      this.hasSplit = true;
      this.eventEmitter.emit('bloonSplit', { 
        bloon: this, 
        position: this.mesh.position.clone(),
        pathIndex: this.pathIndex,
        pathPoints: this.pathPoints
      });
      return { action: 'split', position: this.mesh.position.clone() };
    }
    
    // Normal hit
  this.createPopEffect();
  
  // Handle death explosion if active
  if (this.deathExplosion) {
    this.createDeathExplosion();
  }

  this.dispose();

    // Normal hit
    this.eventEmitter.emit('bloonDestroyed', { 
      bloon: this,
      position: this.mesh.position.clone(),
      wasClone: this.isClone
    });
    return true;
  }
}

export default Bloon;