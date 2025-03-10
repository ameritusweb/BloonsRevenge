import * as BABYLON from '@babylonjs/core';
import Tower from './Tower';

/**
 * LevelGenerator class for creating and managing game levels
 */
class LevelGenerator {
  /**
   * Creates a new LevelGenerator instance
   * @param {BABYLON.Scene} scene - Babylon.js scene
   */
  constructor(scene, eventEmitter) {
    this.scene = scene;
    this.eventEmitter = eventEmitter;
  }

  /**
   * Generates a random path for bloons to travel
   * @param {object} options - Path generation options
   * @param {number} options.startX - Starting X coordinate (default: -14)
   * @param {number} options.startZ - Starting Z coordinate (default: -14)
   * @param {number} options.endX - Ending X coordinate (default: 14)
   * @param {number} options.endZ - Ending Z coordinate (default: 14)
   * @param {number} options.height - Path height (default: 0.1)
   * @param {number} options.minStep - Minimum step size (default: 4)
   * @param {number} options.maxStep - Maximum step size (default: 8)
   * @param {number} options.complexity - Path complexity (1-10, higher = more complex, default: 5)
   * @returns {Array} - Array of Vector3 points
   */
  generateRandomPath(options = {}) {
    const {
      startX = -14,
      startZ = -14,
      endX = 14,
      endZ = 14,
      height = 0.8,
      minStep = 4,
      maxStep = 8,
      complexity = 5
    } = options;
    
    const points = [];
    points.push(new BABYLON.Vector3(startX, height, startZ)); // Start
    
    let currentX = startX;
    let currentZ = startZ;
    
    // Calculate how many segments we want based on complexity
    const targetSegments = Math.max(3, Math.floor(5 + complexity * 0.5));
    let segmentsCreated = 0;
    
    // Main path creation loop
    while ((currentX < endX || currentZ < endZ) && segmentsCreated < targetSegments) {
      // Bias direction choice based on how far we are from the goal
      const xDistanceToGoal = endX - currentX;
      const zDistanceToGoal = endZ - currentZ;
      
      // Calculate bias - higher numbers favor that direction
      let xBias = Math.max(0, xDistanceToGoal / 5);
      let zBias = Math.max(0, zDistanceToGoal / 5);
      
      // Add randomness based on complexity
      const randomFactor = (10 - complexity) * 0.1; // Higher complexity = less randomness
      xBias += (Math.random() - 0.5) * randomFactor * 2;
      zBias += (Math.random() - 0.5) * randomFactor * 2;
      
      // Choose direction
      const direction = xBias > zBias ? 'x' : 'z';
      
      // Calculate step size
      const stepRange = maxStep - minStep;
      let step = minStep + Math.random() * stepRange;
      
      // As we get closer to target segments, make steps larger to ensure we reach the end
      const remainingSegments = targetSegments - segmentsCreated;
      if (remainingSegments <= 3) {
        step = Math.max(step, (endX - currentX) / remainingSegments, (endZ - currentZ) / remainingSegments);
      }
      
      // Apply step in chosen direction
      if (direction === 'x' && currentX < endX) {
        currentX = Math.min(endX, currentX + step);
      } else if (currentZ < endZ) {
        currentZ = Math.min(endZ, currentZ + step);
      } else {
        // Fallback if we're at one boundary but not the other
        if (currentX < endX) {
          currentX = Math.min(endX, currentX + step);
        } else {
          currentZ = Math.min(endZ, currentZ + step);
        }
      }
      
      points.push(new BABYLON.Vector3(currentX, height, currentZ));
      segmentsCreated++;
    }
    
    // Ensure we end at the target position
    if (currentX !== endX || currentZ !== endZ) {
      points.push(new BABYLON.Vector3(endX, height, endZ));
    }
    
    return points;
  }

