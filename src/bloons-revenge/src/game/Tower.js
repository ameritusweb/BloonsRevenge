import * as BABYLON from '@babylonjs/core';

class Tower {
  constructor(scene, position, eventEmitter, type = 'basic') {
    this.scene = scene;
    this.eventEmitter = eventEmitter;
    this.type = type;
    this.disabled = false;
    this.disabledUntil = 0;
    
    // Base properties
    this.baseRange = 8;
    this.baseShotCooldown = 1000;
    
    // Apply tower type modifications
    switch(type) {
      case 'sniper':
        this.baseRange = 20;
        this.baseShotCooldown = 2000;
        this.damage = 2;
        this.piercing = true;
        break;
      case 'freeze':
        this.baseRange = 6;
        this.baseShotCooldown = 1500;
        this.areaOfEffect = 3;
        this.slowEffect = 0.5;
        break;
      case 'tesla':
        this.baseRange = 10;
        this.baseShotCooldown = 800;
        this.chainTargets = 3;
        this.chainRange = 4;
        break;
      default: // basic
        this.baseRange = 8;
        this.baseShotCooldown = 1000;
        this.damage = 1;
        break;
    }
    
    // Current properties (can be modified by upgrades/effects)
    this.range = this.baseRange;
    this.shotCooldown = this.baseShotCooldown;
    this.lastShotTime = 0;
    
    // Create base mesh
    this.base = BABYLON.MeshBuilder.CreateCylinder(
      `tower-${type}-base`,
      { height: 2, diameter: 1 },
      scene
    );
    this.base.position = position;
    
    const baseMaterial = new BABYLON.StandardMaterial(`tower-${type}-mat`, scene);
    
    // Set color based on tower type
    switch(type) {
      case 'sniper':
        baseMaterial.diffuseColor = new BABYLON.Color3(0.2, 0.2, 0.6);
        break;
      case 'freeze':
        baseMaterial.diffuseColor = new BABYLON.Color3(0.7, 0.7, 0.9);
        break;
      case 'tesla':
        baseMaterial.diffuseColor = new BABYLON.Color3(0.6, 0.4, 0.8);
        break;
      default: // basic
        baseMaterial.diffuseColor = new BABYLON.Color3(0.4, 0.4, 0.8);
        break;
    }
    
    this.base.material = baseMaterial;
    
    // Create turret mesh
    this.turret = BABYLON.MeshBuilder.CreateBox(
      `tower-${type}-turret`,
      { size: 0.5 },
      scene
    );
    this.turret.position = position.add(new BABYLON.Vector3(0, 1.25, 0));
    
    const turretMaterial = new BABYLON.StandardMaterial(`tower-${type}-turret-mat`, scene);
    turretMaterial.diffuseColor = baseMaterial.diffuseColor.scale(0.7); // Darker shade
    this.turret.material = turretMaterial;
    
    // Create range indicator (hidden by default)
    this.rangeIndicator = BABYLON.MeshBuilder.CreateGround(
      `tower-${type}-range`,
      { width: this.range * 2, height: this.range * 2 },
      scene
    );
    this.rangeIndicator.position = new BABYLON.Vector3(position.x, 0.05, position.z);
    
    const rangeIndicatorMaterial = new BABYLON.StandardMaterial(`tower-${type}-range-mat`, scene);
    rangeIndicatorMaterial.diffuseColor = baseMaterial.diffuseColor.scale(0.8);
    rangeIndicatorMaterial.alpha = 0.3;
    this.rangeIndicator.material = rangeIndicatorMaterial;
    this.rangeIndicator.isVisible = false;
    
    // Store active projectiles and effects
    this.activeProjectiles = [];
  }
  
