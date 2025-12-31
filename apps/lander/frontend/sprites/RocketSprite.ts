/**
 * @fileoverview Phaser sprite wrapper for the RocketController.
 * Bridges engine-agnostic physics to Phaser rendering and collision.
 */

import * as Phaser from 'phaser';
import {
  RocketController,
  CollisionType,
  type RocketConfig,
  type LandingResult,
  type CollisionInfo,
} from '../core/RocketController';
import type { InputState } from '../input/InputState';
import { vec2, type Vector2 } from '../core/math';

/**
 * Visual configuration for the rocket sprite.
 */
export interface RocketVisualConfig {
  /** Texture key for the rocket sprite */
  textureKey: string;
  /** Texture key for the thrust flame effect */
  flameTextureKey?: string;
  /** Scale of the rocket sprite */
  scale: number;
  /** Width of the physics body */
  bodyWidth: number;
  /** Height of the physics body */
  bodyHeight: number;
  /** Offset of physics body from sprite center */
  bodyOffset: Vector2;
}

/**
 * Default visual configuration.
 */
export const DEFAULT_VISUAL_CONFIG: RocketVisualConfig = {
  textureKey: 'rocket',
  flameTextureKey: 'flame',
  scale: 1,
  bodyWidth: 32,
  bodyHeight: 48,
  bodyOffset: vec2(0, 0),
};

/**
 * Phaser wrapper for RocketController.
 *
 * This class:
 * - Creates and manages Phaser sprite for rendering
 * - Handles interpolation for smooth visuals
 * - Manages physics body for collision detection
 * - Translates Phaser collisions to RocketController
 *
 * @example
 * ```typescript
 * // In scene create()
 * const rocketSprite = new RocketSprite(
 *   this,
 *   400, 100,
 *   { gravity: vec2(0, 250) },
 *   { textureKey: 'rocket', scale: 1.5 }
 * );
 *
 * // In fixed update
 * rocketSprite.fixedUpdate(inputState, deltaTime);
 *
 * // In render update
 * rocketSprite.renderUpdate(alpha);
 * ```
 */
export class RocketSprite {
  /** The underlying physics controller */
  readonly controller: RocketController;

  /** The Phaser sprite for rendering */
  readonly sprite: Phaser.Physics.Arcade.Sprite;

  /** Flame effect sprite */
  private flame: Phaser.GameObjects.Sprite | null = null;

  /** Visual configuration */
  private visualConfig: RocketVisualConfig;