  /**
   * Creates a tube mesh along a path
   * @param {Array} pathPoints - Array of Vector3 points defining the path
   * @param {object} options - Options for the path
   * @param {number} options.radius - Path radius (default: 0.5)
   * @param {number} options.tessellation - Path tessellation (default: 20)
   * @param {BABYLON.Color3} options.color - Path color (default: gray)
   * @returns {BABYLON.Mesh} - The created path mesh
   */
  createPathMesh(pathPoints, options = {}) {
    const {
      radius = 0.1,
      tessellation = 20,
      color = new BABYLON.Color3(0.4, 0.4, 0.4)
    } = options;
    
    const path = BABYLON.MeshBuilder.CreateTube(
      "track",
      {
        path: pathPoints,
        radius,
        tessellation,
      },
      this.scene
    );
    
    const pathMaterial = new BABYLON.StandardMaterial("trackMat", this.scene);
    pathMaterial.diffuseColor = color;
    pathMaterial.alpha = 0.1;
    path.material = pathMaterial;
    
    return path;
  }

  /**
   * Generates towers for a level
   * @param {Array} pathPoints - Array of Vector3 points defining the path
   * @param {object} options - Tower generation options
   * @param {number} options.count - Number of towers to generate (default: 5)
   * @param {number} options.minDistFromPath - Minimum distance from path (default: 3)
   * @param {number} options.minDistBetweenTowers - Minimum distance between towers (default: 4)
   * @param {number} options.level - Current game level (controls tower types available)
   * @returns {Array} - Array of Tower objects
   */
  generateTowers(pathPoints, options = {}) {
    const {
      count = 5,
      minDistFromPath = 3,
      minDistBetweenTowers = 4,
      level = 1,
      bounds = { minX: -14, maxX: 14, minZ: -14, maxZ: 14 }
    } = options;
    
    const towers = [];
    
    // Define available tower types based on level
    const availableTowers = ['basic'];
    if (level >= 6) availableTowers.push('sniper');
    if (level >= 8) availableTowers.push('freeze');
    if (level >= 10) availableTowers.push('tesla');
    
    // Balance tower type probabilities
    const getTowerType = () => {
      // Higher tier towers have lower probability
      const probabilities = {
        basic: 0.7 - (level * 0.02), // Decreases with level
        sniper: level >= 6 ? 0.1 + (level * 0.005) : 0, // Increases with level
        freeze: level >= 8 ? 0.1 + (level * 0.003) : 0, // Increases with level
        tesla: level >= 10 ? 0.1 : 0 // Constant once unlocked
      };
      
      // Normalize probabilities for available towers
      const totalProb = availableTowers.reduce((acc, type) => acc + probabilities[type], 0);
      const normalizedProbs = availableTowers.map(type => probabilities[type] / totalProb);
      
      // Choose random tower type based on probabilities
      const rand = Math.random();
      let cumulativeProb = 0;
      
      for (let i = 0; i < availableTowers.length; i++) {
        cumulativeProb += normalizedProbs[i];
        if (rand <= cumulativeProb) {
          return availableTowers[i];
        }
      }
      
      return 'basic'; // Fallback
    };
    
    // Helper to check if position is too close to path
    const isTooCloseToPath = (position) => {
      return pathPoints.some(point => 
        BABYLON.Vector3.Distance(position, point) < minDistFromPath
      );
    };
    
    // Helper to check if position is too close to other towers
    const isTooCloseToTowers = (position) => {
      return towers.some(tower => 
        BABYLON.Vector3.Distance(position, tower.base.position) < minDistBetweenTowers
      );
    };
    
    // Try to create specified number of towers
    let attempts = 0;
    const maxAttempts = count * 10; // Limit attempts to avoid infinite loops
    
    while (towers.length < count && attempts < maxAttempts) {
      attempts++;
      
      // Generate random position within bounds
      const x = bounds.minX + Math.random() * (bounds.maxX - bounds.minX);
      const z = bounds.minZ + Math.random() * (bounds.maxZ - bounds.minZ);
      const position = new BABYLON.Vector3(x, 1, z);
      
      // Skip if too close to path or other towers
      if (isTooCloseToPath(position) || isTooCloseToTowers(position)) {
        continue;
      }
      
      // Create tower with random type based on level
      const towerType = getTowerType();
      const tower = new Tower(this.scene, position, this.eventEmitter, towerType);
      towers.push(tower);
    }
    
    return towers;
  }