  update(bloons, currentTime) {
    // Check if tower is disabled
    if (this.disabled && currentTime < this.disabledUntil) {
      return;
    } else if (this.disabled) {
      this.disabled = false;
      this.base.material.alpha = 1.0;
      this.turret.material.alpha = 1.0;
    }
    
    // Find target(s) based on tower type
    let targets;
    
    switch(this.type) {
      case 'sniper':
        // Sniper targets the furthest bloon along the path
        targets = this.findFurthestTarget(bloons);
        break;
      case 'freeze':
        // Freeze targets all bloons in an area
        targets = this.findAreaTargets(bloons);
        break;
      case 'tesla':
        // Tesla targets closest bloon initially then chains
        targets = this.findChainTargets(bloons);
        break;
      default:
        // Basic tower targets closest bloon
        targets = this.findClosestTarget(bloons);
        break;
    }
    
    if (!targets || (Array.isArray(targets) && targets.length === 0)) {
      return;
    }
    
    // Target the first bloon for turret rotation
    const primaryTarget = Array.isArray(targets) ? targets[0] : targets;
    
    // Rotate turret to face target
    const direction = primaryTarget.mesh.position.subtract(this.turret.position);
    const angle = Math.atan2(direction.x, direction.z);
    this.turret.rotation.y = angle;
    
    // Check cooldown
    if (currentTime - this.lastShotTime > this.shotCooldown) {
      this.shoot(targets, currentTime);
      this.lastShotTime = currentTime;
    }
  }
  
  findClosestTarget(bloons) {
    let closestBloon = null;
    let closestDistance = Infinity;
    
    for (const bloon of bloons) {
      // Skip camo bloons unless this is a special tower
      if (bloon.abilities.camo && this.type !== 'freeze') {
        continue;
      }
      
      // Skip phase bloons if they have the untargetable upgrade
      if (bloon.abilities.phase && bloon.hasUpgrade?.ghostMode) {
        continue;
      }
      
      const distance = BABYLON.Vector3.Distance(
        this.base.position,
        bloon.mesh.position
      );
      
      if (distance <= this.range && distance < closestDistance) {
        closestBloon = bloon;
        closestDistance = distance;
      }
    }
    
    return closestBloon;
  }
  
  findFurthestTarget(bloons) {
    let furthestBloon = null;
    let furthestPathIndex = -1;
    
    for (const bloon of bloons) {
      // Skip camo bloons
      if (bloon.abilities.camo) {
        continue;
      }
      
      // Skip phase bloons if they have the untargetable upgrade
      if (bloon.abilities.phase && bloon.hasUpgrade?.ghostMode) {
        continue;
      }
      
      const distance = BABYLON.Vector3.Distance(
        this.base.position,
        bloon.mesh.position
      );
      
      if (distance <= this.range && bloon.pathIndex > furthestPathIndex) {
        furthestBloon = bloon;
        furthestPathIndex = bloon.pathIndex;
      }
    }
    
    return furthestBloon;
  }
  
  findAreaTargets(bloons) {
    const targets = [];
    
    for (const bloon of bloons) {
      // Freeze tower can see camo bloons
      
      // Skip phase bloons if they have the untargetable upgrade
      if (bloon.abilities.phase && bloon.hasUpgrade?.ghostMode) {
        continue;
      }
      
      const distance = BABYLON.Vector3.Distance(
        this.base.position,
        bloon.mesh.position
      );
      
      if (distance <= this.range) {
        targets.push(bloon);
      }
    }
    
    return targets;
  }
  
  findChainTargets(bloons) {
    // Start with closest target
    const primaryTarget = this.findClosestTarget(bloons);
    if (!primaryTarget) return null;
    
    const chainTargets = [primaryTarget];
    
    // Find additional targets within chain range of the primary target
    for (const bloon of bloons) {
      // Skip the primary target
      if (bloon === primaryTarget) {
        continue;
      }
      
      // Skip camo bloons
      if (bloon.abilities.camo) {
        continue;
      }
      
      // Skip phase bloons if they have the untargetable upgrade
      if (bloon.abilities.phase && bloon.hasUpgrade?.ghostMode) {
        continue;
      }
      
      const distance = BABYLON.Vector3.Distance(
        primaryTarget.mesh.position,
        bloon.mesh.position
      );
      
      if (distance <= this.chainRange && chainTargets.length < this.chainTargets) {
        chainTargets.push(bloon);
      }
    }
    
    return chainTargets;
  }
  