  /** Event emitter for game events */
  readonly events: Phaser.Events.EventEmitter;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    physicsConfig: Partial<RocketConfig> = {},
    visualConfig: Partial<RocketVisualConfig> = {}
  ) {
    this.visualConfig = { ...DEFAULT_VISUAL_CONFIG, ...visualConfig };
    this.events = new Phaser.Events.EventEmitter();

    // Create the physics controller
    this.controller = new RocketController(physicsConfig);
    this.controller.setPosition(x, y);

    // Create the Phaser sprite
    this.sprite = scene.physics.add.sprite(
      x,
      y,
      this.visualConfig.textureKey
    );
    this.sprite.setScale(this.visualConfig.scale);

    // Configure physics body
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    body.setSize(
      this.visualConfig.bodyWidth,
      this.visualConfig.bodyHeight
    );
    body.setOffset(
      this.visualConfig.bodyOffset.x,
      this.visualConfig.bodyOffset.y
    );

    // Disable Phaser physics simulation - we use our own
    body.setAllowGravity(false);
    body.setImmovable(false);

    // Create flame effect if texture exists
    if (
      this.visualConfig.flameTextureKey &&
      scene.textures.exists(this.visualConfig.flameTextureKey)
    ) {
      this.flame = scene.add.sprite(x, y, this.visualConfig.flameTextureKey);
      this.flame.setScale(this.visualConfig.scale);
      this.flame.setVisible(false);
    }

    // Set up controller callbacks
    this.setupCallbacks();
  }

  /**
   * Set up callbacks from controller to emit events.
   */
  private setupCallbacks(): void {
    this.controller.setOnCrash(() => {
      this.events.emit('crash');
      if (this.flame) {
        this.flame.setVisible(false);
      }
    });

    this.controller.setOnLand((result: LandingResult) => {
      this.events.emit('land', result);
      if (this.flame) {
        this.flame.setVisible(false);
      }
    });

    this.controller.setOnThrustStart(() => {
      this.events.emit('thrustStart');
      if (this.flame) {
        this.flame.setVisible(true);
      }
    });

    this.controller.setOnThrustEnd(() => {
      this.events.emit('thrustEnd');
      if (this.flame) {
        this.flame.setVisible(false);
      }
    });

    this.controller.setOnFuelEmpty(() => {
      this.events.emit('fuelEmpty');
    });
  }

  /**
   * Update physics in fixed timestep.
   *
   * @param input - Current input state
   * @param deltaTime - Fixed delta time in seconds
   */
  fixedUpdate(input: InputState, deltaTime: number): void {
    this.controller.update(input, deltaTime);

    // Update Phaser physics body position for collision detection
    const state = this.controller.getState();
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    body.position.set(
      state.position.x - this.visualConfig.bodyWidth / 2,
      state.position.y - this.visualConfig.bodyHeight / 2
    );
    body.velocity.set(state.velocity.x, state.velocity.y);
  }

  /**
   * Update visual rendering with interpolation.
   *
   * @param alpha - Interpolation factor (0-1)
   */
  renderUpdate(alpha: number): void {
    const interpolated = this.controller.getInterpolatedState(alpha);

    // Update sprite position and rotation
    this.sprite.setPosition(interpolated.position.x, interpolated.position.y);
    this.sprite.setRotation(interpolated.rotation);

    // Update flame position
    if (this.flame) {
      // Position flame below rocket (opposite to thrust direction)
      const flameOffset = 30 * this.visualConfig.scale;
      const flameX =
        interpolated.position.x -
        Math.sin(interpolated.rotation) * flameOffset;
      const flameY =
        interpolated.position.y +
        Math.cos(interpolated.rotation) * flameOffset;

      this.flame.setPosition(flameX, flameY);
      this.flame.setRotation(interpolated.rotation);

      // Flicker effect
      if (this.flame.visible) {
        this.flame.setScale(
          this.visualConfig.scale * (0.8 + Math.random() * 0.4)
        );
      }
    }
  }

  /**
   * Handle collision with a Phaser game object.
   * Call this from collision callbacks.
   *
   * @param type - Type of collision
   * @param other - The other game object
   */
  handleCollision(
    type: CollisionType,
    other?: Phaser.GameObjects.GameObject
  ): void {
    const state = this.controller.getState();
    const collision: CollisionInfo = {
      type,
      point: vec2(state.position.x, state.position.y),
      normal: vec2(0, -1), // Assume collision from below
    };

    this.controller.handleCollision(collision);

    // Emit collision event with object reference
    this.events.emit('collision', type, other);
  }

  /**
   * Reset the rocket to a new position.
   */
  reset(x: number, y: number, rotation = 0): void {
    this.controller.reset(vec2(x, y), rotation);
    this.sprite.setPosition(x, y);
    this.sprite.setRotation(rotation);
    this.sprite.setActive(true);
    this.sprite.setVisible(true);

    if (this.flame) {
      this.flame.setVisible(false);
    }
  }

  /**
   * Get the current controller state.
   */
  getState() {
    return this.controller.getState();
  }

  /**
   * Get the Phaser physics body.
   */
  getBody(): Phaser.Physics.Arcade.Body {
    return this.sprite.body as Phaser.Physics.Arcade.Body;
  }

  /**
   * Destroy the sprite and clean up resources.
   */
  destroy(): void {
    this.events.removeAllListeners();
    this.sprite.destroy();
    if (this.flame) {
      this.flame.destroy();
    }
  }

  /**
   * Set sprite visibility.
   */
  setVisible(visible: boolean): void {
    this.sprite.setVisible(visible);
    if (this.flame && !visible) {
      this.flame.setVisible(false);
    }
  }

  /**
   * Set sprite active state.
   */
  setActive(active: boolean): void {
    this.sprite.setActive(active);
  }
}

/**
 * Factory function to create a rocket sprite with polished graphics.
 */