  /**
   * Applies a level theme to the scene
   * @param {string} themeName - Name of the theme to apply ('desert', 'fog', 'storm')
   * @param {object} options - Additional theme options
   * @returns {object} - Theme modifier object with theme-specific game modifiers
   */
  applyLevelTheme(themeName, options = {}) {
    // Default values for ground and skybox
    const groundMesh = options.groundMesh || null;
    const groundColor = options.groundColor || new BABYLON.Color3(0.2, 0.8, 0.2);
    
    // Base modifiers (will be extended by specific themes)
    let modifiers = {
      bloonSpeedMultiplier: 1.0,
      towerRangeMultiplier: 1.0,
      towerCooldownMultiplier: 1.0,
      update: null, // Function called each frame
      cleanup: null // Function called when level ends
    };
    
    // Apply theme
    switch(themeName) {
      case 'desert':
        return this._applyDesertTheme(groundMesh, groundColor, modifiers);
      case 'fog':
        return this._applyFogTheme(groundMesh, groundColor, modifiers);
      case 'storm':
        return this._applyStormTheme(groundMesh, groundColor, modifiers);
      default:
        return modifiers;
    }
  }

  /**
   * Applies the desert theme
   * @private
   */
  _applyDesertTheme(groundMesh, groundColor, baseModifiers) {
    // Set desert sky color
    this.scene.clearColor = new BABYLON.Color3(0.8, 0.7, 0.5);
    
    // Update ground color
    if (groundMesh && groundMesh.material) {
      groundMesh.material.diffuseColor = new BABYLON.Color3(0.8, 0.7, 0.2);
    }
    
    // Create heat distortion effect (simplified for this example)
    // In a full implementation, this would use a post-process shader
    let time = 0;
    
    // Create dust particle system
    const dustSystem = new BABYLON.ParticleSystem("dust", 1000, this.scene);
    dustSystem.particleTexture = new BABYLON.Texture("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=="); // Placeholder
    dustSystem.emitter = new BABYLON.Vector3(0, 1, 0);
    dustSystem.minEmitBox = new BABYLON.Vector3(-15, 0, -15);
    dustSystem.maxEmitBox = new BABYLON.Vector3(15, 5, 15);
    dustSystem.color1 = new BABYLON.Color4(0.9, 0.8, 0.5, 0.1);
    dustSystem.color2 = new BABYLON.Color4(0.8, 0.7, 0.4, 0.2);
    dustSystem.minSize = 0.1;
    dustSystem.maxSize = 0.5;
    dustSystem.minLifeTime = 2;
    dustSystem.maxLifeTime = 5;
    dustSystem.emitRate = 1;
    dustSystem.start();
    
    // Return theme modifiers
    return {
      ...baseModifiers,
      bloonSpeedMultiplier: 0.8, // Bloons move slower in desert heat
      towerRangeMultiplier: 0.8, // Reduced visibility due to heat distortion
      towerCooldownMultiplier: 1.2, // Towers overheat and fire slower
      name: "Desert",
      update: (_, deltaTime) => {
        time += deltaTime / 1000;
        // In a full implementation, update heat distortion shader values here
      },
      cleanup: () => {
        dustSystem.dispose();
      }
    };
  }