  shoot(targets, currentTime) {
    // Handle different shooting behaviors based on tower type
    switch(this.type) {
      case 'sniper':
        this.shootSniper(targets);
        break;
      case 'freeze':
        this.shootFreeze(targets);
        break;
      case 'tesla':
        this.shootTesla(targets);
        break;
      default:
        this.shootBasic(targets);
        break;
    }
  }
  
  shootBasic(bloon) {
    this.eventEmitter.emit('towerShot', {
      tower: this,
      target: bloon,
      type: 'basic'
    });

    const projectile = BABYLON.MeshBuilder.CreateSphere(
      "projectile",
      { diameter: 0.2 },
      this.scene
    );
    const projectileMaterial = new BABYLON.StandardMaterial("projectileMat", this.scene);
    projectileMaterial.diffuseColor = new BABYLON.Color3(1, 1, 0);
    projectile.material = projectileMaterial;
    
    projectile.position = this.turret.position.clone();

    // Calculate initial direction to bloon
    const direction = bloon.mesh.position.subtract(this.turret.position);
    direction.normalize();

    // Store projectile speed
    const projectileSpeed = 0.5; // Adjust this value to make projectiles faster/slower

    // Register before render to update projectile position and check collisions
    const observer = this.scene.onBeforeRenderObservable.add(() => {
      // Move projectile
      projectile.position.addInPlace(direction.scale(projectileSpeed));

      // Check if projectile has gone too far
      const distanceFromTower = BABYLON.Vector3.Distance(
        this.turret.position,
        projectile.position
      );

      if (distanceFromTower > this.range * 1.5) {
        // Projectile missed or went too far
        this.scene.onBeforeRenderObservable.remove(observer);
        projectile.dispose();
        return;
      }

      // Check for collision with bloon
      if (bloon.mesh) { // Make sure bloon still exists
        const hitDistance = BABYLON.Vector3.Distance(
          projectile.position,
          bloon.mesh.position
        );

        if (hitDistance < 0.5) { // Adjust this value for hit detection radius
          // Remove the observer before handling the hit
          this.scene.onBeforeRenderObservable.remove(observer);

          // Handle hit result
          const hitResult = bloon.onHit(this, projectile);
          
          if (hitResult === true) {
            // Normal hit
            this.eventEmitter.emit('towerHit', {
              tower: this,
              target: bloon,
              type: 'destroy'
            });
          } else if (hitResult === false) {
            // Hit blocked
            this.eventEmitter.emit('towerHit', {
              tower: this,
              target: bloon,
              type: 'blocked'
            });
          }
          
          projectile.dispose();
        }
      } else {
        // Bloon no longer exists
        this.scene.onBeforeRenderObservable.remove(observer);
        projectile.dispose();
      }
    });

    // Cleanup if projectile still exists after some time
    setTimeout(() => {
      if (projectile) {
        this.scene.onBeforeRenderObservable.remove(observer);
        projectile.dispose();
      }
    }, 5000); // 5 second safety cleanup
  }
  
