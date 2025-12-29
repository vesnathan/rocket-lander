/**
 * @fileoverview Main game scene for Rocket Puzzle Lander.
 * Integrates all game systems: input, physics, hazards, and rendering.
 */

import * as Phaser from 'phaser';
import { BaseScene } from '../game/BaseScene';
import { RocketSprite, createRocketWithPlaceholder } from '../phaser/RocketSprite';
import { CollisionType, type LandingResult } from '../core/RocketController';
import { vec2 } from '../core/math';
import { InputManager, getInputManager } from '../input/InputManager';
import { createDefaultInputState, type InputState } from '../input/InputState';
import type { Level } from '@shared/types/Level';
import { getLevel, TOTAL_LEVELS } from '../levels/levels';
import {
  renderTerrain,
  renderLandingPad,
  renderMultiplierBubble,
  renderSpawnBubble,
  renderLaserField,
  renderBubbleGun,
  renderWarpZone,
  renderGravityWell,
  ENTITY_COLORS,
} from '../rendering/EntityRenderer';

/**
 * Game state enumeration.
 */
export enum GameState {
  Loading = 'loading',
  Ready = 'ready',
  Playing = 'playing',
  Landed = 'landed',
  Crashed = 'crashed',
  Paused = 'paused',
}

/**
 * Main game scene.
 *
 * This scene handles:
 * - Level loading and rendering
 * - Rocket control and physics
 * - Collision detection
 * - Win/lose conditions
 * - UI overlay coordination
 */
export class GameScene extends BaseScene {
  /** Current game state */
  private gameState: GameState = GameState.Loading;

  /** The player's rocket */
  private rocket: RocketSprite | null = null;

  /** Input manager reference */
  private inputManager: InputManager | null = null;

  /** Current input state */
  private currentInput: InputState = createDefaultInputState();

  /** Current level data */
  private currentLevel: Level | null = null;

  /** Current level number (1-based) */
  private levelNumber = 1;

  /** Landing pads group */
  private landingPads: Phaser.Physics.Arcade.StaticGroup | null = null;

  /** Terrain group */
  private terrain: Phaser.Physics.Arcade.StaticGroup | null = null;

  /** Hazards group */
  private hazards: Phaser.Physics.Arcade.Group | null = null;

  /** Active physics colliders */
  private colliders: Phaser.Physics.Arcade.Collider[] = [];

  /** UI text elements */
  private stateText: Phaser.GameObjects.Text | null = null;
  private hintText: Phaser.GameObjects.Text | null = null;
  private stageTimerText: Phaser.GameObjects.Text | null = null;
  private gameTimerText: Phaser.GameObjects.Text | null = null;
  private scoreText: Phaser.GameObjects.Text | null = null;

  /** Speedrun timers (in milliseconds) */
  private stageTime: number = 0;
  private gameTime: number = 0;
  private static totalGameTime: number = 0; // Persists across levels

  /** Score tracking */
  private levelScore: number = 0;
  private static totalScore: number = 0; // Persists across levels

  /** Lives system */
  private static lives: number = 5; // Start with 5 lives
  private livesContainer: Phaser.GameObjects.Container | null = null;

  /** High score storage key prefix */
  private static readonly HIGH_SCORE_KEY = 'rocketLander_highScore_';
  private static readonly TOTAL_HIGH_SCORE_KEY = 'rocketLander_totalHighScore';
  private static readonly BEST_TIME_KEY = 'rocketLander_bestTime_';
  private static readonly GAME_LEADERBOARD_KEY = 'rocketLander_gameLeaderboard';

  /** Score multiplier (starts at 1.0, increases by collecting multiplier bubbles) */
  private scoreMultiplier: number = 1.0;
  private multiplierBubbles: Phaser.GameObjects.Container[] = [];

  /** Hurry up! chase ships (like Baron Von Blubba in Bubble Bobble) */
  private hurryUpTime: number = 45000; // 45 seconds before chase ships spawn
  private hurryUpWarningTime: number = 40000; // Warning at 40 seconds
  private hurryUpActive: boolean = false;
  private hurryUpWarningShown: boolean = false;
  private chaseShips: { sprite: Phaser.GameObjects.Sprite; glow: Phaser.GameObjects.Arc }[] = [];

  /** Loading flag to prevent double loads */
  private isLoadingLevel = false;

  /** Flag to pause timers when showing level complete screen */
  private showingLevelComplete = false;

  /** Legacy bubble references (now using encapsulatingBubble system) */
  private bubble: Phaser.GameObjects.Arc | null = null;
  private bubbleGlow: Phaser.GameObjects.Arc | null = null;

  /** Bubble guns array */
  private bubbleGuns: Phaser.GameObjects.Container[] = [];
  /** Active bubble projectiles */
  private bubbleProjectiles: Phaser.GameObjects.Arc[] = [];
  /** Rocket encapsulated in bubble (includes spawn bubble) */
  private encapsulatingBubble: {
    bubble: Phaser.GameObjects.Arc;
    glow: Phaser.GameObjects.Arc;
    type: 'blue' | 'green' | 'white';
    duration: number;
    elapsed: number;
    vx: number;
    vy: number;
    wobble: number;
    isSpawnBubble?: boolean; // Spawn bubbles don't auto-pop
  } | null = null;

  /** Warp zones map by ID */
  private warpZones: Map<string, {
    container: Phaser.GameObjects.Container;
    x: number;
    y: number;
    width: number;
    height: number;
    targetId: string;
  }> = new Map();
  /** Warp cooldown to prevent instant re-warping */
  private warpCooldown = 0;

  /** Gravity wells */
  private gravityWells: {
    x: number;
    y: number;
    radius: number;
    strength: number;
    affectsRocket: boolean;
    affectsBubble: boolean;
    visual: Phaser.GameObjects.Container;
  }[] = [];

  /** Test mode: level provided directly for testing */
  private testLevel: Level | null = null;
  /** Test mode: flag indicating we're in test mode */
  private isTestMode: boolean = false;
  /** Test mode: editor state to restore when returning to editor */
  private editorState: any = null;

  /** Game over overlay container */
  private gameOverContainer: Phaser.GameObjects.Container | null = null;

  constructor() {
    super('GameScene', 200);
  }

  /**
   * Preload game assets.
   */
  preload(): void {
    super.preload();

    // Assets will be loaded here
    // For now, we use placeholder graphics created at runtime
  }

  /** Background elements container */
  private backgroundElements: Phaser.GameObjects.GameObject[] = [];

  /** Level visual elements (decorations not in physics groups) */
  private levelVisuals: Phaser.GameObjects.GameObject[] = [];

  /** Markers that fade when game starts (LAND indicators, etc) */
  private fadeOnStartMarkers: Phaser.GameObjects.GameObject[] = [];

  /** Shooting star timer event */
  private shootingStarEvent: Phaser.Time.TimerEvent | null = null;

  /**
   * Initialize scene with data.
   */
  init(data?: { testLevel?: Level; startLevel?: number; isTestMode?: boolean; editorState?: any }): void {
    // Reset loading flag to ensure clean start
    this.isLoadingLevel = false;

    // Reset UI text references (they get destroyed on scene restart)
    this.stateText = null;
    this.hintText = null;
    this.stageTimerText = null;
    this.gameTimerText = null;
    this.scoreText = null;

    // Reset physics groups (destroyed on scene restart)
    this.terrain = null;
    this.landingPads = null;
    this.hazards = null;
    this.colliders = [];

    // Reset game object arrays
    this.multiplierBubbles = [];
    this.chaseShips = [];
    this.bubbleGuns = [];
    this.bubbleProjectiles = [];
    this.backgroundElements = [];
    this.levelVisuals = [];
    this.fadeOnStartMarkers = [];
    this.warpZones.clear();
    this.gravityWells = [];

    // Reset bubble effects
    this.bubble = null;
    this.bubbleGlow = null;
    this.encapsulatingBubble = null;

    // Reset rocket reference
    this.rocket = null;

    // Reset timers
    this.shootingStarEvent = null;

    // Check for test mode - first from passed data, then from sessionStorage
    if (data?.testLevel) {
      this.testLevel = data.testLevel;
      this.isTestMode = data.isTestMode ?? true;
      this.editorState = data.editorState ?? null;
    } else {
      // Check sessionStorage for test level (set by editor's TEST button)
      const testData = this.getTestLevelFromStorage();
      if (testData) {
        this.testLevel = testData.level;
        this.isTestMode = true;
        this.editorState = testData.editorState ?? null;
      } else {
        this.testLevel = null;
        this.isTestMode = false;
        this.editorState = null;
      }
    }
  }

  /**
   * Check for test level in sessionStorage (set by editor's TEST button).
   */
  private getTestLevelFromStorage(): { level: Level; editorState?: any } | null {
    if (typeof window === 'undefined') return null;

    const data = sessionStorage.getItem('testLevel');
    if (!data) return null;

    try {
      const parsed = JSON.parse(data);
      // Clear it after reading so refreshing the page doesn't re-enter test mode
      sessionStorage.removeItem('testLevel');
      return parsed;
    } catch {
      return null;
    }
  }

  /**
   * Create the game scene.
   */
  create(): void {
    super.create();

    // Initialize input manager
    this.initializeInput();

    // Load level - either test level or from level number
    if (this.isTestMode && this.testLevel) {
      this.loadTestLevel(this.testLevel);
    } else {
      const startLevel = this.data?.get('startLevel') ?? 1;
      this.loadLevel(startLevel);
    }

    // Create UI
    this.createUI();

    // Dev shortcuts: number keys to jump to levels (disabled in test mode)
    if (!this.isTestMode) {
      this.setupDevShortcuts();
    }

    // Test mode: add ESC key to exit
    if (this.isTestMode) {
      this.setupTestModeUI();
    }

    this.gameState = GameState.Ready;
  }

  /**
   * Set up test mode with ESC key handler.
   */
  private setupTestModeUI(): void {
    // ESC key to exit test and return to editor
    this.input.keyboard?.on('keydown-ESC', () => {
      this.returnToEditor();
    });

    // Minimal hint in top-right corner (subtle, doesn't interfere)
    const width = Number(this.game.config.width);
    this.add.text(width - 10, 8, 'ESC to exit', {
      fontSize: '9px',
      color: '#666666',
      fontFamily: 'monospace',
    }).setOrigin(1, 0).setScrollFactor(0).setDepth(50).setAlpha(0.6);
  }

  /**
   * Return to level editor page with saved state.
   */
  private returnToEditor(): void {
    if (!this.isTestMode) return;

    // Store editor state in sessionStorage for the editor page to restore
    if (this.editorState) {
      sessionStorage.setItem('editorState', JSON.stringify(this.editorState));
    }

    // Navigate back to editor page
    window.location.href = '/editor';
  }

  /**
   * Set up development shortcuts for level jumping.
   */
  private setupDevShortcuts(): void {
    // Keys 1-9 for levels 1-9, 0 for level 10
    for (let i = 0; i <= 9; i++) {
      const levelNum = i === 0 ? 10 : i;
      const keyName = `keydown-${i === 0 ? 'ZERO' : ['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE'][i - 1]}`;
      this.input.keyboard?.on(keyName, () => {
        this.loadLevel(levelNum);
      });
    }
  }