  /**
   * Applies the fog theme
   * @private
   */
  _applyFogTheme(groundMesh, groundColor, baseModifiers) {
    // Set fog settings
    this.scene.fogMode = BABYLON.Scene.FOGMODE_EXP;
    this.scene.fogDensity = 0.02;
    this.scene.fogColor = new BABYLON.Color3(0.9, 0.9, 0.9);
    this.scene.clearColor = new BABYLON.Color3(0.8, 0.8, 0.8);
    
    // Update ground color
    if (groundMesh && groundMesh.material) {
      groundMesh.material.diffuseColor = new BABYLON.Color3(0.5, 0.5, 0.5);
    }
    
    // Create fog particle system
    const fogSystem = new BABYLON.ParticleSystem("fog", 5000, this.scene);
    const texture = new BABYLON.DynamicTexture("particleTexture", { width:4, height:4 }, this.scene);
const context = texture.getContext();
context.fillStyle = "white";
context.fillRect(0, 0, 4, 4);
texture.update();
fogSystem.particleTexture = texture;
fogSystem.blendMode = BABYLON.ParticleSystem.BLENDMODE_ADD;
    fogSystem.emitter = new BABYLON.Vector3(0, 0, 0);
    fogSystem.minEmitBox = new BABYLON.Vector3(-20, 0, -20);
    fogSystem.maxEmitBox = new BABYLON.Vector3(20, 3, 20);
    fogSystem.color1 = new BABYLON.Color4(0.9, 0.9, 0.9, 0.05);
    fogSystem.color2 = new BABYLON.Color4(0.8, 0.8, 0.8, 0.1);
    fogSystem.minSize = 0.5;
    fogSystem.maxSize = 1;
    fogSystem.alpha = 0.1;
    fogSystem.minLifeTime = 4;
    fogSystem.maxLifeTime = 8;
    fogSystem.emitRate = 1;
    fogSystem.start();
    
    // Return theme modifiers
    return {
      ...baseModifiers,
      towerRangeMultiplier: 0.6, // Significantly reduced range in fog
      bloonSpeedMultiplier: 1.0, // Normal speed
      towerCooldownMultiplier: 0.9, // Slightly faster firing (cool and humid)
      name: "Fog",
      cleanup: () => {
        fogSystem.dispose();
        texture.dispose();
        this.scene.fogMode = BABYLON.Scene.FOGMODE_NONE;
      }
    };
  }

  /**
   * Applies the storm theme
   * @private
   */
  _applyStormTheme(groundMesh, groundColor, baseModifiers) {
    // Set storm sky color
    this.scene.clearColor = new BABYLON.Color3(0.2, 0.2, 0.3);
    
    // Update ground color
    if (groundMesh && groundMesh.material) {
      groundMesh.material.diffuseColor = new BABYLON.Color3(0.3, 0.3, 0.3);
    }
    
    // Create lightning flash effect
    let lastFlash = 0;
    const originalLightIntensity = this.scene.lights[0]?.intensity || 1.0;
    
    // Create rain particle system
    const rainSystem = new BABYLON.ParticleSystem("rain", 5000, this.scene);
    const texture = new BABYLON.DynamicTexture("particleTexture", { width:4, height:4 }, this.scene);
const context = texture.getContext();
context.fillStyle = "white";
context.fillRect(0, 0, 4, 4);
texture.update();
rainSystem.particleTexture = texture;
rainSystem.blendMode = BABYLON.ParticleSystem.BLENDMODE_ADD;
    rainSystem.emitter = new BABYLON.Vector3(0, 15, 0);
    rainSystem.minEmitBox = new BABYLON.Vector3(-20, 0, -20);
    rainSystem.maxEmitBox = new BABYLON.Vector3(20, 0, 20);
    rainSystem.direction1 = new BABYLON.Vector3(-1, -10, 1);
    rainSystem.direction2 = new BABYLON.Vector3(1, -10, -1);
    rainSystem.minSize = 0.1;
    rainSystem.maxSize = 0.3;
    rainSystem.minLifeTime = 0.5;
    rainSystem.maxLifeTime = 1;
    rainSystem.emitRate = 1;
    rainSystem.start();
    
    // Return theme modifiers
    return {
      ...baseModifiers,
      bloonSpeedMultiplier: 1.1, // Slightly faster due to wind pushing
      towerRangeMultiplier: 0.8, // Reduced visibility in storm
      towerCooldownMultiplier: 1.2, // Slower firing in storm
      name: "Storm",
      update: (_, deltaTime, currentTime) => {
        // Random lightning flashes
        if (currentTime - lastFlash > 5000 + Math.random() * 10000) {
          // Increase light intensity for flash
          this.scene.lights.forEach(light => {
            light.intensity = originalLightIntensity * 2;
          });
          
          // Reset light after flash
          setTimeout(() => {
            this.scene.lights.forEach(light => {
              light.intensity = originalLightIntensity;
            });
          }, 100);
          
          lastFlash = currentTime;
        }
      },
      cleanup: () => {
        rainSystem.dispose();
        texture.dispose();
        this.scene.lights.forEach(light => {
          light.intensity = originalLightIntensity;
        });
      }
    };
  }