  shootSniper(bloon) {
    // Create a line/beam instead of a projectile for sniper
    const line = BABYLON.MeshBuilder.CreateLines(
      "sniperBeam",
      {
        points: [
          this.turret.position.clone(),
          bloon.mesh.position.clone()
        ]
      },
      this.scene
    );
    
    const beamMaterial = new BABYLON.StandardMaterial("beamMat", this.scene);
    beamMaterial.emissiveColor = new BABYLON.Color3(1, 0.3, 0.3);
    line.color = new BABYLON.Color3(1, 0.3, 0.3);
    
    // Create a temporary flash effect on the sniper turret
    const flashSphere = BABYLON.MeshBuilder.CreateSphere(
      "flash",
      { diameter: 0.6 },
      this.scene
    );
    flashSphere.parent = this.turret;
    flashSphere.position = new BABYLON.Vector3(0, 0, 0.5);
    
    const flashMaterial = new BABYLON.StandardMaterial("flashMat", this.scene);
    flashMaterial.emissiveColor = new BABYLON.Color3(1, 0.6, 0.3);
    flashSphere.material = flashMaterial;
    
    // Fade out the beam and flash
    setTimeout(() => {
      let alpha = 1.0;
      const fadeInterval = setInterval(() => {
        alpha -= 0.1;
        line.color = new BABYLON.Color3(1 * alpha, 0.3 * alpha, 0.3 * alpha);
        flashMaterial.alpha = alpha;
        
        if (alpha <= 0) {
          clearInterval(fadeInterval);
          line.dispose();
          flashSphere.dispose();
          
          // Handle hit
          bloon.onHit(this);
        }
      }, 50);
    }, 100);
  }
  
  shootFreeze(targets) {
    // Create freeze wave effect
    const wave = BABYLON.MeshBuilder.CreateDisc(
      "freezeWave",
      { radius: 0.5, tessellation: 36 },
      this.scene
    );
    wave.position = this.turret.position.clone();
    wave.position.y = 0.5;
    wave.rotation.x = Math.PI / 2;
    
    const waveMaterial = new BABYLON.StandardMaterial("waveMat", this.scene);
    waveMaterial.diffuseColor = new BABYLON.Color3(0.7, 0.8, 1);
    waveMaterial.alpha = 0.7;
    waveMaterial.emissiveColor = new BABYLON.Color3(0.5, 0.7, 1);
    wave.material = waveMaterial;
    
    // Animate the wave
    const frameRate = 30;
    const waveExpand = new BABYLON.Animation(
      "waveExpand",
      "scaling", 
      frameRate, 
      BABYLON.Animation.ANIMATIONTYPE_VECTOR3, 
      BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
    );
    
    const waveKeyframes = [];
    waveKeyframes.push({
      frame: 0,
      value: new BABYLON.Vector3(1, 1, 1)
    });
    waveKeyframes.push({
      frame: frameRate,
      value: new BABYLON.Vector3(this.areaOfEffect * 2, this.areaOfEffect * 2, 1)
    });
    
    waveExpand.setKeys(waveKeyframes);
    wave.animations = [waveExpand];
    
    // Animate wave and apply slow effect to targets
    this.scene.beginAnimation(wave, 0, frameRate, false, 1, () => {
      targets.forEach(bloon => {
        // Apply slow effect
        if (!bloon.abilities.shield) {
          bloon.speed *= this.slowEffect;
          
          // Create frost effect
          const frost = BABYLON.MeshBuilder.CreateSphere(
            "frost",
            { diameter: 1 },
            this.scene
          );
          frost.parent = bloon.mesh;
          frost.position = new BABYLON.Vector3(0, 0, 0);
          
          const frostMaterial = new BABYLON.StandardMaterial("frostMat", this.scene);
          frostMaterial.diffuseColor = new BABYLON.Color3(0.8, 0.9, 1);
          frostMaterial.alpha = 0.4;
          frost.material = frostMaterial;
          
          // Remove frost and restore speed after effect duration
          setTimeout(() => {
            bloon.speed = bloon.baseSpeed;
            frost.dispose();
          }, 3000);
        }
      });
      
      // Fade out wave
      let alpha = 0.7;
      const fadeInterval = setInterval(() => {
        alpha -= 0.05;
        waveMaterial.alpha = alpha;
        
        if (alpha <= 0) {
          clearInterval(fadeInterval);
          wave.dispose();
        }
      }, 50);
    });
  }
  
