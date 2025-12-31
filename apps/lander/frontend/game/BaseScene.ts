/**
 * @fileoverview Base scene class providing fixed timestep physics updates.
 * All game scenes should extend this class to ensure deterministic physics.
 */

import * as Phaser from 'phaser';
import { PHYSICS_CONFIG } from './Game';

/**
 * Scene lifecycle state for tracking initialization status.
 */
export enum SceneState {
  /** Scene has not been initialized */
  Uninitialized = 'uninitialized',
  /** Scene is currently loading assets */
  Loading = 'loading',
  /** Scene is active and running */
  Running = 'running',
  /** Scene is paused */
  Paused = 'paused',
  /** Scene has been shutdown */
  Shutdown = 'shutdown',
}

/**
 * Abstract base scene class that implements fixed timestep physics.
 *
 * This class provides:
 * - Deterministic fixed timestep updates via `fixedUpdate()`
 * - Interpolation support for smooth rendering between physics steps
 * - Scene state management
 * - Pause/resume functionality
 *
 * @example
 * ```typescript
 * class GameScene extends BaseScene {
 *   constructor() {
 *     super('GameScene');
 *   }
 *
 *   protected fixedUpdate(delta: number): void {
 *     // Physics updates happen here at fixed intervals
 *     this.rocket.update(delta);
 *   }
 *
 *   protected renderUpdate(alpha: number): void {
 *     // Interpolation for smooth rendering
 *     this.rocket.interpolate(alpha);
 *   }
 * }
 * ```
 */
export abstract class BaseScene extends Phaser.Scene {
  /** Current scene lifecycle state */
  protected sceneState: SceneState = SceneState.Uninitialized;

  /** Accumulated time for fixed timestep calculation */
  private accumulator = 0;

  /** Current gravity value for this scene */
  protected gravity: number;

  /**
   * Creates a new BaseScene instance.
   *
   * @param key - Unique identifier for this scene
   * @param gravity - Gravity value for this scene (default: 200)
   */
  constructor(key: string, gravity = 200) {
    super({ key });
    this.gravity = gravity;
  }

  /**
   * Phaser preload lifecycle method.
   * Override to load assets. Call super.preload() if overriding.
   */
  preload(): void {
    this.sceneState = SceneState.Loading;
  }

  /**
   * Phaser create lifecycle method.
   * Override to set up scene. Call super.create() if overriding.
   */
  create(): void {
    this.sceneState = SceneState.Running;
    this.accumulator = 0;

    // Update physics gravity if different from config
    if (this.physics.world) {
      this.physics.world.gravity.y = this.gravity;
    }

    // Setup pause/resume handlers
    this.events.on('pause', this.onPause, this);
    this.events.on('resume', this.onResume, this);
    this.events.on('shutdown', this.onShutdown, this);
  }

  /**
   * Phaser update lifecycle method.
   * Implements fixed timestep loop. Do not override directly.
   *
   * @param time - Total elapsed time in milliseconds
   * @param delta - Time since last frame in milliseconds
   */
  update(_time: number, delta: number): void {
    if (this.sceneState !== SceneState.Running) {
      return;
    }

    // Clamp delta to prevent spiral of death
    const clampedDelta = Math.min(
      delta,
      PHYSICS_CONFIG.FIXED_DELTA_MS * PHYSICS_CONFIG.MAX_FRAME_SKIP
    );

    this.accumulator += clampedDelta;

    // Run fixed updates
    let steps = 0;
    while (
      this.accumulator >= PHYSICS_CONFIG.FIXED_DELTA_MS &&
      steps < PHYSICS_CONFIG.MAX_FRAME_SKIP
    ) {
      this.fixedUpdate(PHYSICS_CONFIG.FIXED_DELTA);
      this.accumulator -= PHYSICS_CONFIG.FIXED_DELTA_MS;
      steps++;
    }

    // Calculate interpolation alpha for smooth rendering
    const alpha = this.accumulator / PHYSICS_CONFIG.FIXED_DELTA_MS;
    this.renderUpdate(alpha);
  }

  /**
   * Fixed timestep update method.
   * Override this method to implement deterministic physics updates.
   *
   * @param delta - Fixed delta time in seconds (always PHYSICS_CONFIG.FIXED_DELTA)
   */
  protected abstract fixedUpdate(delta: number): void;

  /**
   * Render interpolation update method.
   * Override to implement smooth rendering between physics steps.
   *
   * @param alpha - Interpolation factor (0 to 1) between physics steps
   */
  protected renderUpdate(alpha: number): void {
    // Default implementation does nothing
    // Override in subclasses for interpolation
    void alpha;
  }

  /**
   * Sets the gravity for this scene.
   *
   * @param gravity - New gravity value (positive = downward)
   */
  protected setGravity(gravity: number): void {
    this.gravity = gravity;
    if (this.physics.world) {
      this.physics.world.gravity.y = gravity;
    }
  }

  /**
   * Gets the current gravity value.
   *
   * @returns Current gravity value
   */
  protected getGravity(): number {
    return this.gravity;
  }

  /**
   * Pauses the scene.
   */
  pause(): void {
    if (this.sceneState === SceneState.Running) {
      this.scene.pause();
    }
  }

  /**
   * Resumes the scene.
   */
  resume(): void {
    if (this.sceneState === SceneState.Paused) {
      this.scene.resume();
    }
  }

  /**
   * Handler for scene pause event.
   */
  private onPause(): void {
    this.sceneState = SceneState.Paused;
    this.accumulator = 0;
  }

  /**
   * Handler for scene resume event.
   */
  private onResume(): void {
    this.sceneState = SceneState.Running;
    this.accumulator = 0;
  }

  /**
   * Handler for scene shutdown event.
   */
  private onShutdown(): void {
    this.sceneState = SceneState.Shutdown;
    this.events.off('pause', this.onPause, this);
    this.events.off('resume', this.onResume, this);
    this.events.off('shutdown', this.onShutdown, this);
  }

  /**
   * Gets the current scene state.
   *
   * @returns Current SceneState
   */
  getSceneState(): SceneState {
    return this.sceneState;
  }

  /**
   * Checks if the scene is currently running.
   *
   * @returns True if scene is in Running state
   */
  isRunning(): boolean {
    return this.sceneState === SceneState.Running;
  }
}
