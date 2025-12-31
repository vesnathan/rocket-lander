/**
 * @fileoverview Base class for all hazard types.
 * Provides common functionality for hazard management.
 */

import * as Phaser from 'phaser';

/**
 * Base configuration shared by all hazards.
 */
export interface HazardBaseConfig {
  /** X position of the hazard */
  x: number;
  /** Y position of the hazard */
  y: number;
  /** Whether the hazard is initially active */
  active?: boolean;
}

/**
 * Abstract base class for hazards.
 *
 * All hazards should:
 * - Have a collision body
 * - Be updatable each frame
 * - Support enable/disable
 * - Be destroyable
 */
export abstract class HazardBase {
  /** Reference to the scene */
  protected scene: Phaser.Scene;

  /** The main game object for this hazard */
  protected gameObject: Phaser.GameObjects.GameObject;

  /** Physics body for collision */
  protected body: Phaser.Physics.Arcade.Body | Phaser.Physics.Arcade.StaticBody;

  /** Whether the hazard is currently active and dangerous */
  protected isActive: boolean;

  /** Event emitter for hazard events */
  readonly events: Phaser.Events.EventEmitter;

  constructor(scene: Phaser.Scene, config: HazardBaseConfig) {
    this.scene = scene;
    this.isActive = config.active ?? true;
    this.events = new Phaser.Events.EventEmitter();

    // Subclasses must set gameObject and body
    this.gameObject = null!;
    this.body = null!;
  }

  /**
   * Update the hazard state.
   * Called each frame (not fixed timestep).
   *
   * @param time - Total game time in milliseconds
   * @param delta - Time since last frame in milliseconds
   */
  abstract update(time: number, delta: number): void;

  /**
   * Fixed timestep update for physics-critical calculations.
   *
   * @param deltaTime - Fixed delta time in seconds
   */
  fixedUpdate(deltaTime: number): void {
    // Default: no fixed update needed
    void deltaTime;
  }

  /**
   * Enable the hazard.
   */
  enable(): void {
    this.isActive = true;
    this.onEnable();
    this.events.emit('enable');
  }

  /**
   * Disable the hazard.
   */
  disable(): void {
    this.isActive = false;
    this.onDisable();
    this.events.emit('disable');
  }

  /**
   * Called when hazard is enabled.
   * Override to add custom enable behavior.
   */
  protected onEnable(): void {
    // Default: make visible
    if (this.gameObject instanceof Phaser.GameObjects.Sprite) {
      this.gameObject.setVisible(true);
    }
  }

  /**
   * Called when hazard is disabled.
   * Override to add custom disable behavior.
   */
  protected onDisable(): void {
    // Default: make invisible
    if (this.gameObject instanceof Phaser.GameObjects.Sprite) {
      this.gameObject.setVisible(false);
    }
  }

  /**
   * Check if the hazard is currently dangerous.
   */
  isDangerous(): boolean {
    return this.isActive;
  }

  /**
   * Get the physics body for collision detection.
   */
  getBody(): Phaser.Physics.Arcade.Body | Phaser.Physics.Arcade.StaticBody {
    return this.body;
  }

  /**
   * Get the main game object.
   */
  getGameObject(): Phaser.GameObjects.GameObject {
    return this.gameObject;
  }

  /**
   * Destroy the hazard and clean up resources.
   */
  destroy(): void {
    this.events.removeAllListeners();
    if (this.gameObject) {
      this.gameObject.destroy();
    }
  }

  /**
   * Reset the hazard to initial state.
   */
  abstract reset(): void;
}