  shootTesla(targets) {
    if (!targets || targets.length === 0) return;
    
    // Create lightning effects between targets
    for (let i = 0; i < targets.length; i++) {
      const target = targets[i];
      
      // Create lightning from tower to first target, or from previous target to this target
      const startPos = i === 0 
        ? this.turret.position.clone() 
        : targets[i-1].mesh.position.clone();
      const endPos = target.mesh.position.clone();
      
      // Create zigzag lightning path
      const lightningPoints = this.createLightningPath(startPos, endPos);
      
      // Create lightning mesh
      const lightning = BABYLON.MeshBuilder.CreateLines(
        "lightning",
        { points: lightningPoints },
        this.scene
      );
      lightning.color = new BABYLON.Color3(0.4, 0.4, 1);
      
      // Create glow effect
      const glow = new BABYLON.GlowLayer(`lightning-glow-${i}`, this.scene);
      glow.intensity = 1.0;
      glow.addIncludedOnlyMesh(lightning);
      
      // Handle hit on target
      target.onHit(this);
      
      // Fade out lightning
      setTimeout(() => {
        let alpha = 1.0;
        const fadeInterval = setInterval(() => {
          alpha -= 0.1;
          lightning.color = new BABYLON.Color3(0.4 * alpha, 0.4 * alpha, 1 * alpha);
          glow.intensity = alpha;
          
          if (alpha <= 0) {
            clearInterval(fadeInterval);
            lightning.dispose();
            glow.dispose();
          }
        }, 30);
      }, 200);
    }
  }
  
  createLightningPath(start, end) {
    const points = [];
    const segments = 8;
    const direction = end.subtract(start);
    const length = direction.length();
    const segmentLength = length / segments;
    
    direction.normalize();
    
    points.push(start.clone());
    
    for (let i = 1; i < segments; i++) {
      const segmentPoint = start.add(direction.scale(segmentLength * i));
      
      // Add random offset perpendicular to main direction
      const perpX = -direction.z;
      const perpZ = direction.x;
      const randomOffset = (Math.random() - 0.5) * segmentLength;
      
      segmentPoint.x += perpX * randomOffset;
      segmentPoint.z += perpZ * randomOffset;
      
      points.push(segmentPoint);
    }
    
    points.push(end.clone());
    
    return points;
  }
  