export function createRocketWithPlaceholder(
  scene: Phaser.Scene,
  x: number,
  y: number,
  physicsConfig: Partial<RocketConfig> = {}
): RocketSprite {
  // Create rocket texture if it doesn't exist
  if (!scene.textures.exists('rocket')) {
    const graphics = scene.add.graphics();
    const w = 40;
    const h = 56;

    // Rocket body gradient effect (using multiple fills)
    // Main body - metallic silver
    graphics.fillStyle(0xe8e8e8);
    graphics.beginPath();
    graphics.moveTo(w / 2, 4); // Nose tip
    graphics.lineTo(w - 8, 20); // Right upper curve
    graphics.lineTo(w - 6, 42); // Right body
    graphics.lineTo(w - 10, 48); // Right fin top
    graphics.lineTo(w - 4, h); // Right fin bottom
    graphics.lineTo(w / 2 + 4, 48); // Center right
    graphics.lineTo(w / 2 - 4, 48); // Center left
    graphics.lineTo(4, h); // Left fin bottom
    graphics.lineTo(10, 48); // Left fin top
    graphics.lineTo(6, 42); // Left body
    graphics.lineTo(8, 20); // Left upper curve
    graphics.closePath();
    graphics.fillPath();

    // Body shading - darker side
    graphics.fillStyle(0xcccccc);
    graphics.beginPath();
    graphics.moveTo(w / 2, 4);
    graphics.lineTo(8, 20);
    graphics.lineTo(6, 42);
    graphics.lineTo(10, 48);
    graphics.lineTo(4, h);
    graphics.lineTo(w / 2 - 4, 48);
    graphics.lineTo(w / 2, 4);
    graphics.closePath();
    graphics.fillPath();

    // Nose cone accent
    graphics.fillStyle(0xff4444);
    graphics.beginPath();
    graphics.moveTo(w / 2, 0);
    graphics.lineTo(w / 2 + 6, 10);
    graphics.lineTo(w / 2 - 6, 10);
    graphics.closePath();
    graphics.fillPath();

    // Window - outer ring
    graphics.fillStyle(0x334455);
    graphics.fillCircle(w / 2, 22, 7);
    // Window - glass
    graphics.fillStyle(0x66ccff);
    graphics.fillCircle(w / 2, 22, 5);
    // Window - reflection
    graphics.fillStyle(0xaaeeff);
    graphics.fillCircle(w / 2 - 1, 20, 2);

    // Body stripe
    graphics.fillStyle(0xff4444);
    graphics.fillRect(w / 2 - 8, 32, 16, 4);

    // Fin details - darker
    graphics.fillStyle(0x999999);
    graphics.fillTriangle(4, h, 10, 48, 8, h - 4);
    graphics.fillTriangle(w - 4, h, w - 10, 48, w - 8, h - 4);

    // Engine nozzle
    graphics.fillStyle(0x444444);
    graphics.fillRect(w / 2 - 6, 48, 12, 4);
    graphics.fillStyle(0x333333);
    graphics.fillRect(w / 2 - 4, 50, 8, 4);

    graphics.generateTexture('rocket', w, h);
    graphics.destroy();
  }

  // Create flame texture if it doesn't exist
  if (!scene.textures.exists('flame')) {
    const graphics = scene.add.graphics();
    const fw = 24;
    const fh = 32;

    // Outer flame - orange/red (triangle shape)
    graphics.fillStyle(0xff4400);
    graphics.fillTriangle(
      fw / 2, fh,      // Bottom point
      fw - 2, 4,       // Top right
      2, 4             // Top left
    );

    // Middle flame - orange
    graphics.fillStyle(0xff8800);
    graphics.fillTriangle(
      fw / 2, fh - 4,
      fw - 6, 8,
      6, 8
    );

    // Inner flame - yellow
    graphics.fillStyle(0xffcc00);
    graphics.fillTriangle(
      fw / 2, fh - 8,
      fw - 9, 12,
      9, 12
    );

    // Core - white hot
    graphics.fillStyle(0xffffcc);
    graphics.fillTriangle(
      fw / 2, fh - 14,
      fw / 2 + 3, 16,
      fw / 2 - 3, 16
    );

    graphics.generateTexture('flame', fw, fh);
    graphics.destroy();
  }

  return new RocketSprite(scene, x, y, physicsConfig, {
    textureKey: 'rocket',
    flameTextureKey: 'flame',
    scale: 0.5,
    bodyWidth: 16,
    bodyHeight: 26,
    bodyOffset: vec2(2, 1),
  });
}