  /**
   * Selects a random theme for the level
   * @param {number} level - Current game level
   * @returns {string} - Theme name
   */
  selectRandomTheme(level) {
    const themes = ['desert', 'fog', 'storm'];
    
    // Special cases for specific levels
    if (level % 5 === 0) {
      // Every 5 levels use storm theme for increased challenge
      return 'storm';
    }
    
    return themes[Math.floor(Math.random() * themes.length)];
  }

  /**
   * Creates a complete level
   * @param {object} options - Level options
   * @param {number} options.level - Level number
   * @param {string} options.theme - Theme name (or 'random' for random theme)
   * @returns {object} - Level object with paths, towers, theme modifiers, etc.
   */
  createLevel(options = {}) {
    const {
      level = 1,
      theme = 'random'
    } = options;
    
    // Determine theme
    const actualTheme = theme === 'random' ? this.selectRandomTheme(level) : theme;
    
    // Generate path
    const pathComplexity = Math.min(5 + level * 0.3, 10); // Increase complexity with level
    const pathPoints = this.generateRandomPath({ complexity: pathComplexity });
    
    // Create path mesh
    const pathMesh = this.createPathMesh(pathPoints);
    
    // Create ground
    const ground = BABYLON.MeshBuilder.CreateGround(
      "ground",
      { width: 30, height: 30 },
      this.scene
    );
    const groundMaterial = new BABYLON.StandardMaterial("groundMat", this.scene);
    groundMaterial.diffuseColor = new BABYLON.Color3(0.2, 0.8, 0.2);
    ground.material = groundMaterial;
    
    // Generate towers
    const towerCount = Math.min(3 + Math.floor(level * 0.5), 10); // Cap at 10 towers
    const towers = this.generateTowers(pathPoints, {
      count: towerCount,
      level: level
    });
    
    // Apply theme
    const themeModifiers = this.applyLevelTheme(actualTheme, { groundMesh: ground });
    
    // Apply theme effects to towers
    towers.forEach(tower => {
      tower.range *= themeModifiers.towerRangeMultiplier;
      tower.shotCooldown *= themeModifiers.towerCooldownMultiplier;
    });
    
    // Calculate required bloons for this level
    const bloonsRequired = Math.min(Math.floor(2 + level * 1.5), 25); // Cap at 25
    
    return {
      level,
      theme: actualTheme,
      themeModifiers,
      pathPoints,
      pathMesh,
      ground,
      towers,
      bloonsRequired,
      cleanup: () => {
        // Clean up resources when level ends
        if (themeModifiers.cleanup) themeModifiers.cleanup();
        pathMesh.dispose();
        ground.dispose();
        towers.forEach(tower => tower.dispose());
      }
    };
  }
}

export default LevelGenerator;