  handleRubberBounce(bloon, targetTower) {
    this.eventEmitter.emit('towerBouncedHit', {
      tower: this,
      source: bloon,
      position: this.turret.position.clone()
    });

    const bounceProjectile = BABYLON.MeshBuilder.CreateSphere(
      "bounceProjectile",
      { diameter: 0.2 },
      this.scene
    );
    
    const projectileMaterial = new BABYLON.StandardMaterial("projectileMat", this.scene);
    projectileMaterial.diffuseColor = new BABYLON.Color3(1, 1, 0);
    bounceProjectile.material = projectileMaterial;
    bounceProjectile.position = bloon.mesh.position.clone();
    
    // Bounce back towards the tower
    const animation = new BABYLON.Animation(
      "bounceAnim",
      "position",
      60,
      BABYLON.Animation.ANIMATIONTYPE_VECTOR3,
      BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
    );
    
    const keyFrames = [];
    keyFrames.push({
      frame: 0,
      value: bloon.mesh.position.clone()
    });
    keyFrames.push({
      frame: 30,
      value: this.turret.position.clone()
    });
    
    animation.setKeys(keyFrames);
    bounceProjectile.animations = [animation];
    
    this.scene.beginAnimation(bounceProjectile, 0, 30, false, 1, () => {
      // Disable the tower temporarily when hit by rubber projectile
      this.disableTower(2000); // Standard 2 seconds
      
      // Handle tower jamming upgrade if present
      if (bloon.hasUpgrade?.towerJamming) {
        this.eventEmitter.emit('towerJammed', {
          tower: this,
          source: bloon,
          range: bloon.upgradeEffects?.towerJamming?.areaOfEffect || 3,
          duration: bloon.upgradeEffects?.towerJamming?.disableDuration || 5
        });

        const jammingRange = bloon.upgradeEffects?.towerJamming?.areaOfEffect || 3;
        const jammingDuration = bloon.upgradeEffects?.towerJamming?.disableDuration || 5;
        
        // Disable nearby towers too
        // This would be implemented by the game manager
        
        // Visual effect for jamming
        const jammingWave = BABYLON.MeshBuilder.CreateDisc(
          "jammingWave",
          { radius: 0.5, tessellation: 36 },
          this.scene
        );
        jammingWave.position = this.turret.position.clone();
        jammingWave.position.y = 0.5;
        jammingWave.rotation.x = Math.PI / 2;
        
        const waveMaterial = new BABYLON.StandardMaterial("waveMat", this.scene);
        waveMaterial.diffuseColor = new BABYLON.Color3(1, 0.3, 0.3);
        waveMaterial.alpha = 0.5;
        jammingWave.material = waveMaterial;
        
        // Animate jamming wave
        const frameRate = 20;
        const waveExpand = new BABYLON.Animation(
          "waveExpand",
          "scaling", 
          frameRate, 
          BABYLON.Animation.ANIMATIONTYPE_VECTOR3, 
          BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
        );
        
        const waveKeyframes = [];
        waveKeyframes.push({
          frame: 0,
          value: new BABYLON.Vector3(1, 1, 1)
        });
        waveKeyframes.push({
          frame: frameRate,
          value: new BABYLON.Vector3(jammingRange * 2, jammingRange * 2, 1)
        });
        
        waveExpand.setKeys(waveKeyframes);
        jammingWave.animations = [waveExpand];
        
        this.scene.beginAnimation(jammingWave, 0, frameRate, false, 1, () => {
          setTimeout(() => {
            jammingWave.dispose();
          }, 200);
        });
      }
      
      bounceProjectile.dispose();
    });
  }
  
  handleMirrorEffect(bloon, position) {
    // Visual effect would be implemented here
    // The actual mirror clone creation should be handled by the game manager
    // Notify the game manager of the need to create mirror clones
  }
  
  handleSplitEffect(bloon, position) {
    // Visual effect would be implemented here
    // The actual split creation should be handled by the game manager
    // Notify the game manager of the need to create split bloons
  }
  
  disableTower(duration) {
    this.eventEmitter.emit('towerDisabled', {
      tower: this,
      duration: duration
    });

    this.disabled = true;
    this.disabledUntil = Date.now() + duration;
    
    // Visual effect for disabled tower
    this.base.material.alpha = 0.5;
    this.turret.material.alpha = 0.5;
    
    // Create a disabled indicator
    const disabledIndicator = BABYLON.MeshBuilder.CreatePlane(
      "disabledIndicator",
      { size: 1 },
      this.scene
    );
    disabledIndicator.position = this.turret.position.clone();
    disabledIndicator.position.y += 1;
    disabledIndicator.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
    
    const indicatorMaterial = new BABYLON.StandardMaterial("indicatorMat", this.scene);
    indicatorMaterial.diffuseColor = new BABYLON.Color3(1, 0, 0);
    indicatorMaterial.emissiveColor = new BABYLON.Color3(1, 0, 0);
    disabledIndicator.material = indicatorMaterial;
    
    // Fade out and remove indicator when tower is re-enabled
    setTimeout(() => {
      disabledIndicator.dispose();
    }, duration);
  }
  
  showRange() {
    this.rangeIndicator.isVisible = true;
  }
  
  hideRange() {
    this.rangeIndicator.isVisible = false;
  }
  
  dispose() {
    this.base.dispose();
    this.turret.dispose();
    this.rangeIndicator.dispose();
    
    // Clean up any active projectiles
    this.activeProjectiles.forEach(projectile => {
      projectile.dispose();
    });
  }
}

export default Tower;