  /**
   * Create animated starfield background.
   * For scrolling levels, stars cover the full level height with parallax effect.
   */
  private createStarfield(): void {
    // Clear previous background elements
    for (const elem of this.backgroundElements) {
      elem.destroy();
    }
    this.backgroundElements = [];

    const screenWidth = Number(this.game.config.width);
    const screenHeight = Number(this.game.config.height);

    // Use level bounds for scrolling levels, or screen size for non-scrolling
    const bounds = this.currentLevel?.bounds;
    const worldHeight = bounds ? (bounds.maxY - bounds.minY) : screenHeight;
    const worldMinY = bounds?.minY ?? 0;
    const isScrolling = worldHeight > screenHeight;

    // Calculate star density based on level height
    const baseStarCount = 100;
    const starCount = Math.floor(baseStarCount * (worldHeight / screenHeight));
    const coloredStarCount = Math.floor(10 * (worldHeight / screenHeight));

    // Create stars at different depths with parallax for scrolling levels
    for (let i = 0; i < starCount; i++) {
      const x = Math.random() * screenWidth;
      const y = worldMinY + Math.random() * worldHeight;
      const size = Math.random() < 0.7 ? 1 : 2;
      const alpha = 0.3 + Math.random() * 0.7;

      const star = this.add.circle(x, y, size, 0xffffff, alpha);
      star.setDepth(-10);

      // Parallax scrolling - distant stars move slower
      if (isScrolling) {
        // Random parallax factor between 0.3 and 0.8 for depth effect
        const parallax = 0.3 + Math.random() * 0.5;
        star.setScrollFactor(1, parallax);
      }

      this.backgroundElements.push(star);

      // Twinkle animation for some stars
      if (Math.random() < 0.3) {
        this.tweens.add({
          targets: star,
          alpha: alpha * 0.3,
          duration: 1000 + Math.random() * 2000,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
      }
    }

    // Add a few colored stars
    for (let i = 0; i < coloredStarCount; i++) {
      const x = Math.random() * screenWidth;
      const y = worldMinY + Math.random() * worldHeight;
      const colors = [0xffcccc, 0xccccff, 0xffffcc, 0xccffff];
      const color = colors[Math.floor(Math.random() * colors.length)];

      const star = this.add.circle(x, y, 1.5, color, 0.6);
      star.setDepth(-10);

      // Parallax for colored stars too
      if (isScrolling) {
        const parallax = 0.3 + Math.random() * 0.5;
        star.setScrollFactor(1, parallax);
      }

      this.backgroundElements.push(star);
    }

    // Start shooting star timer
    this.startShootingStars();
  }

  /**
   * Start occasional shooting stars.
   */
  private startShootingStars(): void {
    // Clear any existing timer
    if (this.shootingStarEvent) {
      this.shootingStarEvent.destroy();
      this.shootingStarEvent = null;
    }

    // Use a looping timer instead of chained delayedCalls
    this.shootingStarEvent = this.time.addEvent({
      delay: 4000,
      callback: () => this.createShootingStar(),
      loop: true,
    });
  }

  /**
   * Create a single shooting star animation.
   */
  private createShootingStar(): void {
    const width = Number(this.game.config.width);
    const height = Number(this.game.config.height);

    // Start from random position on top or left edge
    const fromLeft = Math.random() < 0.5;
    const startX = fromLeft ? -10 : Math.random() * width * 0.7;
    const startY = fromLeft ? Math.random() * height * 0.5 : -10;

    // End position - diagonal streak
    const endX = startX + 150 + Math.random() * 200;
    const endY = startY + 100 + Math.random() * 150;

    // Create the shooting star head
    const star = this.add.circle(startX, startY, 2, 0xffffff, 1);
    star.setDepth(-5);

    // Create tail segments
    const tailLength = 8;
    const tail: Phaser.GameObjects.Arc[] = [];
    for (let i = 0; i < tailLength; i++) {
      const segment = this.add.circle(startX, startY, 1.5 - i * 0.15, 0xffffff, 0.8 - i * 0.1);
      segment.setDepth(-5);
      tail.push(segment);
    }

    // Animate the shooting star
    const duration = 400 + Math.random() * 300;
    this.tweens.add({
      targets: star,
      x: endX,
      y: endY,
      duration,
      ease: 'Quad.easeIn',
      onUpdate: () => {
        // Update tail to follow
        let prevX = star.x;
        let prevY = star.y;
        const dx = (endX - startX) / 20;
        const dy = (endY - startY) / 20;
        for (let i = 0; i < tail.length; i++) {
          tail[i].setPosition(prevX - dx * (i + 1), prevY - dy * (i + 1));
        }
      },
      onComplete: () => {
        // Fade out and destroy
        this.tweens.add({
          targets: [star, ...tail],
          alpha: 0,
          duration: 100,
          onComplete: () => {
            star.destroy();
            tail.forEach(t => t.destroy());
          },
        });
      },
    });
  }

  /**
   * Initialize the input system.
   */
  private async initializeInput(): Promise<void> {
    this.inputManager = getInputManager();
    await this.inputManager.initialize();
  }

  /**
   * Load a level by number.
   */
  loadLevel(levelNumber: number): void {
    // Prevent double loads
    if (this.isLoadingLevel) {
      return;
    }
    this.isLoadingLevel = true;

    // Validate level number
    if (levelNumber < 1 || levelNumber > TOTAL_LEVELS) {
      console.error(`Invalid level number: ${levelNumber}`);
      this.isLoadingLevel = false;
      return;
    }

    this.levelNumber = levelNumber;
    this.currentLevel = getLevel(levelNumber) ?? null;

    if (!this.currentLevel) {
      console.error(`Level ${levelNumber} not found`);
      this.isLoadingLevel = false;
      return;
    }

    // Reset lives and score when starting level 1
    if (levelNumber === 1) {
      GameScene.resetLives();
      GameScene.totalScore = 0;
    }

    // Clear existing objects
    this.clearLevel();

    // Reset flags
    this.showingLevelComplete = false;

    // Reset stage timer for this level
    this.stageTime = 0;
    if (this.stageTimerText) {
      this.stageTimerText.setColor('#ffffff');
    }

    // Reset score multiplier for this level
    this.scoreMultiplier = 1.0;

    // Update score display
    if (this.scoreText) {
      this.scoreText.setText(GameScene.totalScore.toString());
    }

    // Update lives display
    this.updateLivesDisplay();


    // Create starfield background
    this.createStarfield();

    // Set gravity from level
    this.setGravity(this.currentLevel.gravity);

    // Create terrain
    this.createTerrain();

    // Create landing pads
    this.createLandingPads();

    // Create hazards
    this.createHazards();

    // Create multiplier bubbles
    this.createMultiplierBubbles();

    // Create rocket at spawn point
    this.createRocket();

    // Set up collisions
    this.setupCollisions();

    // Set up camera for scrolling levels
    this.setupCamera();

    this.gameState = GameState.Ready;
    this.isLoadingLevel = false;

    // Show level name intro
    this.showLevelIntro(this.currentLevel.name, levelNumber);

    // Dispatch event for dev UI (hint display)
    window.dispatchEvent(
      new CustomEvent('levelChange', {
        detail: {
          level: levelNumber,
          hint: this.currentLevel.hint || '',
          name: this.currentLevel.name,
        },
      })
    );
  }

  /**
   * Create lives display in top right corner.
   */
  private createLivesDisplay(): void {
    const width = Number(this.game.config.width);

    // Destroy existing container if it exists
    if (this.livesContainer) {
      this.livesContainer.destroy();
    }

    this.livesContainer = this.add.container(width - 10, 18);
    this.livesContainer.setScrollFactor(0);
    this.livesContainer.setDepth(100);

    this.updateLivesDisplay();
  }

  /**
   * Update lives display to show current number of lives.
   */
  private updateLivesDisplay(): void {
    if (!this.livesContainer) return;

    // Clear existing rockets
    this.livesContainer.removeAll(true);

    // Draw rocket icons for each life (right to left)
    const rocketSpacing = 18;
    for (let i = 0; i < GameScene.lives; i++) {
      const x = -i * rocketSpacing;
      const rocket = this.createMiniRocket(x, 0);
      this.livesContainer.add(rocket);
    }
  }

  /**
   * Create a mini rocket sprite for lives display (half size of game rocket).
   */
  private createMiniRocket(x: number, y: number): Phaser.GameObjects.Sprite {
    // Use the same 'rocket' texture as the game, but at half the game scale (0.5 * 0.5 = 0.25)
    const rocket = this.add.sprite(x, y, 'rocket');
    rocket.setScale(0.25);
    return rocket;
  }

  /**
   * Reset lives to starting amount.
   */
  private static resetLives(): void {
    GameScene.lives = 5;
  }

  /**
   * Lose a life. Returns true if game over (no lives left).
   */
  private loseLife(): boolean {
    GameScene.lives--;
    this.updateLivesDisplay();
    return GameScene.lives <= 0;
  }

  /**
   * Show animated level name intro.
   */
  private showLevelIntro(levelName: string, levelNumber: number): void {
    const width = Number(this.game.config.width);
    const height = Number(this.game.config.height);
    const centerX = width / 2;
    const centerY = height / 2;

    // Level number text (small, above name)
    const levelNumText = this.add.text(centerX, centerY - 30, `LEVEL ${levelNumber}`, {
      fontFamily: 'monospace',
      fontSize: '14px',
      color: '#888888',
    });
    levelNumText.setOrigin(0.5);
    levelNumText.setDepth(200);
    levelNumText.setAlpha(0);

    // Level name text (large, center)
    const nameText = this.add.text(centerX, centerY, levelName.toUpperCase(), {
      fontFamily: 'monospace',
      fontSize: '24px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 4,
    });
    nameText.setOrigin(0.5);
    nameText.setDepth(200);
    nameText.setAlpha(0);
    nameText.setScale(0.5);

    // Decorative lines
    const lineLeft = this.add.rectangle(centerX - 150, centerY, 80, 2, 0x4488ff);
    lineLeft.setDepth(200);
    lineLeft.setAlpha(0);
    lineLeft.setScale(0, 1);

    const lineRight = this.add.rectangle(centerX + 150, centerY, 80, 2, 0x4488ff);
    lineRight.setDepth(200);
    lineRight.setAlpha(0);
    lineRight.setScale(0, 1);

    // Animate in
    this.tweens.add({
      targets: [levelNumText],
      alpha: 1,
      duration: 300,
      ease: 'Power2',
    });

    this.tweens.add({
      targets: nameText,
      alpha: 1,
      scale: 1,
      duration: 500,
      ease: 'Back.easeOut',
    });

    this.tweens.add({
      targets: [lineLeft, lineRight],
      alpha: 1,
      scaleX: 1,
      duration: 400,
      delay: 200,
      ease: 'Power2',
    });

    // Hold for a moment then fade out
    this.time.delayedCall(1500, () => {
      this.tweens.add({
        targets: [levelNumText, nameText, lineLeft, lineRight],
        alpha: 0,
        y: '-=20',
        duration: 400,
        ease: 'Power2',
        onComplete: () => {
          levelNumText.destroy();
          nameText.destroy();
          lineLeft.destroy();
          lineRight.destroy();
        },
      });
    });
  }

  /**
   * Load a test level directly from a Level object.
   * Used by the Level Editor for play testing.
   */
  loadTestLevel(level: Level): void {
    // Prevent double loads
    if (this.isLoadingLevel) {
      return;
    }
    this.isLoadingLevel = true;

    this.levelNumber = level.levelNumber ?? 99;
    this.currentLevel = level;

    // Clear existing objects
    this.clearLevel();

    // Reset stage timer for this level
    this.stageTime = 0;
    if (this.stageTimerText) {
      this.stageTimerText.setColor('#ffffff');
    }

    // Reset score multiplier for this level
    this.scoreMultiplier = 1.0;

    // Update level badge

    // Create starfield background
    this.createStarfield();

    // Set gravity from level
    this.setGravity(this.currentLevel.gravity);

    // Create terrain
    this.createTerrain();

    // Create landing pads
    this.createLandingPads();

    // Create hazards
    this.createHazards();

    // Create multiplier bubbles
    this.createMultiplierBubbles();

    // Create rocket at spawn point
    this.createRocket();

    // Set up collisions
    this.setupCollisions();

    // Set up camera for scrolling levels
    this.setupCamera();

    this.gameState = GameState.Ready;
    this.isLoadingLevel = false;

    // Dispatch event for dev UI
    window.dispatchEvent(
      new CustomEvent('levelChange', {
        detail: {
          level: this.levelNumber,
          hint: level.hint || 'Test Level',
          name: level.name,
        },
      })
    );
  }

  /**
   * Clear all level objects.
   */
  private clearLevel(): void {
    // Remove all keyboard listeners first to prevent stacking
    this.input.keyboard?.removeAllListeners('keydown-N');

    // Destroy all physics colliders
    for (const collider of this.colliders) {
      collider.destroy();
    }
    this.colliders = [];

    // Stop all tweens targeting level objects
    this.tweens.killAll();

    // Clear game over overlay
    if (this.gameOverContainer) {
      this.gameOverContainer.destroy();
      this.gameOverContainer = null;
    }

    // Clear bubble
    if (this.bubble) {
      this.bubble.destroy();
      this.bubble = null;
    }
    if (this.bubbleGlow) {
      this.bubbleGlow.destroy();
      this.bubbleGlow = null;
    }

    if (this.rocket) {
      this.rocket.destroy();
      this.rocket = null;
    }

    if (this.landingPads) {
      try {
        if (this.landingPads.children) {
          this.landingPads.clear(true, true);
        }
        this.landingPads.destroy(true);
      } catch (e) {
        // Group already destroyed
      }
      this.landingPads = null;
    }

    if (this.terrain) {
      try {
        if (this.terrain.children) {
          this.terrain.clear(true, true);
        }
        this.terrain.destroy(true);
      } catch (e) {
        // Group already destroyed
      }
      this.terrain = null;
    }

    if (this.hazards) {
      try {
        if (this.hazards.children) {
          this.hazards.clear(true, true);
        }
        this.hazards.destroy(true);
      } catch (e) {
        // Group already destroyed
      }
      this.hazards = null;
    }

    // Clear all decorative level visuals
    for (const obj of this.levelVisuals) {
      obj.destroy();
    }
    this.levelVisuals = [];

    // Clear fade markers (they're also in levelVisuals, just clear the array)
    this.fadeOnStartMarkers = [];

    // Clear bubble guns (they're in levelVisuals but clear the array)
    this.bubbleGuns = [];

    // Clear bubble projectiles
    for (const bubble of this.bubbleProjectiles) {
      bubble.destroy();
    }
    this.bubbleProjectiles = [];

    // Clear encapsulating bubble
    if (this.encapsulatingBubble) {
      this.encapsulatingBubble.bubble.destroy();
      this.encapsulatingBubble.glow.destroy();
      this.encapsulatingBubble = null;
    }

    // Clear warp zones
    this.warpZones.clear();
    this.warpCooldown = 0;

    // Clear gravity wells (visuals are in levelVisuals)
    this.gravityWells = [];

    // Clear multiplier bubbles
    for (const bubble of this.multiplierBubbles) {
      bubble.destroy();
    }
    this.multiplierBubbles = [];

    // Clean up chase ships and reset hurry up state
    this.cleanupChaseShips();
  }

  /**
   * Create terrain from level data.
   */
  private createTerrain(): void {
    if (!this.currentLevel) return;

    this.terrain = this.physics.add.staticGroup();

    // Create terrain as rocky asteroids/outcrops
    for (const block of this.currentLevel.terrain) {
      const cx = block.x + block.width / 2;
      const cy = block.y + block.height / 2;

      // Invisible hitbox for physics (rectangular for reliable collision)
      const hitbox = this.add.rectangle(
        cx, cy,
        block.width, block.height,
        0x000000, 0
      );
      this.terrain.add(hitbox);

      // Create rocky visual overlay
      this.createRockyTerrain(block.x, block.y, block.width, block.height);
    }
  }

  /**
   * Create terrain visuals.
   * Thin walls/floors are simple lines, larger blocks are stage platforms with truss.
   */
  private createRockyTerrain(x: number, y: number, width: number, height: number): void {
    // Use shared renderer for consistent terrain visuals
    const container = renderTerrain(this, x, y, width, height);
    container.setDepth(1);
    this.levelVisuals.push(container);
  }

  /**
   * Create landing pads from level data.
   */
  private createLandingPads(): void {
    if (!this.currentLevel) return;

    this.landingPads = this.physics.add.staticGroup();

    for (const pad of this.currentLevel.landingPads) {
      const cx = pad.x + pad.width / 2;
      const cy = pad.y + pad.height / 2;

      // Container for all pad elements to float together
      const padElements: Phaser.GameObjects.GameObject[] = [];

      // Use shared renderer for consistent visuals
      const { container: padContainer, lights } = renderLandingPad(
        this, pad.x, pad.y, pad.width, pad.height, pad.primary
      );
      padContainer.setDepth(2);
      this.levelVisuals.push(padContainer);
      padElements.push(padContainer);

      // Add animated glow pulse (separate from container for pulse effect)
      const glow = this.add.rectangle(
        cx, cy,
        pad.width + 8, pad.height + 4,
        ENTITY_COLORS.padGlow, 0.15
      );
      glow.setDepth(0);
      this.levelVisuals.push(glow);
      padElements.push(glow);

      this.tweens.add({
        targets: glow,
        alpha: 0.05,
        scaleX: 1.05,
        scaleY: 1.2,
        duration: 1500,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });

      // Blinking lights animation
      this.tweens.add({
        targets: lights,
        alpha: 0.3,
        duration: 600,
        yoyo: true,
        repeat: -1,
      });

      // Physics hitbox - extends above pad to catch rocket early
      const topHitbox = this.add.rectangle(
        cx, pad.y - 10,  // Positioned above the pad surface
        pad.width - 4, 20,   // Tall enough to catch the rocket
        ENTITY_COLORS.padGlow, 0     // Invisible
      );
      this.landingPads.add(topHitbox);

      // Side/bottom collision boxes - hitting these = crash (added to terrain)
      const leftSide = this.add.rectangle(
        pad.x + 2, cy + 3,
        4, pad.height - 6,
        0x000000, 0
      );
      this.terrain?.add(leftSide);

      const rightSide = this.add.rectangle(
        pad.x + pad.width - 2, cy + 3,
        4, pad.height - 6,
        0x000000, 0
      );
      this.terrain?.add(rightSide);

      const bottom = this.add.rectangle(
        cx, pad.y + pad.height - 2,
        pad.width - 8, 4,
        0x000000, 0
      );
      this.terrain?.add(bottom);

      // "LAND" indicator with better styling
      const label = this.add.text(cx, pad.y - 16, '▼ LAND ▼', {
        fontSize: '10px',
        color: '#00ff44',
        fontFamily: 'monospace',
      });
      label.setOrigin(0.5);
      label.setDepth(10);
      this.levelVisuals.push(label);
      this.fadeOnStartMarkers.push(label);
      padElements.push(label);

      // Floating animation for entire pad (subtle up/down)
      this.tweens.add({
        targets: padElements,
        y: '+=4',
        duration: 2000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });

      // Floating animation for label (additional movement)
      this.tweens.add({
        targets: label,
        y: pad.y - 20,
        duration: 1000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
  }

  /**
   * Create hazards from level data.
   */
  private createHazards(): void {
    if (!this.currentLevel) return;

    this.hazards = this.physics.add.group();

    for (const hazard of this.currentLevel.hazards || []) {
      if (hazard.type === 'patrolShip') {
        this.createMovingColumn(hazard);
      } else if (hazard.type === 'laserField') {
        this.createLaser(hazard);
      } else if (hazard.type === 'bubbleGun') {
        this.createBubbleGun(hazard);
      } else if (hazard.type === 'warpZone') {
        this.createWarpZone(hazard);
      } else if (hazard.type === 'gravityWell') {
        this.createGravityWell(hazard);
      }
    }
  }

  /**
   * Create multiplier bubbles from level data.
   * These floating bubbles increase the score multiplier when collected.
   */
  private createMultiplierBubbles(): void {
    if (!this.currentLevel?.multiplierBubbles) return;

    const hexRadius = 18;

    for (const bubbleDef of this.currentLevel.multiplierBubbles) {
      // Use shared renderer for consistent visuals
      const container = renderMultiplierBubble(
        this,
        bubbleDef.value,
        bubbleDef.color ?? 'gold'
      );
      container.setPosition(bubbleDef.x, bubbleDef.y);
      container.setDepth(1); // Behind terrain and other items

      // Get the glow graphics for animation (stored by shared renderer)
      const glowGraphics = container.getData('glow') as Phaser.GameObjects.Graphics;

      // Store bubble data
      container.setData('id', bubbleDef.id);
      container.setData('value', bubbleDef.value);
      container.setData('baseY', bubbleDef.y);
      container.setData('collected', false);
      container.setData('group', bubbleDef.group ?? null);

      // Add physics body to container
      this.physics.add.existing(container);
      const body = container.body as Phaser.Physics.Arcade.Body;
      body.setAllowGravity(false);
      body.setCircle(hexRadius, -hexRadius, -hexRadius);

      this.multiplierBubbles.push(container);
      this.levelVisuals.push(container);

      // Add floating animation
      this.tweens.add({
        targets: container,
        y: bubbleDef.y - 5,
        duration: 1000 + Math.random() * 500,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });

      // Add pulsing glow effect
      if (glowGraphics) {
        this.tweens.add({
          targets: glowGraphics,
          alpha: 0.5,
          scaleX: 1.15,
          scaleY: 1.15,
          duration: 800,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
      }
    }
  }

  /**
   * Collect a multiplier bubble.
   */
  private collectMultiplierBubble(bubble: Phaser.GameObjects.Container): void {
    if (bubble.getData('collected')) return;
    bubble.setData('collected', true);

    const value = bubble.getData('value') as number;
    const group = bubble.getData('group') as string | null;

    // Add to multiplier
    this.scoreMultiplier += value;

    // Show "+0.5x" text floating up
    const text = this.add.text(bubble.x, bubble.y - 20, `+${value}x`, {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#ffd700',
      stroke: '#000000',
      strokeThickness: 2,
    });
    text.setOrigin(0.5);
    text.setDepth(100);

    // Animate text floating up and fading
    this.tweens.add({
      targets: text,
      y: bubble.y - 50,
      alpha: 0,
      duration: 800,
      ease: 'Power2',
      onComplete: () => text.destroy(),
    });

    // Pop effect on container
    this.tweens.add({
      targets: bubble,
      scaleX: 1.5,
      scaleY: 1.5,
      alpha: 0,
      duration: 200,
      onComplete: () => {
        bubble.destroy();
        // Remove from array
        const index = this.multiplierBubbles.indexOf(bubble);
        if (index > -1) {
          this.multiplierBubbles.splice(index, 1);
        }
      },
    });

    // If this bubble has a group, fade out other bubbles in the same group
    if (group) {
      this.removeMultiplierGroup(group, bubble);
    }
  }

  /**
   * Remove all multiplier bubbles in a group (except the one being collected).
   */
  private removeMultiplierGroup(group: string, exceptBubble: Phaser.GameObjects.Container): void {
    const toRemove = this.multiplierBubbles.filter(
      b => b !== exceptBubble && b.getData('group') === group && !b.getData('collected')
    );

    for (const bubble of toRemove) {
      bubble.setData('collected', true);

      // Fade out with a subtle effect
      this.tweens.add({
        targets: bubble,
        alpha: 0,
        scaleX: 0.5,
        scaleY: 0.5,
        duration: 300,
        ease: 'Power2',
        onComplete: () => {
          bubble.destroy();
          const index = this.multiplierBubbles.indexOf(bubble);
          if (index > -1) {
            this.multiplierBubbles.splice(index, 1);
          }
        },
      });
    }
  }

  /**
   * Create a moving column hazard (patrol ship).
   * Simple behavior: move, hit terrain = bounce, exit screen = wrap
   */
  private createMovingColumn(hazard: {
    x: number;
    y: number;
    width: number;
    height: number;
    speed: number;
    startDirection?: number;
  }): void {
    // Create patrol ship texture if it doesn't exist
    const textureKey = 'patrolShip';
    if (!this.textures.exists(textureKey)) {
      this.createPatrolShipTexture(textureKey);
    }

    const startDirection = hazard.startDirection || 1;
    const shipX = hazard.x + hazard.width / 2;

    // Create sprite for the patrol ship
    const shipSprite = this.add.sprite(shipX, hazard.y, textureKey);
    shipSprite.setScale(0.6);
    shipSprite.setRotation(startDirection === 1 ? 0 : Math.PI);
    shipSprite.setDepth(5);

    // Create engine glow effect
    const engineGlow = this.add.ellipse(
      shipX,
      hazard.y + (startDirection === 1 ? -15 : 15),
      8, 12,
      0x44aaff, 0.8
    );
    engineGlow.setDepth(4);

    // Create hitbox rectangle (invisible, for physics)
    const hitbox = this.add.rectangle(
      shipX,
      hazard.y,
      hazard.width * 0.7,
      hazard.height * 0.7,
      0xff0000, 0
    );
    this.hazards?.add(hitbox);

    // Configure physics body
    const body = hitbox.body as Phaser.Physics.Arcade.Body;
    if (body) {
      body.setAllowGravity(false);
      body.setImmovable(true);
    }

    // Store ship dimensions and properties
    hitbox.setData('shipWidth', hazard.width);
    hitbox.setData('shipHeight', hazard.height);
    hitbox.setData('maxSpeed', hazard.speed);
    hitbox.setData('currentSpeed', hazard.speed);
    hitbox.setData('direction', startDirection);
    hitbox.setData('isPatrolShip', true);
    hitbox.setData('shipSprite', shipSprite);
    hitbox.setData('engineGlow', engineGlow);

    // State machine: 'patrol' | 'slowing' | 'turning' | 'accelerating'
    hitbox.setData('state', 'patrol');
    hitbox.setData('turnProgress', 0);

    // Store visuals for cleanup
    this.levelVisuals.push(shipSprite);
    this.levelVisuals.push(engineGlow);
  }

  /**
   * Create the patrol ship texture (enemy ship similar to player rocket).
   */
  private createPatrolShipTexture(key: string): void {
    const graphics = this.add.graphics();
    const w = 36;
    const h = 48;

    // Main body - dark red/maroon metallic
    graphics.fillStyle(0x882222);
    graphics.beginPath();
    graphics.moveTo(w / 2, 4);          // Nose tip
    graphics.lineTo(w - 6, 18);         // Right upper
    graphics.lineTo(w - 4, 38);         // Right body
    graphics.lineTo(w - 8, 44);         // Right fin top
    graphics.lineTo(w - 2, h);          // Right fin bottom
    graphics.lineTo(w / 2 + 3, 44);     // Center right
    graphics.lineTo(w / 2 - 3, 44);     // Center left
    graphics.lineTo(2, h);              // Left fin bottom
    graphics.lineTo(8, 44);             // Left fin top
    graphics.lineTo(4, 38);             // Left body
    graphics.lineTo(6, 18);             // Left upper
    graphics.closePath();
    graphics.fillPath();

    // Body shading - lighter side
    graphics.fillStyle(0xaa4444);
    graphics.beginPath();
    graphics.moveTo(w / 2, 4);
    graphics.lineTo(w - 6, 18);
    graphics.lineTo(w - 4, 38);
    graphics.lineTo(w - 8, 44);
    graphics.lineTo(w - 2, h);
    graphics.lineTo(w / 2 + 3, 44);
    graphics.lineTo(w / 2, 4);
    graphics.closePath();
    graphics.fillPath();

    // Nose cone - black accent
    graphics.fillStyle(0x222222);
    graphics.beginPath();
    graphics.moveTo(w / 2, 0);
    graphics.lineTo(w / 2 + 5, 8);
    graphics.lineTo(w / 2 - 5, 8);
    graphics.closePath();
    graphics.fillPath();

    // Cockpit window - outer ring (angular)
    graphics.fillStyle(0x111111);
    graphics.fillRect(w / 2 - 6, 16, 12, 10);
    // Cockpit glass - menacing red
    graphics.fillStyle(0xff2222);
    graphics.fillRect(w / 2 - 4, 18, 8, 6);
    // Cockpit glint
    graphics.fillStyle(0xff6666);
    graphics.fillRect(w / 2 - 3, 18, 2, 2);

    // Body stripe - yellow warning
    graphics.fillStyle(0xffcc00);
    graphics.fillRect(w / 2 - 7, 30, 14, 3);

    // Fin details - darker
    graphics.fillStyle(0x661111);
    graphics.fillTriangle(2, h, 8, 44, 6, h - 3);
    graphics.fillTriangle(w - 2, h, w - 8, 44, w - 6, h - 3);

    // Engine nozzle
    graphics.fillStyle(0x333333);
    graphics.fillRect(w / 2 - 5, 44, 10, 3);
    graphics.fillStyle(0x222222);
    graphics.fillRect(w / 2 - 3, 46, 6, 3);

    // Wing guns
    graphics.fillStyle(0x444444);
    graphics.fillRect(2, 24, 4, 12);
    graphics.fillRect(w - 6, 24, 4, 12);

    graphics.generateTexture(key, w, h);
    graphics.destroy();
  }

  /**
   * Create a laser hazard with emitters.
   */
  private createLaser(hazard: {
    x: number;
    y: number;
    width?: number;
    length?: number;
    angle?: number;
    emitterX?: number;
    emitterY?: number;
    receiverX?: number;
    receiverY?: number;
    onDuration: number;
    offDuration: number;
    warningDuration: number;
  }): void {
    // Use shared renderer for visual consistency with editor
    const container = renderLaserField(this, {
      emitterX: hazard.emitterX,
      emitterY: hazard.emitterY,
      receiverX: hazard.receiverX,
      receiverY: hazard.receiverY,
      length: hazard.length,
      angle: hazard.angle,
      width: hazard.width,
    });

    // Position container at hazard center
    container.setPosition(hazard.x, hazard.y);
    this.levelVisuals.push(container);

    // Get the beam from the container for physics
    const beam = container.getData('beam') as Phaser.GameObjects.Rectangle;
    const emitterGlow = container.getData('emitterGlow') as Phaser.GameObjects.Arc;
    const receiverGlow = container.getData('receiverGlow') as Phaser.GameObjects.Arc;

    // Add beam to hazards group for collision
    if (beam) {
      // Move beam to world coordinates for physics
      const beamWorldX = hazard.x + beam.x;
      const beamWorldY = hazard.y + beam.y;
      const beamAngle = beam.angle;
      const beamWidth = beam.width;
      const beamHeight = beam.height;

      // Create separate physics beam (the container one is just visual)
      const physicsBeam = this.add.rectangle(
        beamWorldX,
        beamWorldY,
        beamWidth,
        beamHeight,
        0xff0000,
        0
      );
      physicsBeam.setAngle(beamAngle);
      this.hazards?.add(physicsBeam);

      // Disable gravity on the laser
      const body = physicsBeam.body as Phaser.Physics.Arcade.Body;
      if (body) {
        body.setAllowGravity(false);
        body.setImmovable(true);
      }

      // Store laser data for cycling
      physicsBeam.setData('isLaser', true);
      physicsBeam.setData('onDuration', hazard.onDuration);
      physicsBeam.setData('offDuration', hazard.offDuration);
      physicsBeam.setData('warningDuration', hazard.warningDuration);
      physicsBeam.setData('cycleTime', 0);
      physicsBeam.setData('isOn', true);
      physicsBeam.setData('emitterGlow', emitterGlow);
      physicsBeam.setData('receiverGlow', receiverGlow);
      physicsBeam.setData('visualBeam', beam);
    }
  }

  /**
   * Create a bubble gun hazard.
   */
  private createBubbleGun(hazard: {
    x: number;
    y: number;
    direction: 'left' | 'right' | 'up' | 'down';
    bubbleType: 'blue' | 'green' | 'white' | 'random';
    fireRate: number;
    bubbleSpeed: number;
    bubbleDuration?: number;
  }): void {
    // Use shared renderer for visual consistency with editor
    const container = renderBubbleGun(this, hazard.direction, hazard.bubbleType);
    container.setPosition(hazard.x, hazard.y);

    // Get references from container
    const light = container.getData('light') as Phaser.GameObjects.Arc;
    const barrel = container.getData('barrel') as Phaser.GameObjects.Rectangle;

    // Reset light scale to 0 for animation (shared renderer sets it to 0.5 for static preview)
    if (light) {
      light.setScale(0);
    }

    // Store gun data
    container.setData('direction', hazard.direction);
    container.setData('bubbleType', hazard.bubbleType);
    container.setData('fireRate', hazard.fireRate);
    container.setData('bubbleSpeed', hazard.bubbleSpeed);
    container.setData('bubbleDuration', hazard.bubbleDuration || 5000);
    container.setData('lastFire', 0);
    container.setData('charging', 0);
    container.setData('nextBubbleType', this.getRandomBubbleType(hazard.bubbleType));

    this.bubbleGuns.push(container);
    this.levelVisuals.push(container);
  }

  /**
   * Get random or fixed bubble type.
   */
  private getRandomBubbleType(configType: string): 'blue' | 'green' | 'white' {
    if (configType === 'random') {
      const types: Array<'blue' | 'green' | 'white'> = ['blue', 'green', 'white'];
      return types[Math.floor(Math.random() * types.length)] ?? 'white';
    }
    return configType as 'blue' | 'green' | 'white';
  }

  /**
   * Fire a bubble from a gun.
   */
  private fireBubble(gun: Phaser.GameObjects.Container): void {
    const direction = gun.getData('direction') as string;
    const bubbleType = gun.getData('nextBubbleType') as 'blue' | 'green' | 'white';
    const speed = gun.getData('bubbleSpeed') as number;
    const duration = gun.getData('bubbleDuration') as number;

    // Calculate velocity - aim at rocket if playing and not encapsulated, otherwise use fixed direction
    let vx = 0, vy = 0;
    let spawnOffset = 20;

    // Don't aim at rocket if it's already in a bubble (invisible to enemies)
    const canSeeRocket = this.gameState === GameState.Playing && this.rocket && !this.encapsulatingBubble;

    if (canSeeRocket) {
      // Aim at the rocket
      const dx = this.rocket!.sprite.x - gun.x;
      const dy = this.rocket!.sprite.y - gun.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 0) {
        vx = (dx / dist) * speed;
        vy = (dy / dist) * speed;
      }
    } else {
      // Fixed direction when not playing or rocket is hidden in bubble
      if (direction === 'right') { vx = speed; }
      else if (direction === 'left') { vx = -speed; }
      else if (direction === 'up') { vy = -speed; }
      else { vy = speed; }
    }

    // Spawn position
    const spawnX = gun.x + (direction === 'right' ? spawnOffset : direction === 'left' ? -spawnOffset : 0);
    const spawnY = gun.y + (direction === 'down' ? spawnOffset : direction === 'up' ? -spawnOffset : 0);

    // Bubble colors
    const bubbleColors = {
      blue: { fill: 0x4488ff, stroke: 0x88ccff },
      green: { fill: 0x44ff44, stroke: 0x88ff88 },
      white: { fill: 0xffffff, stroke: 0xcccccc },
    };
    const color = bubbleColors[bubbleType];

    // Create small projectile bubble (grows when it hits rocket)
    const bubble = this.add.circle(spawnX, spawnY, 10, color.fill, 0.5);
    bubble.setStrokeStyle(1, color.stroke);

    // Store bubble data
    bubble.setData('vx', vx);
    bubble.setData('vy', vy);
    bubble.setData('bubbleType', bubbleType);
    bubble.setData('duration', duration);
    bubble.setData('elapsed', 0);

    this.bubbleProjectiles.push(bubble);

    // Flash the gun light
    const light = gun.getData('light') as Phaser.GameObjects.Arc;
    if (light) {
      this.tweens.add({
        targets: light,
        scale: 1.5,
        duration: 100,
        yoyo: true,
      });
    }
  }

  /**
   * Create a warp zone hazard.
   */
  private createWarpZone(hazard: {
    x: number;
    y: number;
    width: number;
    height: number;
    id: string;
    targetId: string;
    color?: number;
  }): void {
    const color = hazard.color || 0x8844ff;

    // Use shared renderer for visual consistency with editor
    const container = renderWarpZone(this, hazard.width, hazard.height, color);
    container.setPosition(hazard.x + hazard.width / 2, hazard.y + hazard.height / 2);

    // Get references from container for animations
    const glow = container.getData('glow') as Phaser.GameObjects.Rectangle;
    const light = container.getData('light') as Phaser.GameObjects.Arc;

    // Add animations (not in shared renderer since editor doesn't need them)
    // Rotate the ellipses
    container.each((child: Phaser.GameObjects.GameObject) => {
      if (child instanceof Phaser.GameObjects.Ellipse) {
        this.tweens.add({
          targets: child,
          angle: child.angle + 360,
          duration: 3000 - (container.getIndex(child) * 200),
          repeat: -1,
          ease: 'Linear',
        });
      }
    });

    // Pulsing animation
    if (glow && light) {
      this.tweens.add({
        targets: [glow, light],
        alpha: { from: 0.3, to: 0.8 },
        scale: { from: 0.9, to: 1.1 },
        duration: 1000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }

    // Store warp zone data
    this.warpZones.set(hazard.id, {
      container,
      x: hazard.x + hazard.width / 2,
      y: hazard.y + hazard.height / 2,
      width: hazard.width,
      height: hazard.height,
      targetId: hazard.targetId,
    });

    this.levelVisuals.push(container);
  }

  /**
   * Create a gravity well hazard.
   */
  private createGravityWell(hazard: {
    x: number;
    y: number;
    radius: number;
    strength: number;
    affectsRocket?: boolean;
    affectsBubble?: boolean;
    color?: number;
  }): void {
    const color = hazard.color || 0x6644aa;
    const isBlackHole = (color & 0xffffff) < 0x333333;

    // Use shared renderer for visual consistency with editor
    const container = renderGravityWell(this, hazard.radius, hazard.strength, color);
    container.setPosition(hazard.x, hazard.y);

    // Add animations (not in shared renderer since editor doesn't need them)
    if (isBlackHole) {
      // Find and animate the bright spot (ellipse)
      container.each((child: Phaser.GameObjects.GameObject) => {
        if (child instanceof Phaser.GameObjects.Ellipse) {
          this.tweens.add({
            targets: child,
            angle: 360,
            duration: 8000,
            repeat: -1,
            ease: 'Linear',
          });
        }
      });
    } else {
      // Animate rings and core
      let ringIndex = 0;
      container.each((child: Phaser.GameObjects.GameObject) => {
        if (child instanceof Phaser.GameObjects.Arc) {
          const radius = (child as Phaser.GameObjects.Arc).radius;
          if (radius === 10) {
            // Core - pulse scale
            this.tweens.add({
              targets: child,
              scale: { from: 0.8, to: 1.2 },
              duration: 800,
              yoyo: true,
              repeat: -1,
              ease: 'Sine.easeInOut',
            });
          } else if (radius < hazard.radius) {
            // Ring - pulse scale and alpha
            this.tweens.add({
              targets: child,
              scale: { from: 0.9, to: 1.1 },
              alpha: { from: 0.1, to: 0.3 },
              duration: 1500 - ringIndex * 300,
              yoyo: true,
              repeat: -1,
              ease: 'Sine.easeInOut',
            });
            ringIndex++;
          }
        }
      });
    }

    // Store gravity well data
    this.gravityWells.push({
      x: hazard.x,
      y: hazard.y,
      radius: hazard.radius,
      strength: hazard.strength,
      affectsRocket: hazard.affectsRocket ?? true,
      affectsBubble: hazard.affectsBubble ?? true,
      visual: container,
    });

    this.levelVisuals.push(container);
  }

  /**
   * Create the player rocket.
   */
  private createRocket(): void {
    if (!this.currentLevel) return;

    const spawn = this.currentLevel.spawnPoint;

    this.rocket = createRocketWithPlaceholder(this, spawn.x, spawn.y, {
      gravity: vec2(0, this.currentLevel.gravity),
      safeLandingVelocity: this.currentLevel.safeLandingVelocity ?? 100,
      safeLandingAngle: this.currentLevel.safeLandingAngle ?? 15,
      autoStabilization: this.currentLevel.autoStabilization ?? 0,
    });

    // Set up rocket events
    this.rocket.events.on('crash', this.onRocketCrash, this);
    this.rocket.events.on('land', this.onRocketLand, this);

    // Disable gravity while in bubble (Ready state)
    const body = this.rocket.sprite.body as Phaser.Physics.Arcade.Body;
    if (body) {
      body.setAllowGravity(false);
      body.setVelocity(0, 0);
    }

    // Create the bubble around the rocket
    this.createBubble(spawn.x, spawn.y, spawn.bubbleColor ?? 'green');
  }

  /**
   * Create spawn bubble around the rocket using shared renderer.
   * @param color - Bubble color affects gravity behavior
   */
  private createBubble(x: number, y: number, color: 'green' | 'white' | 'blue' = 'green'): void {
    // Use shared renderer for consistent visuals with editor
    const { bubble, glow } = renderSpawnBubble(this, color);

    // Position at spawn point
    bubble.setPosition(x, y);
    glow.setPosition(x, y);

    // Use the encapsulating bubble system - same as bubble gun bubbles
    this.encapsulatingBubble = {
      bubble,
      glow,
      type: color,
      duration: Infinity, // Spawn bubbles don't auto-pop
      elapsed: 0,
      vx: 0,
      vy: 0,
      wobble: Math.random() * Math.PI * 2,
      isSpawnBubble: true,
    };

    // Set depths
    glow.setDepth(5);
    bubble.setDepth(6);

    // Store legacy references for compatibility
    this.bubble = bubble;
    this.bubbleGlow = glow;
  }

  /**
   * Fade out level markers when game starts.
   */
  private fadeOutMarkers(): void {
    for (const marker of this.fadeOnStartMarkers) {
      this.tweens.add({
        targets: marker,
        alpha: 0,
        duration: 500,
        ease: 'Power2',
      });
    }
  }

  /**
   * Set up physics collisions.
   */
  private setupCollisions(): void {
    if (!this.rocket) return;

    // Collision with terrain = crash
    if (this.terrain) {
      const terrainCollider = this.physics.add.overlap(
        this.rocket.sprite,
        this.terrain,
        () => {
          this.rocket?.handleCollision(CollisionType.Terrain);
        },
        undefined,
        this
      );
      this.colliders.push(terrainCollider);
    }

    // Collision with landing pad = attempt landing
    if (this.landingPads) {
      const padCollider = this.physics.add.overlap(
        this.rocket.sprite,
        this.landingPads,
        () => {
          this.rocket?.handleCollision(CollisionType.LandingPad);
        },
        undefined,
        this
      );
      this.colliders.push(padCollider);
    }

    // Collision with hazards = crash
    if (this.hazards) {
      const hazardCollider = this.physics.add.overlap(
        this.rocket.sprite,
        this.hazards,
        () => {
          this.rocket?.handleCollision(CollisionType.Hazard);
        },
        undefined,
        this
      );
      this.colliders.push(hazardCollider);
    }

    // Collision with multiplier bubbles = collect
    for (const bubble of this.multiplierBubbles) {
      const bubbleCollider = this.physics.add.overlap(
        this.rocket.sprite,
        bubble,
        () => {
          this.collectMultiplierBubble(bubble);
        },
        undefined,
        this
      );
      this.colliders.push(bubbleCollider);
    }
  }

  /**
   * Set up camera for scrolling levels.
   * Camera follows the rocket and is bounded by level bounds.
   */
  private setupCamera(): void {
    if (!this.currentLevel || !this.rocket) return;

    const bounds = this.currentLevel.bounds;
    const screenWidth = Number(this.game.config.width);
    const screenHeight = Number(this.game.config.height);

    // Calculate world dimensions from level bounds
    const worldWidth = bounds.maxX - bounds.minX;
    const worldHeight = bounds.maxY - bounds.minY;

    // Set physics world bounds
    this.physics.world.setBounds(bounds.minX, bounds.minY, worldWidth, worldHeight);

    // Set camera bounds - camera can't scroll past the level edges
    this.cameras.main.setBounds(bounds.minX, bounds.minY, worldWidth, worldHeight);

    // Only enable camera following if the level is taller than the screen
    if (worldHeight > screenHeight) {
      // Follow the rocket with some deadzone so small movements don't cause scrolling
      this.cameras.main.startFollow(this.rocket.sprite, true, 0.1, 0.1);

      // Set deadzone - area in center where rocket can move without camera following
      const deadzoneWidth = screenWidth * 0.6;
      const deadzoneHeight = screenHeight * 0.4;
      this.cameras.main.setDeadzone(deadzoneWidth, deadzoneHeight);
    } else {
      // For non-scrolling levels, stop any following and reset camera position
      this.cameras.main.stopFollow();
      this.cameras.main.setScroll(0, 0);
    }
  }

  /**
   * Create UI elements.
   */
  private createUI(): void {
    const width = Number(this.game.config.width);
    const height = Number(this.game.config.height);

    // Score display (top left, persistent)
    this.add
      .text(10, 10, 'SCORE', {
        fontSize: '8px',
        color: '#666688',
        fontFamily: 'monospace',
      })
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(100);

    this.scoreText = this.add
      .text(10, 22, GameScene.totalScore.toString(), {
        fontSize: '14px',
        color: '#00ff44',
        fontFamily: 'monospace',
        fontStyle: 'bold',
      })
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(100);

    // Lives display (top right)
    this.createLivesDisplay();

    // State display (center top)
    this.stateText = this.add
      .text(width / 2, 20, '', {
        fontSize: '11px',
        color: '#ffff00',
        fontFamily: 'monospace',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(100);

    // Stage timer (left side)
    this.add
      .text(10, height - 25, 'STAGE', {
        fontSize: '8px',
        color: '#666688',
        fontFamily: 'monospace',
      })
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(100);

    this.stageTimerText = this.add
      .text(10, height - 12, '0:00.0', {
        fontSize: '12px',
        color: '#88aaff',
        fontFamily: 'monospace',
      })
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(100);

    // Game timer (right side)
    this.add
      .text(width - 10, height - 25, 'TOTAL', {
        fontSize: '8px',
        color: '#666688',
        fontFamily: 'monospace',
      })
      .setOrigin(1, 0.5)
      .setScrollFactor(0)
      .setDepth(100);

    this.gameTimerText = this.add
      .text(width - 10, height - 12, '0:00.0', {
        fontSize: '12px',
        color: '#ffaa88',
        fontFamily: 'monospace',
      })
      .setOrigin(1, 0.5)
      .setScrollFactor(0)
      .setDepth(100);

    // Initialize game time from static (persists across levels)
    this.gameTime = GameScene.totalGameTime;
  }

  /**
   * Fixed timestep physics update.
   */
  protected fixedUpdate(delta: number): void {
    // Always update hazards so player can see them moving
    this.updateHazards(delta);
    this.updateBubbleGuns(delta);

    // Update speedrun timers (pause when showing level complete screen)
    if (!this.showingLevelComplete &&
        (this.gameState === GameState.Ready || this.gameState === GameState.Playing)) {
      this.stageTime += delta * 1000;
      this.gameTime += delta * 1000;
      GameScene.totalGameTime = this.gameTime;
      this.updateTimerDisplay();
    }

    // Hurry up mechanics only when playing
    if (this.gameState === GameState.Playing) {
      // Hurry up! warning
      if (!this.hurryUpWarningShown && this.stageTime >= this.hurryUpWarningTime) {
        this.showHurryUpWarning();
        this.hurryUpWarningShown = true;
      }

      // Spawn chase ships
      if (!this.hurryUpActive && this.stageTime >= this.hurryUpTime) {
        this.spawnChaseShips();
        this.hurryUpActive = true;
      }

      // Update chase ships
      if (this.hurryUpActive) {
        this.updateChaseShips(delta);
      }
    }

    if (this.gameState !== GameState.Playing) {
      // In Ready state, encapsulating bubble physics are handled by updateBubbleGuns
      if (this.gameState === GameState.Ready) {
        // Allow starting with thrust - release from spawn bubble
        if (this.currentInput.thrust && this.encapsulatingBubble?.isSpawnBubble) {
          this.releaseFromBubble();
          // Fade out level markers
          this.fadeOutMarkers();
          this.gameState = GameState.Playing;
        }
      }
      return;
    }

    // Update rocket physics (skip entirely if encapsulated in bubble - bubble handles movement)
    if (this.rocket && !this.encapsulatingBubble) {
      this.rocket.fixedUpdate(this.currentInput, delta);
      this.checkRocketWrapHoles();
    }

    // Check warp zone collisions
    this.updateWarpZones(delta);
  }

  /**
   * Update the timer display text.
   */
  private updateTimerDisplay(): void {
    if (this.stageTimerText) {
      this.stageTimerText.setText(this.formatTime(this.stageTime));
    }
    if (this.gameTimerText) {
      this.gameTimerText.setText(this.formatTime(this.gameTime));
    }
  }

  /**
   * Format milliseconds as M:SS.d (minutes:seconds.tenths)
   */
  private formatTime(ms: number): string {
    const totalSeconds = ms / 1000;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.floor(totalSeconds % 60);
    const tenths = Math.floor((totalSeconds * 10) % 10);
    return `${minutes}:${seconds.toString().padStart(2, '0')}.${tenths}`;
  }

  /**
   * Reset game timer and score (for new game).
   */
  public static resetGameTimer(): void {
    GameScene.totalGameTime = 0;
    GameScene.totalScore = 0;
  }

  /**
   * Show "HURRY UP!" warning.
   */
  private showHurryUpWarning(): void {
    const width = Number(this.game.config.width);
    const height = Number(this.game.config.height);

    const warning = this.add.text(width / 2, height / 2, 'HURRY UP!', {
      fontSize: '32px',
      color: '#ff4444',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4,
    });
    warning.setOrigin(0.5);
    warning.setDepth(200);

    // Flash and fade out
    this.tweens.add({
      targets: warning,
      alpha: { from: 1, to: 0 },
      scale: { from: 1, to: 1.5 },
      duration: 2000,
      ease: 'Power2',
      onComplete: () => warning.destroy(),
    });

    // Make stage timer flash red
    if (this.stageTimerText) {
      this.stageTimerText.setColor('#ff4444');
    }
  }

  /**
   * Spawn chase ships from corners.
   */
  private spawnChaseShips(): void {
    const width = Number(this.game.config.width);
    const height = Number(this.game.config.height);

    // Create chase ship texture if needed
    const textureKey = 'chaseShip';
    if (!this.textures.exists(textureKey)) {
      this.createChaseShipTexture(textureKey);
    }

    // Spawn from the furthest side away from the rocket
    const rocketX = this.rocket?.sprite.x ?? width / 2;
    const spawnFromLeft = rocketX > width / 2;
    const spawnX = spawnFromLeft ? -30 : width + 30; // Start offscreen
    const targetX = spawnFromLeft ? 30 : width - 30; // Target position onscreen

    const sprite = this.add.sprite(spawnX, 30, textureKey);
    sprite.setScale(0);
    sprite.setAlpha(0);
    sprite.setDepth(150);

    // Menacing glow
    const glow = this.add.circle(spawnX, 30, 20, 0xff0000, 0);
    glow.setDepth(149);

    this.chaseShips.push({ sprite, glow });

    // Spawn animation - scale up and slide in from edge
    this.tweens.add({
      targets: [sprite, glow],
      x: targetX,
      duration: 800,
      ease: 'Back.easeOut',
    });

    this.tweens.add({
      targets: sprite,
      scale: 0.7,
      alpha: 1,
      duration: 600,
      ease: 'Back.easeOut',
    });

    this.tweens.add({
      targets: glow,
      alpha: 0.3,
      duration: 600,
      ease: 'Power2',
    });
  }

  /**
   * Create chase ship texture (menacing red variant).
   */
  private createChaseShipTexture(key: string): void {
    const graphics = this.add.graphics();
    const w = 32;
    const h = 40;

    // Main body - angry red
    graphics.fillStyle(0xcc2222);
    graphics.beginPath();
    graphics.moveTo(w / 2, 2);
    graphics.lineTo(w - 4, 14);
    graphics.lineTo(w - 2, 32);
    graphics.lineTo(w - 6, h);
    graphics.lineTo(w / 2 + 2, 34);
    graphics.lineTo(w / 2 - 2, 34);
    graphics.lineTo(6, h);
    graphics.lineTo(2, 32);
    graphics.lineTo(4, 14);
    graphics.closePath();
    graphics.fillPath();

    // Darker shade
    graphics.fillStyle(0x881111);
    graphics.beginPath();
    graphics.moveTo(w / 2, 2);
    graphics.lineTo(4, 14);
    graphics.lineTo(2, 32);
    graphics.lineTo(6, h);
    graphics.lineTo(w / 2 - 2, 34);
    graphics.lineTo(w / 2, 2);
    graphics.closePath();
    graphics.fillPath();

    // Evil eye
    graphics.fillStyle(0xffff00);
    graphics.fillCircle(w / 2, 16, 6);
    graphics.fillStyle(0x000000);
    graphics.fillCircle(w / 2, 16, 3);

    // Generate texture
    graphics.generateTexture(key, w, h);
    graphics.destroy();
  }

  /**
   * Update chase ships - they follow the player!
   */
  private updateChaseShips(delta: number): void {
    if (!this.rocket) return;

    const targetX = this.rocket.sprite.x;
    const targetY = this.rocket.sprite.y;
    const chaseSpeed = 80; // Pixels per second

    for (const ship of this.chaseShips) {
      // Calculate direction to player
      const dx = targetX - ship.sprite.x;
      const dy = targetY - ship.sprite.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 5) {
        // Move towards player
        const vx = (dx / dist) * chaseSpeed * delta;
        const vy = (dy / dist) * chaseSpeed * delta;
        ship.sprite.x += vx;
        ship.sprite.y += vy;
        ship.glow.x = ship.sprite.x;
        ship.glow.y = ship.sprite.y;

        // Rotate to face player
        ship.sprite.setRotation(Math.atan2(dy, dx) + Math.PI / 2);
      }

      // Pulse the glow
      const pulse = 0.3 + Math.sin(this.time.now / 200) * 0.15;
      ship.glow.setAlpha(pulse);

      // Check collision with player
      const collisionDist = 20;
      if (dist < collisionDist) {
        this.onRocketCrash();
        return;
      }
    }
  }

  /**
   * Clean up chase ships (called on level end/reset).
   */
  private cleanupChaseShips(): void {
    for (const ship of this.chaseShips) {
      ship.sprite.destroy();
      ship.glow.destroy();
    }
    this.chaseShips = [];
    this.hurryUpActive = false;
    this.hurryUpWarningShown = false;
  }

  /**
   * Get high score for a specific level.
   */
  private static getLevelHighScore(levelNumber: number): number {
    if (typeof localStorage === 'undefined') return 0;
    const stored = localStorage.getItem(GameScene.HIGH_SCORE_KEY + levelNumber);
    return stored ? parseInt(stored, 10) : 0;
  }

  /**
   * Set high score for a specific level.
   */
  private static setLevelHighScore(levelNumber: number, score: number): void {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(GameScene.HIGH_SCORE_KEY + levelNumber, score.toString());
  }

  /**
   * Get total game high score.
   */
  private static getTotalHighScore(): number {
    if (typeof localStorage === 'undefined') return 0;
    const stored = localStorage.getItem(GameScene.TOTAL_HIGH_SCORE_KEY);
    return stored ? parseInt(stored, 10) : 0;
  }

  /**
   * Set total game high score.
   */
  private static setTotalHighScore(score: number): void {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(GameScene.TOTAL_HIGH_SCORE_KEY, score.toString());
  }

  /**
   * Get best time for a specific level (in seconds).
   */
  private static getLevelBestTime(levelNumber: number): number {
    if (typeof localStorage === 'undefined') return 0;
    const stored = localStorage.getItem(GameScene.BEST_TIME_KEY + levelNumber);
    return stored ? parseFloat(stored) : 0;
  }

  /**
   * Set best time for a specific level (in seconds).
   */
  private static setLevelBestTime(levelNumber: number, time: number): void {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(GameScene.BEST_TIME_KEY + levelNumber, time.toFixed(1));
  }

  /**
   * Check if rocket should wrap through a wrap hole.
   */
  private checkRocketWrapHoles(): void {
    if (!this.rocket || !this.currentLevel?.wrapHoles) return;

    const sprite = this.rocket.sprite;
    const bounds = this.currentLevel.bounds;
    const rocketHalfHeight = 12; // Approximate half height of rocket

    for (const hole of this.currentLevel.wrapHoles) {
      // Check if rocket X is within the hole
      if (sprite.x >= hole.minX && sprite.x <= hole.maxX) {
        // Check if rocket went through bottom
        if (sprite.y > bounds.maxY + rocketHalfHeight) {
          sprite.y = bounds.minY - rocketHalfHeight + 5;
        }
        // Check if rocket went through top
        else if (sprite.y < bounds.minY - rocketHalfHeight) {
          sprite.y = bounds.maxY + rocketHalfHeight - 5;
        }
      }
    }
  }

  /**
   * Get game leaderboard (top 10 scores).
   */
  private static getGameLeaderboard(): number[] {
    if (typeof localStorage === 'undefined') return [];
    const stored = localStorage.getItem(GameScene.GAME_LEADERBOARD_KEY);
    if (!stored) return [];
    try {
      return JSON.parse(stored);
    } catch {
      return [];
    }
  }

  /**
   * Add score to game leaderboard. Returns the rank (1-based) or 0 if not on board.
   */
  private static addToGameLeaderboard(score: number): number {
    if (typeof localStorage === 'undefined') return 0;
    const leaderboard = GameScene.getGameLeaderboard();
    leaderboard.push(score);
    leaderboard.sort((a, b) => b - a); // Sort descending
    const rank = leaderboard.indexOf(score) + 1;
    // Keep only top 10
    const top10 = leaderboard.slice(0, 10);
    localStorage.setItem(GameScene.GAME_LEADERBOARD_KEY, JSON.stringify(top10));
    return rank <= 10 ? rank : 0;
  }

  /**
   * Update all hazards.
   */
  private updateHazards(delta: number): void {
    if (!this.hazards) return;

    this.hazards.getChildren().forEach((child) => {
      const obj = child as Phaser.GameObjects.Rectangle;

      // Handle laser cycling
      if (obj.getData('isLaser')) {
        this.updateLaser(obj, delta);
        return;
      }

      // Handle patrol ship
      if (obj.getData('isPatrolShip')) {
        this.updatePatrolShip(obj, delta);
        return;
      }

      // Legacy moving column support (in case any levels use old format)
      const minY = obj.getData('minY') as number;
      const maxY = obj.getData('maxY') as number;
      const speed = obj.getData('speed') as number;
      let direction = obj.getData('direction') as number;

      if (minY === undefined || maxY === undefined || speed === undefined) return;

      const newY = obj.y + speed * direction * delta;
      if (newY >= maxY) {
        obj.y = maxY;
        obj.setData('direction', -1);
      } else if (newY <= minY) {
        obj.y = minY;
        obj.setData('direction', 1);
      } else {
        obj.y = newY;
      }

      const body = obj.body as Phaser.Physics.Arcade.Body;
      if (body) {
        body.position.y = obj.y - obj.height / 2;
      }
    });
  }

  /**
   * Update patrol ship with simple behavior:
   * - Move in direction
   * - Hit terrain = bounce
   * - Exit screen = wrap to other side
   */
  private updatePatrolShip(ship: Phaser.GameObjects.Rectangle, delta: number): void {
    const maxSpeed = ship.getData('maxSpeed') as number;
    const shipWidth = ship.getData('shipWidth') as number;
    const shipHeight = ship.getData('shipHeight') as number;
    let currentSpeed = ship.getData('currentSpeed') as number;
    let direction = ship.getData('direction') as number;
    let state = ship.getData('state') as string;
    let turnProgress = ship.getData('turnProgress') as number;
    const shipSprite = ship.getData('shipSprite') as Phaser.GameObjects.Sprite;
    const engineGlow = ship.getData('engineGlow') as Phaser.GameObjects.Ellipse;

    const acceleration = maxSpeed * 4; // Faster decel = tighter stops
    const turnDuration = 0.25;
    const slowDownDist = 25; // Tighter approach to terrain
    const halfHeight = shipHeight / 2;
    const halfWidth = shipWidth / 2;

    // Use level bounds for wrap (supports scrolling levels)
    const bounds = this.currentLevel?.bounds;
    const screenTop = bounds?.minY ?? 0;
    const screenBottom = bounds?.maxY ?? 356;

    // Check for terrain collision ahead (smaller lookahead)
    const checkDistance = slowDownDist;
    const willHitTerrain = this.checkTerrainAhead(ship.x, ship.y, halfWidth, halfHeight, direction, checkDistance);

    // State machine
    if (state === 'patrol') {
      // Check if we need to slow down (terrain ahead)
      if (willHitTerrain) {
        state = 'slowing';
        ship.setData('state', state);
      }

      // Move
      ship.y += currentSpeed * direction * delta;

      // Check screen wrap
      if (ship.y - halfHeight < screenTop) {
        // Exited top - wrap to bottom
        ship.y = screenBottom - halfHeight;
        const body = ship.body as Phaser.Physics.Arcade.Body;
        if (body) body.reset(ship.x, ship.y);
      } else if (ship.y + halfHeight > screenBottom) {
        // Exited bottom - wrap to top
        ship.y = screenTop + halfHeight;
        const body = ship.body as Phaser.Physics.Arcade.Body;
        if (body) body.reset(ship.x, ship.y);
      }

    } else if (state === 'slowing') {
      currentSpeed -= acceleration * delta;
      if (currentSpeed <= 0) {
        currentSpeed = 0;
        state = 'turning';
        turnProgress = 0;
        ship.setData('turnProgress', turnProgress);
      }
      ship.setData('currentSpeed', currentSpeed);
      ship.setData('state', state);

      // Still move while slowing
      ship.y += currentSpeed * direction * delta;

    } else if (state === 'turning') {
      turnProgress += delta / turnDuration;
      if (turnProgress >= 1) {
        turnProgress = 1;
        direction = -direction;
        state = 'accelerating';
        ship.setData('direction', direction);
      }
      ship.setData('state', state);
      ship.setData('turnProgress', turnProgress);

      // Rotate sprite
      if (shipSprite) {
        const eased = 0.5 - Math.cos(turnProgress * Math.PI) / 2;
        const startAngle = direction === 1 ? 0 : Math.PI;
        const endAngle = direction === 1 ? Math.PI : 0;
        shipSprite.setRotation(startAngle + (endAngle - startAngle) * eased);
      }

    } else if (state === 'accelerating') {
      currentSpeed += acceleration * delta;
      if (currentSpeed >= maxSpeed) {
        currentSpeed = maxSpeed;
        state = 'patrol';
      }
      ship.setData('currentSpeed', currentSpeed);
      ship.setData('state', state);

      // Move while accelerating
      ship.y += currentSpeed * direction * delta;

      // Check screen wrap during acceleration too
      if (ship.y - halfHeight < screenTop) {
        ship.y = screenBottom - halfHeight;
        const body = ship.body as Phaser.Physics.Arcade.Body;
        if (body) body.reset(ship.x, ship.y);
      } else if (ship.y + halfHeight > screenBottom) {
        ship.y = screenTop + halfHeight;
        const body = ship.body as Phaser.Physics.Arcade.Body;
        if (body) body.reset(ship.x, ship.y);
      }
    }

    // Update engine glow
    if (engineGlow) {
      const speedRatio = currentSpeed / maxSpeed;
      engineGlow.setAlpha(0.3 + speedRatio * 0.7);
      engineGlow.setScale(0.5 + speedRatio * 0.5, 0.8 + speedRatio * 0.4);
      const glowOffset = 18;
      engineGlow.setPosition(ship.x, ship.y + (direction === 1 ? -glowOffset : glowOffset));
    }

    // Sync sprite position
    if (shipSprite) {
      shipSprite.setPosition(ship.x, ship.y);
    }

    // Update physics body
    const body = ship.body as Phaser.Physics.Arcade.Body;
    if (body) {
      body.position.y = ship.y - ship.height / 2;
    }
  }

  /**
   * Check if there's terrain ahead of the ship in its movement direction.
   */
  private checkTerrainAhead(
    shipX: number,
    shipY: number,
    halfWidth: number,
    halfHeight: number,
    direction: number,
    checkDistance: number
  ): boolean {
    if (!this.terrain) return false;

    // Check position ahead
    const checkY = direction === 1
      ? shipY + halfHeight + checkDistance  // Going down, check below
      : shipY - halfHeight - checkDistance; // Going up, check above

    let hitTerrain = false;

    this.terrain.getChildren().forEach((child) => {
      if (hitTerrain) return;

      const terrain = child as Phaser.GameObjects.Rectangle;
      const tLeft = terrain.x - terrain.width / 2;
      const tRight = terrain.x + terrain.width / 2;
      const tTop = terrain.y - terrain.height / 2;
      const tBottom = terrain.y + terrain.height / 2;

      // Check if ship's X overlaps terrain's X
      if (shipX + halfWidth > tLeft && shipX - halfWidth < tRight) {
        if (direction === 1) {
          // Going down - check if terrain top is between ship bottom and check position
          if (tTop > shipY + halfHeight && tTop < checkY) {
            hitTerrain = true;
          }
        } else {
          // Going up - check if terrain bottom is between check position and ship top
          if (tBottom < shipY - halfHeight && tBottom > checkY) {
            hitTerrain = true;
          }
        }
      }
    });

    return hitTerrain;
  }

  /**
   * Update laser on/off cycle.
   */
  private updateLaser(laser: Phaser.GameObjects.Rectangle, delta: number): void {
    const onDuration = laser.getData('onDuration') as number;
    const offDuration = laser.getData('offDuration') as number;
    const warningDuration = laser.getData('warningDuration') as number;
    let cycleTime = laser.getData('cycleTime') as number;
    let isOn = laser.getData('isOn') as boolean;

    const emitterGlow = laser.getData('emitterGlow') as Phaser.GameObjects.Arc;
    const receiverGlow = laser.getData('receiverGlow') as Phaser.GameObjects.Arc;
    const visualBeam = laser.getData('visualBeam') as Phaser.GameObjects.Rectangle;

    // Update cycle time (convert delta from seconds to ms)
    cycleTime += delta * 1000;
    const totalCycle = onDuration + offDuration;
    cycleTime = cycleTime % totalCycle;
    laser.setData('cycleTime', cycleTime);

    // Determine state based on cycle
    const wasOn = isOn;
    isOn = cycleTime < onDuration;
    laser.setData('isOn', isOn);

    // Update visuals
    if (isOn) {
      // Laser is ON - deadly
      if (visualBeam) {
        visualBeam.setVisible(true);
        visualBeam.setFillStyle(0xff0000, 0.9);
      }
      if (emitterGlow) emitterGlow.setFillStyle(0xff0000);
      if (receiverGlow) receiverGlow.setFillStyle(0xff0000);

      // Enable collision
      const body = laser.body as Phaser.Physics.Arcade.Body;
      if (body) body.enable = true;
    } else {
      // Check if in warning phase (about to turn on)
      const timeUntilOn = totalCycle - cycleTime;
      if (timeUntilOn < warningDuration) {
        // Warning - flickering
        const flicker = Math.random() > 0.5;
        if (visualBeam) {
          visualBeam.setVisible(flicker);
          visualBeam.setFillStyle(0xff6600, 0.5);
        }
        if (emitterGlow) emitterGlow.setFillStyle(0xff6600);
        if (receiverGlow) receiverGlow.setFillStyle(0xff6600);
      } else {
        // Laser is OFF - safe
        if (visualBeam) visualBeam.setVisible(false);
        if (emitterGlow) emitterGlow.setFillStyle(0x444444);
        if (receiverGlow) receiverGlow.setFillStyle(0x444444);
      }

      // Disable collision when off
      const body = laser.body as Phaser.Physics.Arcade.Body;
      if (body) body.enable = false;
    }
  }

  /**
   * Update bubble guns - fire and update projectiles.
   */
  private updateBubbleGuns(delta: number): void {
    const currentTime = this.time.now;

    // Bubble colors for indicator light
    const bubbleColors: Record<string, number> = {
      blue: 0x4488ff,
      green: 0x44ff44,
      white: 0xffffff,
    };

    // Update gun charging and firing
    for (const gun of this.bubbleGuns) {
      const fireRate = gun.getData('fireRate') as number;
      const nextFire = gun.getData('nextFire') as number || fireRate;
      let charging = gun.getData('charging') as number;
      const light = gun.getData('light') as Phaser.GameObjects.Arc;
      const barrel = gun.getData('barrel') as Phaser.GameObjects.Rectangle;
      const nextBubbleType = gun.getData('nextBubbleType') as string;
      const configBubbleType = gun.getData('bubbleType') as string;
      const direction = gun.getData('direction') as string;

      // Update light color to match next bubble
      if (light) {
        light.setFillStyle(bubbleColors[nextBubbleType] || 0xffffff);
      }

      // Only fire when game is playing and rocket is visible (not in bubble) and has clear line of sight
      let canSeeRocket = this.gameState === GameState.Playing && this.rocket && !this.encapsulatingBubble;

      // Check line of sight - can't shoot through walls
      if (canSeeRocket && this.rocket && this.currentLevel?.terrain) {
        const rx = this.rocket.sprite.x;
        const ry = this.rocket.sprite.y;
        canSeeRocket = this.hasLineOfSight(gun.x, gun.y, rx, ry);
      }

      // Rotate barrel to point at rocket (or use default direction)
      if (barrel) {
        let targetAngle: number;
        if (canSeeRocket && this.rocket) {
          // Point at rocket
          const dx = this.rocket.sprite.x - gun.x;
          const dy = this.rocket.sprite.y - gun.y;
          targetAngle = Math.atan2(dy, dx);
        } else {
          // Use default direction
          if (direction === 'right') targetAngle = 0;
          else if (direction === 'left') targetAngle = Math.PI;
          else if (direction === 'up') targetAngle = -Math.PI / 2;
          else targetAngle = Math.PI / 2;
        }
        // Smoothly rotate toward target
        const currentAngle = barrel.rotation;
        let angleDiff = targetAngle - currentAngle;
        // Normalize angle difference to [-PI, PI]
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        barrel.setRotation(currentAngle + angleDiff * Math.min(delta * 5, 1));
      }

      // Only charge when can see rocket - reset charge if can't see
      if (canSeeRocket) {
        charging += delta * 1000;
      } else {
        // Reset charge when can't see rocket
        charging = 0;
      }
      const chargeProgress = Math.min(charging / nextFire, 1);

      // Animate the light growing
      if (light) {
        light.setScale(chargeProgress);
      }

      // Fire when fully charged (only possible if canSeeRocket since charge resets otherwise)
      if (charging >= nextFire) {
        this.fireBubble(gun);
        gun.setData('lastFire', currentTime);
        gun.setData('charging', 0);
        // Set random next fire time and bubble type
        gun.setData('nextFire', fireRate * (0.5 + Math.random()));
        gun.setData('nextBubbleType', this.getRandomBubbleType(configBubbleType));
      } else {
        gun.setData('charging', charging);
      }
    }

    // Update bubble projectiles
    for (let i = this.bubbleProjectiles.length - 1; i >= 0; i--) {
      const bubble = this.bubbleProjectiles[i];
      let vx = bubble.getData('vx') as number;
      let vy = bubble.getData('vy') as number;
      const duration = bubble.getData('duration') as number;
      let elapsed = bubble.getData('elapsed') as number;

      // Apply gravity well effects to all bubble projectiles
      for (const well of this.gravityWells) {
        if (!well.affectsBubble) continue;

        const dx = well.x - bubble.x;
        const dy = well.y - bubble.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < well.radius && dist > 0) {
          // Calculate force based on distance (stronger when closer)
          const force = well.strength * (1 - dist / well.radius) * delta;
          vx += (dx / dist) * force;
          vy += (dy / dist) * force;
          bubble.setData('vx', vx);
          bubble.setData('vy', vy);
        }
      }

      // Move bubble
      const newX = bubble.x + vx * delta;
      const newY = bubble.y + vy * delta;
      const bubbleRadius = 10;

      // Check terrain collision - bubbles pop on obstacle hit
      let hitObstacle = false;
      if (this.currentLevel?.terrain) {
        for (const block of this.currentLevel.terrain) {
          // Expand block by bubble radius for collision
          const left = block.x - bubbleRadius;
          const right = block.x + block.width + bubbleRadius;
          const top = block.y - bubbleRadius;
          const bottom = block.y + block.height + bubbleRadius;

          // Check if new position would be inside block
          if (newX > left && newX < right && newY > top && newY < bottom) {
            hitObstacle = true;
            break;
          }
        }
      }

      // Pop bubble if it hits an obstacle
      if (hitObstacle) {
        bubble.destroy();
        this.bubbleProjectiles.splice(i, 1);
        continue;
      }

      // Move bubble
      bubble.x = newX;
      bubble.y = newY;

      // Update lifetime
      elapsed += delta * 1000;
      bubble.setData('elapsed', elapsed);

      // Check if bubble should pop (lifetime or way out of bounds)
      const bounds = this.currentLevel?.bounds;
      const outOfBounds = bounds && (
        bubble.x < bounds.minX - 50 || bubble.x > bounds.maxX + 50 ||
        bubble.y < bounds.minY - 50 || bubble.y > bounds.maxY + 50
      );

      if (elapsed >= duration || outOfBounds) {
        bubble.destroy();
        this.bubbleProjectiles.splice(i, 1);
        continue;
      }

      // Check collision with rocket (only when playing)
      if (this.gameState === GameState.Playing && this.rocket && !this.encapsulatingBubble) {
        const rocketX = this.rocket.sprite.x;
        const rocketY = this.rocket.sprite.y;
        const dist = Math.sqrt((bubble.x - rocketX) ** 2 + (bubble.y - rocketY) ** 2);

        if (dist < 20) {
          // Encapsulate rocket!
          this.encapsulateRocket(bubble);
          this.bubbleProjectiles.splice(i, 1);
        }
      }
    }

    // Update encapsulating bubble
    if (this.encapsulatingBubble && this.rocket) {
      this.encapsulatingBubble.elapsed += delta * 1000;

      const bubbleRadius = 28;
      let vx = this.encapsulatingBubble.vx;
      let vy = this.encapsulatingBubble.vy;

      // Update wobble for gentle floating motion
      this.encapsulatingBubble.wobble += delta * 2.5;
      const wobbleX = Math.sin(this.encapsulatingBubble.wobble) * 15;
      const wobbleY = Math.cos(this.encapsulatingBubble.wobble * 1.3) * 8;

      // Apply bubble type effects to base velocity
      if (this.encapsulatingBubble.type === 'green') {
        // Green = Anti-gravity - drift upward
        if (vy > -80) vy -= 120 * delta;
      } else if (this.encapsulatingBubble.type === 'blue') {
        // Blue = Extra gravity - drift downward
        if (vy < 100) vy += 150 * delta;
      } else {
        // White = neutral - very gentle upward drift
        if (vy > -30) vy -= 40 * delta;
      }

      // Apply horizontal damping
      vx *= 0.98;

      // Calculate new position with wobble
      let newX = this.rocket.sprite.x + (vx + wobbleX) * delta;
      let newY = this.rocket.sprite.y + (vy + wobbleY) * delta;

      // Check for wall collisions and bounce
      if (this.currentLevel?.terrain) {
        for (const block of this.currentLevel.terrain) {
          const left = block.x - bubbleRadius;
          const right = block.x + block.width + bubbleRadius;
          const top = block.y - bubbleRadius;
          const bottom = block.y + block.height + bubbleRadius;

          if (newX > left && newX < right && newY > top && newY < bottom) {
            // Inside a block - determine bounce direction
            const fromLeft = newX - left;
            const fromRight = right - newX;
            const fromTop = newY - top;
            const fromBottom = bottom - newY;
            const minDist = Math.min(fromLeft, fromRight, fromTop, fromBottom);

            if (minDist === fromLeft) {
              newX = left;
              vx = -Math.abs(vx) * 0.6;
            } else if (minDist === fromRight) {
              newX = right;
              vx = Math.abs(vx) * 0.6;
            } else if (minDist === fromTop) {
              newY = top;
              vy = -Math.abs(vy) * 0.6;
            } else {
              newY = bottom;
              vy = Math.abs(vy) * 0.6;
            }
          }
        }
      }

      // Store velocity for next frame
      this.encapsulatingBubble.vx = vx;
      this.encapsulatingBubble.vy = vy;

      // Move rocket and bubble
      this.rocket.sprite.setPosition(newX, newY);
      this.encapsulatingBubble.bubble.setPosition(newX, newY);
      this.encapsulatingBubble.glow.setPosition(newX, newY);

      // Make sure rocket is visible above bubble
      this.rocket.sprite.setDepth(15);
      this.encapsulatingBubble.bubble.setDepth(14);
      this.encapsulatingBubble.glow.setDepth(13);

      // Update countdown visual for bubble gun bubbles (not spawn bubbles)
      if (!this.encapsulatingBubble.isSpawnBubble) {
        const timeRemaining = 1 - (this.encapsulatingBubble.elapsed / this.encapsulatingBubble.duration);
        const strokeWidth = Math.max(1, timeRemaining * 3); // From 3 to 1
        const bubbleColors = {
          blue: 0x88ccff,
          green: 0x88ff88,
          white: 0xcccccc,
        };
        this.encapsulatingBubble.bubble.setStrokeStyle(
          strokeWidth,
          bubbleColors[this.encapsulatingBubble.type],
          0.5 + timeRemaining * 0.5 // Alpha also fades
        );

        // Flash warning when about to pop (last 0.5 seconds)
        if (this.encapsulatingBubble.elapsed > this.encapsulatingBubble.duration - 500) {
          const flashRate = Math.sin(this.encapsulatingBubble.elapsed * 0.03) > 0;
          this.encapsulatingBubble.bubble.setAlpha(flashRate ? 0.5 : 0.2);
        }
      }

      // Pop after duration (skip for spawn bubbles - they pop on thrust)
      if (!this.encapsulatingBubble.isSpawnBubble &&
          this.encapsulatingBubble.elapsed >= this.encapsulatingBubble.duration) {
        this.releaseFromBubble();
      }
    }
  }

  /**
   * Encapsulate the rocket in a bubble.
   */
  private encapsulateRocket(sourceBubble: Phaser.GameObjects.Arc): void {
    if (!this.rocket) return;

    const bubbleType = sourceBubble.getData('bubbleType') as 'blue' | 'green' | 'white';

    // Destroy source bubble
    sourceBubble.destroy();

    // Use shared renderer for consistent visuals
    const { bubble, glow } = renderSpawnBubble(this, bubbleType);

    // Position at rocket
    bubble.setPosition(this.rocket.sprite.x, this.rocket.sprite.y);
    glow.setPosition(this.rocket.sprite.x, this.rocket.sprite.y);

    this.encapsulatingBubble = {
      bubble,
      glow,
      type: bubbleType,
      duration: 3000, // 3 seconds
      elapsed: 0,
      vx: 0,
      vy: 0,
      wobble: Math.random() * Math.PI * 2, // Random starting phase
    };

    // Disable rocket collision with terrain and hazards while in bubble
    this.setRocketCollisions(false);

    // Zero momentum and disable gravity while in bubble
    const body = this.rocket.sprite.body as Phaser.Physics.Arcade.Body;
    if (body) {
      body.setVelocity(0, 0);
      body.setAllowGravity(false);
    }
  }

  /**
   * Check if there's a clear line of sight between two points.
   */
  private hasLineOfSight(x1: number, y1: number, x2: number, y2: number): boolean {
    if (!this.currentLevel?.terrain) return true;

    const dx = x2 - x1;
    const dy = y2 - y1;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const steps = Math.ceil(dist / 10); // Check every 10 pixels

    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      const px = x1 + dx * t;
      const py = y1 + dy * t;

      // Check if this point is inside any terrain block
      for (const block of this.currentLevel.terrain) {
        if (px >= block.x && px <= block.x + block.width &&
            py >= block.y && py <= block.y + block.height) {
          return false; // Blocked by terrain
        }
      }
    }
    return true;
  }

  /**
   * Release rocket from encapsulating bubble.
   */
  private releaseFromBubble(): void {
    if (!this.encapsulatingBubble || !this.rocket) return;

    // Sync controller position to where the rocket is now
    const x = this.rocket.sprite.x;
    const y = this.rocket.sprite.y;

    // Calculate push away from nearby obstacles
    let pushX = 0;
    let pushY = -50; // Default slight upward push
    const pushRadius = 50;

    if (this.currentLevel?.terrain) {
      for (const block of this.currentLevel.terrain) {
        // Check distance to each edge of the block
        const closestX = Math.max(block.x, Math.min(x, block.x + block.width));
        const closestY = Math.max(block.y, Math.min(y, block.y + block.height));
        const dx = x - closestX;
        const dy = y - closestY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < pushRadius && dist > 0) {
          // Push away from this obstacle
          const pushStrength = (pushRadius - dist) / pushRadius * 150;
          pushX += (dx / dist) * pushStrength;
          pushY += (dy / dist) * pushStrength;
        }
      }
    }

    // Apply bubble velocity plus push
    const finalVx = this.encapsulatingBubble.vx + pushX;
    const finalVy = this.encapsulatingBubble.vy + pushY;

    this.rocket.controller.setPosition(x, y);
    this.rocket.controller.setVelocity(finalVx, finalVy);

    // Bubble Bobble style pop effect with stars
    const bubbleX = this.encapsulatingBubble.bubble.x;
    const bubbleY = this.encapsulatingBubble.bubble.y;
    const bubbleColor = this.encapsulatingBubble.type;

    // Get color for particles based on bubble type
    const particleColors = {
      green: 0x44ff44,
      blue: 0x4488ff,
      white: 0xffffff,
    };
    const particleColor = particleColors[bubbleColor];

    // Create 8 stars shooting outward
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const star = this.add.star(
        bubbleX,
        bubbleY,
        4, // 4 points
        3, // inner radius
        6, // outer radius
        particleColor
      );
      star.setDepth(100);
      star.setAlpha(1);

      const distance = 40 + Math.random() * 20;
      const targetX = bubbleX + Math.cos(angle) * distance;
      const targetY = bubbleY + Math.sin(angle) * distance;

      this.tweens.add({
        targets: star,
        x: targetX,
        y: targetY,
        alpha: 0,
        scale: 0.3,
        rotation: Math.PI * 2,
        duration: 350,
        ease: 'Power2',
        onComplete: () => star.destroy(),
      });
    }

    // Create smaller sparkle particles
    for (let i = 0; i < 6; i++) {
      const angle = Math.random() * Math.PI * 2;
      const sparkle = this.add.circle(
        bubbleX + Math.cos(angle) * 8,
        bubbleY + Math.sin(angle) * 8,
        2,
        0xffffff
      );
      sparkle.setDepth(100);

      const distance = 25 + Math.random() * 15;
      this.tweens.add({
        targets: sparkle,
        x: bubbleX + Math.cos(angle) * distance,
        y: bubbleY + Math.sin(angle) * distance,
        alpha: 0,
        scale: 0.2,
        duration: 250,
        ease: 'Power2',
        onComplete: () => sparkle.destroy(),
      });
    }

    // Quick expanding ring
    const ring = this.add.circle(bubbleX, bubbleY, 28, particleColor, 0);
    ring.setStrokeStyle(2, particleColor, 0.8);
    ring.setDepth(99);

    this.tweens.add({
      targets: ring,
      scaleX: 1.8,
      scaleY: 1.8,
      alpha: 0,
      duration: 200,
      onComplete: () => ring.destroy(),
    });

    // Destroy the bubble
    this.encapsulatingBubble.bubble.destroy();
    this.encapsulatingBubble.glow.destroy();
    this.encapsulatingBubble = null;

    // Re-enable collisions
    this.setRocketCollisions(true);

    // Re-enable gravity and sync physics body
    const body = this.rocket.sprite.body as Phaser.Physics.Arcade.Body;
    if (body) {
      body.setAllowGravity(true);
      body.reset(x, y);
    }

    // Reset rocket depth
    this.rocket.sprite.setDepth(10);
  }

  /**
   * Enable/disable rocket collisions (terrain and hazards).
   */
  private setRocketCollisions(enabled: boolean): void {
    // Find and update terrain and hazard colliders
    for (const collider of this.colliders) {
      if (collider.object2 === this.terrain || collider.object2 === this.hazards) {
        collider.active = enabled;
      }
    }
  }

  /**
   * Update warp zone collisions.
   */
  private updateWarpZones(delta: number): void {
    if (!this.rocket || this.warpZones.size === 0) return;

    // Update cooldown
    if (this.warpCooldown > 0) {
      this.warpCooldown -= delta;
      return;
    }

    const rocketX = this.rocket.sprite.x;
    const rocketY = this.rocket.sprite.y;

    // Check each warp zone
    for (const [id, zone] of this.warpZones) {
      // Check if rocket is inside this zone
      const halfW = zone.width / 2;
      const halfH = zone.height / 2;

      if (
        rocketX > zone.x - halfW &&
        rocketX < zone.x + halfW &&
        rocketY > zone.y - halfH &&
        rocketY < zone.y + halfH
      ) {
        // Find target zone
        const target = this.warpZones.get(zone.targetId);
        if (target) {
          // Teleport rocket to target zone
          this.rocket.sprite.setPosition(target.x, target.y);

          // Keep velocity
          const body = this.rocket.sprite.body as Phaser.Physics.Arcade.Body;
          if (body) {
            body.position.set(target.x - body.halfWidth, target.y - body.halfHeight);
          }

          // Visual effect at source
          this.createWarpEffect(zone.x, zone.y);
          // Visual effect at destination
          this.createWarpEffect(target.x, target.y);

          // Set cooldown to prevent instant re-warp
          this.warpCooldown = 0.5;
          break;
        }
      }
    }
  }

  /**
   * Create a warp teleport visual effect.
   */
  private createWarpEffect(x: number, y: number): void {
    // Flash
    const flash = this.add.circle(x, y, 40, 0xffffff, 0.8);
    this.tweens.add({
      targets: flash,
      scale: 2,
      alpha: 0,
      duration: 300,
      onComplete: () => flash.destroy(),
    });

    // Particles
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const particle = this.add.circle(x, y, 4, 0x8844ff, 0.8);
      this.tweens.add({
        targets: particle,
        x: x + Math.cos(angle) * 50,
        y: y + Math.sin(angle) * 50,
        alpha: 0,
        duration: 400,
        onComplete: () => particle.destroy(),
      });
    }
  }

  /**
   * Render update with interpolation.
   */
  protected renderUpdate(alpha: number): void {
    // Update input
    if (this.inputManager) {
      this.inputManager.update(1 / 60); // Use fixed delta for input smoothing
      this.currentInput = this.inputManager.getState();
    }

    // Update rocket visuals (skip renderUpdate when in bubble, Ready, or Landed state - they manage position directly)
    if (this.rocket) {
      // Only call renderUpdate when actively playing (not Ready, not encapsulated, not Landed)
      if (this.gameState !== GameState.Ready &&
          this.gameState !== GameState.Landed &&
          this.gameState !== GameState.Crashed &&
          !this.encapsulatingBubble) {
        this.rocket.renderUpdate(alpha);
      }
    }

    // Update state text
    if (this.stateText) {
      this.stateText.setText(this.getStateMessage());
    }
  }

  /**
   * Get message for current game state.
   */
  private getStateMessage(): string {
    switch (this.gameState) {
      case GameState.Ready:
        return '[ SPACE to start ]';
      case GameState.Playing:
        return '';
      case GameState.Landed:
        if (this.levelNumber >= 10) {
          return '★ VICTORY!';
        }
        return '✓ LANDED! [N] next';
      case GameState.Crashed:
        return '';
      default:
        return '';
    }
  }

  /**
   * Handle rocket crash.
   */
  private onRocketCrash(): void {
    this.gameState = GameState.Crashed;
    this.events.emit('levelFailed');

    // Create explosion effect at rocket position and hide it
    if (this.rocket?.sprite) {
      this.createExplosion(this.rocket.sprite.x, this.rocket.sprite.y);
      // Hide the rocket (including flame)
      this.rocket.setVisible(false);
    }

    // In test mode, return to editor after crash
    if (this.isTestMode) {
      this.time.delayedCall(1500, () => {
        this.returnToEditor();
      });
      return;
    }

    // Lose a life
    const gameOver = this.loseLife();

    this.time.delayedCall(1500, () => {
      if (gameOver) {
        this.showGameOverScreen();
      } else {
        this.restartLevel();
      }
    });
  }

  /**
   * Create explosion effect at position.
   */
  private createExplosion(x: number, y: number): void {
    // Main explosion flash
    const flash = this.add.circle(x, y, 30, 0xffaa00, 0.8);
    flash.setDepth(20);

    this.tweens.add({
      targets: flash,
      scaleX: 2.5,
      scaleY: 2.5,
      alpha: 0,
      duration: 300,
      ease: 'Power2',
      onComplete: () => flash.destroy(),
    });

    // Inner white-hot flash
    const innerFlash = this.add.circle(x, y, 15, 0xffffff, 1);
    innerFlash.setDepth(21);

    this.tweens.add({
      targets: innerFlash,
      scaleX: 2,
      scaleY: 2,
      alpha: 0,
      duration: 200,
      ease: 'Power3',
      onComplete: () => innerFlash.destroy(),
    });

    // Create debris particles
    const colors = [0xff4400, 0xff8800, 0xffcc00, 0xcccccc, 0x888888];
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2 + Math.random() * 0.5;
      const speed = 80 + Math.random() * 60;
      const size = 3 + Math.random() * 4;
      const color = colors[Math.floor(Math.random() * colors.length)];

      const particle = this.add.circle(x, y, size, color, 1);
      particle.setDepth(19);

      this.tweens.add({
        targets: particle,
        x: x + Math.cos(angle) * speed,
        y: y + Math.sin(angle) * speed + 30, // Add gravity effect
        alpha: 0,
        scale: 0.2,
        duration: 500 + Math.random() * 200,
        ease: 'Power2',
        onComplete: () => particle.destroy(),
      });
    }

    // Smoke puffs
    for (let i = 0; i < 6; i++) {
      const offsetX = (Math.random() - 0.5) * 30;
      const offsetY = (Math.random() - 0.5) * 30;

      const smoke = this.add.circle(x + offsetX, y + offsetY, 8 + Math.random() * 8, 0x444444, 0.6);
      smoke.setDepth(18);

      this.tweens.add({
        targets: smoke,
        x: x + offsetX + (Math.random() - 0.5) * 40,
        y: y + offsetY - 20 - Math.random() * 30,
        scaleX: 2,
        scaleY: 2,
        alpha: 0,
        duration: 600 + Math.random() * 400,
        ease: 'Sine.easeOut',
        onComplete: () => smoke.destroy(),
      });
    }
  }

  /**
   * Handle successful landing.
   */
  private onRocketLand(result: LandingResult): void {
    this.gameState = GameState.Landed;

    if (this.rocket) {
      const sprite = this.rocket.sprite;
      const body = sprite.body as Phaser.Physics.Arcade.Body;

      // Stop physics body completely
      body.setVelocity(0, 0);
      body.setAcceleration(0, 0);
      body.setEnable(false);

      // Find landing pad we landed on and position rocket on top
      if (this.currentLevel) {
        for (const pad of this.currentLevel.landingPads) {
          const padTop = pad.y;
          // Check if rocket is over this pad
          if (sprite.x > pad.x && sprite.x < pad.x + pad.width) {
            // Position rocket on top of pad visual surface
            // Snap immediately - no animation
            const targetY = padTop - 14;
            sprite.setY(targetY);
            sprite.setRotation(0);

            break;
          }
        }
      }
    }

    // Calculate score with time bonus and multiplier
    const baseScore = this.currentLevel?.baseScore ?? 100;
    const parTime = (this.currentLevel?.parTime ?? 30) * 1000; // Convert to ms
    const timeBonusMultiplier = this.currentLevel?.timeBonusMultiplier ?? 2;
    const stageTimeSeconds = this.stageTime / 1000;

    // Time bonus: if under par time, bonus = (parTime - actualTime) * multiplier
    // Minimum bonus is 0 (no penalty for being slow)
    let timeBonus = 0;
    if (this.stageTime < parTime) {
      const timeUnderPar = (parTime - this.stageTime) / 1000;
      timeBonus = Math.floor(timeUnderPar * timeBonusMultiplier);
    }

    // Calculate pre-multiplier score and apply multiplier
    const preMultiplierScore = baseScore + timeBonus;
    this.levelScore = Math.floor(preMultiplierScore * this.scoreMultiplier);
    GameScene.totalScore += this.levelScore;

    this.events.emit('levelComplete', {
      levelNumber: this.levelNumber,
      result,
      score: this.levelScore,
      timeBonus,
      multiplier: this.scoreMultiplier,
    });

    // In test mode, return to editor after successful landing
    if (this.isTestMode) {
      // Show brief success message
      const successText = this.add.text(
        Number(this.game.config.width) / 2,
        Number(this.game.config.height) / 2,
        'LANDED!\nReturning to editor...',
        {
          fontFamily: 'monospace',
          fontSize: '20px',
          color: '#00ff44',
          align: 'center',
        }
      ).setOrigin(0.5).setDepth(200);

      this.time.delayedCall(1500, () => {
        successText.destroy();
        this.returnToEditor();
      });
      return;
    }

    // Show animated end-of-level overlay
    this.showLevelCompleteOverlay(
      stageTimeSeconds,
      baseScore,
      timeBonus,
      this.scoreMultiplier,
      this.levelScore
    );
  }

  /**
   * Show animated level complete overlay with counting scores.
   */
  private showLevelCompleteOverlay(
    time: number,
    baseScore: number,
    timeBonus: number,
    multiplier: number,
    finalScore: number
  ): void {
    // Pause timers while showing level complete
    this.showingLevelComplete = true;

    const width = Number(this.game.config.width);
    const height = Number(this.game.config.height);
    const centerX = width / 2;
    const overlayElements: Phaser.GameObjects.GameObject[] = [];

    // Check for new high score
    const previousHighScore = GameScene.getLevelHighScore(this.levelNumber);
    const isNewBest = finalScore > previousHighScore;
    if (isNewBest) {
      GameScene.setLevelHighScore(this.levelNumber, finalScore);
    }

    // Check for new best time (lower is better)
    const previousBestTime = GameScene.getLevelBestTime(this.levelNumber);
    const isNewBestTime = previousBestTime === 0 || time < previousBestTime;
    if (isNewBestTime) {
      GameScene.setLevelBestTime(this.levelNumber, time);
    }

    // Check if there are any high scores or times to display (only showing top 5)
    let hasAnyHighScores = isNewBest || isNewBestTime;
    if (!hasAnyHighScores) {
      for (let lvl = 1; lvl <= 5; lvl++) {
        if (GameScene.getLevelHighScore(lvl) > 0 || GameScene.getLevelBestTime(lvl) > 0) {
          hasAnyHighScores = true;
          break;
        }
      }
    }

    // Layout: start centered, slide left if showing high scores
    const startColumnX = centerX;  // Start centered
    const leftColumnX = 180;       // Final position if showing HS table
    const rightColumnX = 460;      // Center of right side for NEW BEST text
    const scoreColumnX = hasAnyHighScores ? leftColumnX : centerX;

    // Container for all score elements (so we can animate them together)
    const scoreContainer = this.add.container(hasAnyHighScores ? startColumnX : centerX, 0);
    scoreContainer.setDepth(151);
    overlayElements.push(scoreContainer);

    // Dark overlay
    const overlay = this.add.rectangle(centerX, height / 2, width, height, 0x000000, 0);
    overlay.setDepth(150);
    overlayElements.push(overlay);

    this.tweens.add({
      targets: overlay,
      fillAlpha: 0.7,
      duration: 300,
    });

    // Title (centered, doesn't move)
    const title = this.add.text(centerX, 45, 'LEVEL COMPLETE', {
      fontFamily: 'monospace',
      fontSize: '28px',
      color: '#00ff44',
      stroke: '#004400',
      strokeThickness: 4,
    });
    title.setOrigin(0.5);
    title.setDepth(151);
    title.setAlpha(0);
    title.setScale(0.5);
    overlayElements.push(title);

    this.tweens.add({
      targets: title,
      alpha: 1,
      scale: 1,
      duration: 400,
      ease: 'Back.easeOut',
    });

    // === SCORE BREAKDOWN (in container, relative positions) ===
    let yPos = 90;
    const lineHeight = 24;
    let delay = 400;

    // Helper to create animated score line (using relative positions in container)
    const createScoreLine = (
      label: string,
      value: number,
      suffix: string = '',
      color: string = '#ffffff',
      countUp: boolean = true
    ): void => {
      const labelText = this.add.text(-70, yPos, label, {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#aaaaaa',
      });
      labelText.setOrigin(0, 0.5);
      labelText.setAlpha(0);
      scoreContainer.add(labelText);

      const valueText = this.add.text(70, yPos, countUp ? '0' + suffix : value.toString() + suffix, {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: color,
      });
      valueText.setOrigin(1, 0.5);
      valueText.setAlpha(0);
      scoreContainer.add(valueText);

      // Fade in
      this.time.delayedCall(delay, () => {
        this.tweens.add({
          targets: [labelText, valueText],
          alpha: 1,
          duration: 200,
        });

        // Count up animation
        if (countUp && value > 0) {
          const counter = { val: 0 };
          this.tweens.add({
            targets: counter,
            val: value,
            duration: 500,
            ease: 'Power2',
            onUpdate: () => {
              valueText.setText(Math.floor(counter.val).toString() + suffix);
            },
          });
        }
      });

      yPos += lineHeight;
      delay += 250;
    };

    // Time
    createScoreLine('TIME', parseFloat(time.toFixed(1)), 's', '#88ccff', false);

    // Base score
    createScoreLine('BASE', baseScore, '', '#ffffff');

    // Time bonus (if any)
    if (timeBonus > 0) {
      createScoreLine('TIME BONUS', timeBonus, '', '#44ff44');
    }

    // Multiplier (if > 1)
    if (multiplier > 1) {
      yPos += 6;
      const multLabel = this.add.text(-70, yPos, 'MULTIPLIER', {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#aaaaaa',
      });
      multLabel.setOrigin(0, 0.5);
      multLabel.setAlpha(0);
      scoreContainer.add(multLabel);

      const multValue = this.add.text(70, yPos, `×${multiplier.toFixed(1)}`, {
        fontFamily: 'monospace',
        fontSize: '18px',
        color: '#ffd700',
      });
      multValue.setOrigin(1, 0.5);
      multValue.setAlpha(0);
      scoreContainer.add(multValue);

      this.time.delayedCall(delay, () => {
        this.tweens.add({
          targets: [multLabel, multValue],
          alpha: 1,
          duration: 200,
        });

        // Pulse effect on multiplier
        this.tweens.add({
          targets: multValue,
          scale: 1.2,
          duration: 150,
          yoyo: true,
          ease: 'Power2',
        });
      });

      yPos += lineHeight + 6;
      delay += 350;
    }

    // Divider line
    yPos += 4;
    const divider = this.add.rectangle(0, yPos, 160, 2, 0x666666);
    divider.setAlpha(0);
    scoreContainer.add(divider);

    this.time.delayedCall(delay, () => {
      this.tweens.add({
        targets: divider,
        alpha: 1,
        duration: 200,
      });
    });

    delay += 200;
    yPos += 16;

    // Final score (big, with count-up)
    const finalLabel = this.add.text(0, yPos, 'SCORE', {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#888888',
    });
    finalLabel.setOrigin(0.5);
    finalLabel.setAlpha(0);
    scoreContainer.add(finalLabel);

    yPos += 22;

    const finalValue = this.add.text(0, yPos, '0', {
      fontFamily: 'monospace',
      fontSize: '28px',
      color: '#00ff44',
      stroke: '#004400',
      strokeThickness: 2,
    });
    finalValue.setOrigin(0.5);
    finalValue.setAlpha(0);
    scoreContainer.add(finalValue);

    // "NEW BEST!" text (shown on right side where table will appear)
    const newBestText = this.add.text(rightColumnX, 150, 'NEW BEST!', {
      fontFamily: 'monospace',
      fontSize: '28px',
      color: '#ffd700',
      stroke: '#885500',
      strokeThickness: 4,
    });
    newBestText.setOrigin(0.5);
    newBestText.setAlpha(0);
    newBestText.setScale(0);
    newBestText.setDepth(152);
    overlayElements.push(newBestText);

    const scoreCountDelay = delay;

    // Create sparkle effect helper
    const createSparkle = (x: number, y: number, color: number = 0xffd700) => {
      const sparkle = this.add.star(x, y, 4, 2, 6, color);
      sparkle.setDepth(160);
      sparkle.setAlpha(0);
      sparkle.setScale(0);
      overlayElements.push(sparkle);

      this.tweens.add({
        targets: sparkle,
        alpha: 1,
        scale: 1.5,
        rotation: Math.PI,
        duration: 400,
        ease: 'Power2',
        onComplete: () => {
          this.tweens.add({
            targets: sparkle,
            alpha: 0,
            scale: 0,
            rotation: Math.PI * 2,
            duration: 300,
            ease: 'Power2',
            onComplete: () => sparkle.destroy(),
          });
        },
      });
    };

    // Create burst of sparkles helper
    const createSparkleBurst = (x: number, y: number, count: number = 8, color: number = 0xffd700) => {
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 / count) * i;
        const dist = 30 + Math.random() * 20;
        const sparkX = x + Math.cos(angle) * dist;
        const sparkY = y + Math.sin(angle) * dist;

        this.time.delayedCall(i * 30, () => {
          createSparkle(sparkX, sparkY, color);
        });
      }
    };

    this.time.delayedCall(delay, () => {
      this.tweens.add({
        targets: [finalLabel, finalValue],
        alpha: 1,
        duration: 200,
      });

      // Count up final score with escalating effects
      const counter = { val: 0 };
      let lastMilestone = 0;
      this.tweens.add({
        targets: counter,
        val: finalScore,
        duration: 800,
        ease: 'Power2',
        onUpdate: () => {
          const currentVal = Math.floor(counter.val);
          finalValue.setText(currentVal.toString());

          // Create sparkles at milestones (every 50 points)
          if (currentVal - lastMilestone >= 50) {
            lastMilestone = Math.floor(currentVal / 50) * 50;
            const sparkX = scoreContainer.x + (Math.random() - 0.5) * 60;
            const sparkY = yPos + (Math.random() - 0.5) * 30;
            createSparkle(sparkX, sparkY, 0x44ff44);
          }
        },
        onComplete: () => {
          // Big pulse when done
          this.tweens.add({
            targets: finalValue,
            scale: 1.3,
            duration: 200,
            yoyo: true,
            ease: 'Back.easeOut',
          });

          // If new best, show "NEW BEST!" on right and start sliding simultaneously
          if (isNewBest) {
            // Flash effect on screen
            const flash = this.add.rectangle(centerX, height / 2, width, height, 0xffd700, 0);
            flash.setDepth(155);
            overlayElements.push(flash);

            this.tweens.add({
              targets: flash,
              fillAlpha: 0.3,
              duration: 100,
              yoyo: true,
              onComplete: () => flash.destroy(),
            });

            // Show NEW BEST! on the right with dramatic entrance
            this.tweens.add({
              targets: newBestText,
              alpha: 1,
              scale: 1.2,
              duration: 400,
              ease: 'Back.easeOut',
            });

            // Pulsing/flashing effect on NEW BEST while waiting for table
            this.tweens.add({
              targets: newBestText,
              scale: 1.3,
              duration: 400,
              yoyo: true,
              repeat: -1,
              ease: 'Sine.easeInOut',
              delay: 400,
            });

            // Continuous sparkles around NEW BEST on the right
            this.time.addEvent({
              delay: 150,
              callback: () => {
                const sx = rightColumnX + (Math.random() - 0.5) * 140;
                const sy = 150 + (Math.random() - 0.5) * 60;
                createSparkle(sx, sy, 0xffd700);
              },
              repeat: 12,
            });

            // Also slide the score to the left at the same time
            if (hasAnyHighScores) {
              this.tweens.add({
                targets: scoreContainer,
                x: leftColumnX,
                duration: 600,
                ease: 'Back.easeOut',
                delay: 200,
              });
            }
          } else if (hasAnyHighScores) {
            // No new best, just slide score to left
            this.time.delayedCall(300, () => {
              this.tweens.add({
                targets: scoreContainer,
                x: leftColumnX,
                duration: 600,
                ease: 'Back.easeOut',
              });
            });
          }
        },
      });
    });

    // === RIGHT COLUMNS: LEVELS and GAME sections ===
    if (hasAnyHighScores) {
      const tableStartY = 85;
      const tableLineHeight = 20;
      const tableDelay = scoreCountDelay + (isNewBest ? 1600 : 1100);

      const levelColumnX = 370;   // LEVEL leaderboard
      const gameColumnX = 530;    // GAME leaderboard

      // Fake player names for both leaderboards
      const fakeNames = [
        'AceRocket', 'StarPilot', 'NovaCadet', 'CosmicAce', 'LunarPro',
        'OrbitKing', 'AstroNerd', 'VoidDiver', 'SkyBlazer', 'JetStream',
        'CometTail', 'GalaxyX', 'Moonshot', 'RocketMan', 'SpaceOwl',
        'StellarOne', 'ZeroGrav', 'PlanetHop', 'NebulaAce', 'FlightPro',
      ];

      // === LEVEL Container ===
      const levelContainer = this.add.container(width + 100, 0);
      levelContainer.setDepth(151);
      overlayElements.push(levelContainer);

      // LEVEL header - starts with (SCORE), switches to (TIME)
      const levelHeader = this.add.text(0, tableStartY, 'LEVEL (SCORE)', {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#8888ff',
      });
      levelHeader.setOrigin(0.5);
      levelContainer.add(levelHeader);

      // Generate fake LEVEL scores
      const fakeLevelScores: { score: number; time: number; name: string }[] = [];
      for (let i = 0; i < 1000; i++) {
        const lvlScore = Math.floor(80 + Math.pow(Math.random(), 0.6) * 600);
        const lvlTime = 5 + Math.random() * 55; // 5-60 seconds
        const nameIndex = (i * 7 + i * i) % fakeNames.length;
        fakeLevelScores.push({ score: lvlScore, time: lvlTime, name: fakeNames[nameIndex] });
      }

      // Sort by score for initial display
      const scoreRanked = [...fakeLevelScores].sort((a, b) => b.score - a.score);
      // Sort by time for second display (lower is better)
      const timeRanked = [...fakeLevelScores].sort((a, b) => a.time - b.time);

      // Find user's rank in score leaderboard
      let scoreRank = scoreRanked.findIndex(entry => finalScore > entry.score);
      if (scoreRank === -1) scoreRank = scoreRanked.length;
      scoreRank++;

      // Find user's rank in time leaderboard
      let timeRank = timeRanked.findIndex(entry => time < entry.time);
      if (timeRank === -1) timeRank = timeRanked.length;
      timeRank++;

      // Create score entries
      const scoreEntries: Phaser.GameObjects.Text[] = [];
      const scoreDisplayStart = Math.max(1, scoreRank - 2);
      const scoreDisplayEnd = Math.min(scoreRanked.length, scoreRank + 2);

      let levelRow = 0;
      for (let rank = scoreDisplayStart; rank <= scoreDisplayEnd && levelRow < 5; rank++) {
        const entryY = tableStartY + 24 + levelRow * tableLineHeight;
        const isUser = rank === scoreRank;

        let name: string;
        let score: number;
        if (isUser) {
          name = 'YOU';
          score = finalScore;
        } else {
          const fakeIndex = rank > scoreRank ? rank - 2 : rank - 1;
          name = scoreRanked[fakeIndex]?.name ?? 'Player';
          score = scoreRanked[fakeIndex]?.score ?? 0;
        }

        const entryText = this.add.text(-60, entryY, `${rank}: ${name}`, {
          fontFamily: 'monospace',
          fontSize: '11px',
          color: isUser ? '#ffd700' : '#6666aa',
        });
        entryText.setOrigin(0, 0.5);
        entryText.setAlpha(0);
        levelContainer.add(entryText);
        scoreEntries.push(entryText);

        const valueText = this.add.text(60, entryY, score.toString(), {
          fontFamily: 'monospace',
          fontSize: '11px',
          color: isUser ? '#ffd700' : '#8888bb',
        });
        valueText.setOrigin(1, 0.5);
        valueText.setAlpha(0);
        levelContainer.add(valueText);
        scoreEntries.push(valueText);

        levelRow++;
      }

      // Create time entries (hidden initially)
      const timeEntries: Phaser.GameObjects.Text[] = [];
      const timeDisplayStart = Math.max(1, timeRank - 2);
      const timeDisplayEnd = Math.min(timeRanked.length, timeRank + 2);

      let timeRow = 0;
      for (let rank = timeDisplayStart; rank <= timeDisplayEnd && timeRow < 5; rank++) {
        const entryY = tableStartY + 24 + timeRow * tableLineHeight;
        const isUser = rank === timeRank;

        let name: string;
        let entryTime: number;
        if (isUser) {
          name = 'YOU';
          entryTime = time;
        } else {
          const fakeIndex = rank > timeRank ? rank - 2 : rank - 1;
          name = timeRanked[fakeIndex]?.name ?? 'Player';
          entryTime = timeRanked[fakeIndex]?.time ?? 0;
        }

        const entryText = this.add.text(-60, entryY, `${rank}: ${name}`, {
          fontFamily: 'monospace',
          fontSize: '11px',
          color: isUser ? '#ffd700' : '#6666aa',
        });
        entryText.setOrigin(0, 0.5);
        entryText.setAlpha(0);
        levelContainer.add(entryText);
        timeEntries.push(entryText);

        const valueText = this.add.text(60, entryY, entryTime.toFixed(1) + 's', {
          fontFamily: 'monospace',
          fontSize: '11px',
          color: isUser ? '#88ccff' : '#6688aa',
        });
        valueText.setOrigin(1, 0.5);
        valueText.setAlpha(0);
        levelContainer.add(valueText);
        timeEntries.push(valueText);

        timeRow++;
      }

      // Animate score entries in
      this.time.delayedCall(tableDelay + 400, () => {
        this.tweens.add({
          targets: scoreEntries,
          alpha: 1,
          duration: 200,
        });
      });

      // Cycle between SCORE and TIME every 2.5 seconds
      let showingScore = true;
      const toggleLevelDisplay = () => {
        if (showingScore) {
          // Switch to TIME
          this.tweens.add({
            targets: scoreEntries,
            alpha: 0,
            duration: 300,
          });
          levelHeader.setText('LEVEL (TIME)');
          this.time.delayedCall(350, () => {
            this.tweens.add({
              targets: timeEntries,
              alpha: 1,
              duration: 200,
            });
          });
        } else {
          // Switch to SCORE
          this.tweens.add({
            targets: timeEntries,
            alpha: 0,
            duration: 300,
          });
          levelHeader.setText('LEVEL (SCORE)');
          this.time.delayedCall(350, () => {
            this.tweens.add({
              targets: scoreEntries,
              alpha: 1,
              duration: 200,
            });
          });
        }
        showingScore = !showingScore;
      };

      // Start cycling after initial display
      let levelCycleTimer: Phaser.Time.TimerEvent | null = null;
      const startCycleTimer = this.time.delayedCall(tableDelay + 2500, () => {
        toggleLevelDisplay();
        levelCycleTimer = this.time.addEvent({
          delay: 2500,
          callback: toggleLevelDisplay,
          callbackScope: this,
          loop: true,
        });
      });

      // Store cleanup function to stop the timer when overlay is dismissed
      const cleanupLevelTimer = () => {
        startCycleTimer.remove();
        if (levelCycleTimer) {
          levelCycleTimer.remove();
        }
      };
      // Attach cleanup to be called when overlay is destroyed
      (overlayElements as any).cleanupLevelTimer = cleanupLevelTimer;

      // === GAME Container ===
      const gameContainer = this.add.container(width + 200, 0);
      gameContainer.setDepth(151);
      overlayElements.push(gameContainer);

      const userScore = GameScene.totalScore;

      // GAME header with total score
      const gameHeader = this.add.text(0, tableStartY, `GAME: ${userScore}`, {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#ff8844',
      });
      gameHeader.setOrigin(0.5);
      gameContainer.add(gameHeader);

      // Generate fake GAME scores
      const fakeGameScores: { score: number; name: string }[] = [];
      for (let i = 0; i < 1000; i++) {
        const gameScore = Math.floor(50 + Math.pow(Math.random(), 0.7) * 2000);
        const nameIndex = (i * 11 + i * i * 3) % fakeNames.length;
        fakeGameScores.push({ score: gameScore, name: fakeNames[nameIndex] });
      }
      fakeGameScores.sort((a, b) => b.score - a.score);

      // Find user's rank in game leaderboard
      let gameRank = fakeGameScores.findIndex(entry => userScore > entry.score);
      if (gameRank === -1) gameRank = fakeGameScores.length;
      gameRank++;

      // Show game leaderboard entries
      const gameDisplayStart = Math.max(1, gameRank - 2);
      const gameDisplayEnd = Math.min(fakeGameScores.length, gameRank + 2);

      let gameRow = 0;
      for (let rank = gameDisplayStart; rank <= gameDisplayEnd && gameRow < 5; rank++) {
        const entryY = tableStartY + 24 + gameRow * tableLineHeight;
        const isUser = rank === gameRank;

        let name: string;
        let entryScore: number;
        if (isUser) {
          name = 'YOU';
          entryScore = userScore;
        } else {
          const fakeIndex = rank > gameRank ? rank - 2 : rank - 1;
          name = fakeGameScores[fakeIndex]?.name ?? 'Player';
          entryScore = fakeGameScores[fakeIndex]?.score ?? 0;
        }

        const entryText = this.add.text(-60, entryY, `${rank}: ${name}`, {
          fontFamily: 'monospace',
          fontSize: '11px',
          color: isUser ? '#ffd700' : '#aa8866',
        });
        entryText.setOrigin(0, 0.5);
        entryText.setAlpha(0);
        gameContainer.add(entryText);

        const scoreText = this.add.text(60, entryY, entryScore.toString(), {
          fontFamily: 'monospace',
          fontSize: '11px',
          color: isUser ? '#ffd700' : '#cc9966',
        });
        scoreText.setOrigin(1, 0.5);
        scoreText.setAlpha(0);
        gameContainer.add(scoreText);

        this.time.delayedCall(tableDelay + 500 + gameRow * 50, () => {
          this.tweens.add({
            targets: [entryText, scoreText],
            alpha: 1,
            duration: 200,
          });

          if (isUser) {
            this.time.delayedCall(200, () => {
              createSparkle(gameColumnX + 20, entryY, 0xff8844);
              createSparkle(gameColumnX - 20, entryY, 0xff8844);
            });
          }
        });

        gameRow++;
      }

      // Slide in both containers
      this.time.delayedCall(tableDelay, () => {
        this.tweens.add({
          targets: levelContainer,
          x: levelColumnX,
          duration: 500,
          ease: 'Back.easeOut',
        });
        this.tweens.add({
          targets: gameContainer,
          x: gameColumnX,
          duration: 500,
          ease: 'Back.easeOut',
          delay: 100,
        });

        // Fade out NEW BEST text as tables appear
        if (isNewBest) {
          this.tweens.add({
            targets: newBestText,
            alpha: 0,
            y: 70,
            scale: 0.8,
            duration: 400,
            ease: 'Power2',
          });
        }
      });
    }

    // Capture the current level number for the callback
    const currentLevel = this.levelNumber;
    // Longer delay if showing high scores table (need time for slide + table animation)
    const buttonDelay = hasAnyHighScores ? scoreCountDelay + 2500 : scoreCountDelay + 1000;

    // Show continue button after animations complete
    this.time.delayedCall(buttonDelay, () => {
      const btnY = 310;

      // Continue button background (centered)
      const continueBtn = this.add.rectangle(centerX, btnY, 160, 40, 0x004422);
      continueBtn.setStrokeStyle(2, 0x00ff44);
      continueBtn.setDepth(152);
      continueBtn.setAlpha(0);
      continueBtn.setInteractive({ useHandCursor: true });
      overlayElements.push(continueBtn);

      // Continue button text
      const continueText = this.add.text(centerX, btnY, 'CONTINUE', {
        fontFamily: 'monospace',
        fontSize: '18px',
        color: '#00ff44',
      });
      continueText.setOrigin(0.5);
      continueText.setDepth(152);
      continueText.setAlpha(0);
      overlayElements.push(continueText);

      // Fade in button
      this.tweens.add({
        targets: [continueBtn, continueText],
        alpha: 1,
        duration: 300,
        ease: 'Power2',
      });

      // Hover effects
      continueBtn.on('pointerover', () => {
        continueBtn.setFillStyle(0x006633);
        continueText.setScale(1.05);
      });
      continueBtn.on('pointerout', () => {
        continueBtn.setFillStyle(0x004422);
        continueText.setScale(1);
      });

      // Click handler
      continueBtn.on('pointerdown', () => {
        // Disable button to prevent double-clicks
        continueBtn.disableInteractive();

        // Clean up any timers before destroying overlay
        if ((overlayElements as any).cleanupLevelTimer) {
          (overlayElements as any).cleanupLevelTimer();
        }

        // Fade out overlay
        this.tweens.add({
          targets: overlayElements,
          alpha: 0,
          duration: 300,
          onComplete: () => {
            overlayElements.forEach(el => el.destroy());

            if (currentLevel < 10) {
              this.loadLevel(currentLevel + 1);
            } else {
              this.showVictoryScreen();
            }
          },
        });
      });

      // Also allow SPACE or ENTER to continue
      const continueHandler = (event: KeyboardEvent) => {
        if (event.code === 'Space' || event.code === 'Enter') {
          this.input.keyboard?.off('keydown', continueHandler);
          continueBtn.emit('pointerdown');
        }
      };
      this.input.keyboard?.on('keydown', continueHandler);
    });
  }

  /**
   * Show game over screen when all lives are lost.
   */
  private showGameOverScreen(): void {
    const width = Number(this.game.config.width);
    const height = Number(this.game.config.height);
    const centerX = width / 2;

    // Create container for all game over elements
    this.gameOverContainer = this.add.container(0, 0);
    this.gameOverContainer.setDepth(150);

    // Dark overlay
    const overlay = this.add.rectangle(centerX, height / 2, width, height, 0x000000, 0.85);
    this.gameOverContainer.add(overlay);

    // Game Over title
    const gameOverText = this.add.text(centerX, 100, 'GAME OVER', {
      fontFamily: 'monospace',
      fontSize: '36px',
      color: '#ff4444',
      stroke: '#440000',
      strokeThickness: 4,
    });
    gameOverText.setOrigin(0.5);
    gameOverText.setAlpha(0);
    gameOverText.setScale(0.5);
    this.gameOverContainer.add(gameOverText);

    // Animate in
    this.tweens.add({
      targets: gameOverText,
      alpha: 1,
      scale: 1,
      duration: 500,
      ease: 'Back.easeOut',
    });

    // Final score display
    const scoreLabel = this.add.text(centerX, 160, 'FINAL SCORE', {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#888888',
    });
    scoreLabel.setOrigin(0.5);
    scoreLabel.setAlpha(0);
    this.gameOverContainer.add(scoreLabel);

    const scoreValue = this.add.text(centerX, 190, GameScene.totalScore.toString(), {
      fontFamily: 'monospace',
      fontSize: '32px',
      color: '#ffffff',
    });
    scoreValue.setOrigin(0.5);
    scoreValue.setAlpha(0);
    this.gameOverContainer.add(scoreValue);

    // Level reached
    const levelLabel = this.add.text(centerX, 230, `Reached Level ${this.levelNumber}`, {
      fontFamily: 'monospace',
      fontSize: '14px',
      color: '#888888',
    });
    levelLabel.setOrigin(0.5);
    levelLabel.setAlpha(0);
    this.gameOverContainer.add(levelLabel);

    // Fade in score info
    this.time.delayedCall(500, () => {
      if (!this.gameOverContainer) return;
      this.tweens.add({
        targets: [scoreLabel, scoreValue, levelLabel],
        alpha: 1,
        duration: 400,
      });
    });

    // Try Again button
    this.time.delayedCall(1200, () => {
      if (!this.gameOverContainer) return;
      const btnY = 290;

      const tryAgainBtn = this.add.rectangle(centerX, btnY, 160, 40, 0x442222);
      tryAgainBtn.setStrokeStyle(2, 0xff4444);
      tryAgainBtn.setAlpha(0);
      tryAgainBtn.setInteractive({ useHandCursor: true });
      this.gameOverContainer.add(tryAgainBtn);

      const tryAgainText = this.add.text(centerX, btnY, 'TRY AGAIN', {
        fontFamily: 'monospace',
        fontSize: '18px',
        color: '#ff4444',
      });
      tryAgainText.setOrigin(0.5);
      tryAgainText.setAlpha(0);
      this.gameOverContainer.add(tryAgainText);

      this.tweens.add({
        targets: [tryAgainBtn, tryAgainText],
        alpha: 1,
        duration: 300,
      });

      tryAgainBtn.on('pointerover', () => {
        tryAgainBtn.setFillStyle(0x663333);
        tryAgainText.setScale(1.05);
      });
      tryAgainBtn.on('pointerout', () => {
        tryAgainBtn.setFillStyle(0x442222);
        tryAgainText.setScale(1);
      });
      tryAgainBtn.on('pointerdown', () => {
        // Reset and start from level 1
        this.loadLevel(1);
      });

      // Also allow SPACE or ENTER to retry
      const retryHandler = (event: KeyboardEvent) => {
        if (event.code === 'Space' || event.code === 'Enter') {
          this.input.keyboard?.off('keydown', retryHandler);
          this.loadLevel(1);
        }
      };
      this.input.keyboard?.on('keydown', retryHandler);
    });
  }

  /**
   * Show final victory screen.
   */
  private showVictoryScreen(): void {
    const width = Number(this.game.config.width);
    const height = Number(this.game.config.height);
    const centerX = width / 2;

    // Check for new total high score
    const previousTotalHighScore = GameScene.getTotalHighScore();
    const isNewTotalBest = GameScene.totalScore > previousTotalHighScore;
    if (isNewTotalBest) {
      GameScene.setTotalHighScore(GameScene.totalScore);
    }

    // Dark overlay
    const overlay = this.add.rectangle(centerX, height / 2, width, height, 0x000000, 0.8);
    overlay.setDepth(150);

    // Victory title
    const victory = this.add.text(centerX, 80, '★ VICTORY! ★', {
      fontFamily: 'monospace',
      fontSize: '36px',
      color: '#ffd700',
      stroke: '#885500',
      strokeThickness: 4,
    });
    victory.setOrigin(0.5);
    victory.setDepth(151);

    // Pulsing animation
    this.tweens.add({
      targets: victory,
      scale: 1.1,
      duration: 500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Final score with count-up
    const scoreLabel = this.add.text(centerX, 135, 'FINAL SCORE', {
      fontFamily: 'monospace',
      fontSize: '14px',
      color: '#888888',
    });
    scoreLabel.setOrigin(0.5);
    scoreLabel.setDepth(151);

    const scoreValue = this.add.text(centerX, 170, '0', {
      fontFamily: 'monospace',
      fontSize: '40px',
      color: '#00ff44',
      stroke: '#004400',
      strokeThickness: 3,
    });
    scoreValue.setOrigin(0.5);
    scoreValue.setDepth(151);

    // "NEW BEST!" text for total score
    const newBestText = this.add.text(centerX, 145, 'NEW BEST!', {
      fontFamily: 'monospace',
      fontSize: '14px',
      color: '#ffd700',
      stroke: '#885500',
      strokeThickness: 2,
    });
    newBestText.setOrigin(0.5);
    newBestText.setDepth(151);
    newBestText.setAlpha(0);
    newBestText.setScale(0);

    // High score display
    const highScoreText = this.add.text(centerX, 205, '', {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#888888',
    });
    highScoreText.setOrigin(0.5);
    highScoreText.setDepth(151);
    highScoreText.setAlpha(0);

    // Count up
    const counter = { val: 0 };
    this.tweens.add({
      targets: counter,
      val: GameScene.totalScore,
      duration: 1500,
      ease: 'Power2',
      onUpdate: () => {
        scoreValue.setText(Math.floor(counter.val).toString());
      },
      onComplete: () => {
        // Show "NEW BEST!" if applicable
        if (isNewTotalBest) {
          this.tweens.add({
            targets: newBestText,
            alpha: 1,
            scale: 1,
            duration: 400,
            ease: 'Back.easeOut',
          });

          // Pulsing glow effect
          this.tweens.add({
            targets: newBestText,
            scale: 1.1,
            duration: 400,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
          });
        }

        // Show high score
        const displayHighScore = isNewTotalBest ? GameScene.totalScore : previousTotalHighScore;
        if (displayHighScore > 0) {
          highScoreText.setText(`BEST: ${displayHighScore}`);
          this.tweens.add({
            targets: highScoreText,
            alpha: 1,
            duration: 300,
          });
        }
      },
    });

    // Total time
    const timeLabel = this.add.text(centerX, 235, 'TOTAL TIME', {
      fontFamily: 'monospace',
      fontSize: '14px',
      color: '#888888',
    });
    timeLabel.setOrigin(0.5);
    timeLabel.setDepth(151);

    const timeValue = this.add.text(centerX, 265, this.formatTime(this.gameTime), {
      fontFamily: 'monospace',
      fontSize: '24px',
      color: '#88ccff',
    });
    timeValue.setOrigin(0.5);
    timeValue.setDepth(151);
  }

  /**
   * Create spark particles for rough landings.
   */
  private createLandingSparks(x: number, y: number, intensity: number): void {
    const numSparks = Math.floor(5 + intensity * 10);
    for (let i = 0; i < numSparks; i++) {
      const spark = this.add.circle(
        x + (Math.random() - 0.5) * 30,
        y,
        2 + Math.random() * 2,
        0xffaa00
      );
      spark.setDepth(20);

      const angle = Math.PI + (Math.random() - 0.5) * Math.PI * 0.8;
      const speed = 50 + Math.random() * 100 * intensity;

      this.tweens.add({
        targets: spark,
        x: spark.x + Math.cos(angle) * speed,
        y: spark.y + Math.sin(angle) * speed * 0.5,
        alpha: 0,
        scale: 0,
        duration: 300 + Math.random() * 200,
        ease: 'Quad.easeOut',
        onComplete: () => spark.destroy(),
      });
    }
  }

  /**
   * Restart the current level.
   */
  restartLevel(): void {
    this.loadLevel(this.levelNumber);
  }

  /**
   * Get current game state.
   */
  getGameState(): GameState {
    return this.gameState;
  }

  /**
   * Get current level number.
   */
  getLevelNumber(): number {
    return this.levelNumber;
  }

  /**
   * Clean up when scene shuts down.
   */
  shutdown(): void {
    this.clearLevel();

    if (this.inputManager) {
      // Don't destroy global input manager
      this.inputManager = null;
    }
  }
}
