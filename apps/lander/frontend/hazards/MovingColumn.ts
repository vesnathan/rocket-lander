/**
 * @fileoverview Moving column hazard.
 * A vertical column that moves up/down, with configurable boundary behavior.
 */

import * as Phaser from 'phaser';
import { HazardBase, type HazardBaseConfig } from './HazardBase';
import type { ColumnBoundaryMode } from '@shared/types/Obstacles';

/**
 * Configuration for a moving column hazard.
 */
export interface MovingColumnConfig extends HazardBaseConfig {
  /** Width of the column */
  width: number;
  /** Height of the column */
  height: number;
  /** Movement speed in pixels per second */
  speed: number;
  /** Starting direction: 1 = down, -1 = up */
  startDirection?: 1 | -1;
  /** Behavior at top boundary */
  topMode?: ColumnBoundaryMode;
  /** Behavior at bottom boundary */
  bottomMode?: ColumnBoundaryMode;
  /** Hard limit for top (column center Y) */
  minY?: number;
  /** Hard limit for bottom (column center Y) */
  maxY?: number;
  /** Where to teleport when wrapping through top */
  wrapTopTo?: number;
  /** Where to teleport when wrapping through bottom */
  wrapBottomTo?: number;
  /** Phase offset in seconds */
  phaseOffset?: number;
  /** Color of the column */
  color?: number;
  /** Level bounds for wrap calculations */
  levelBounds?: { minY: number; maxY: number };
  // Legacy
  wrap?: boolean;
}

/**
 * A column that moves vertically with configurable boundary behavior.
 *
 * Boundary modes:
 * - 'terrain': Dynamically bounce off terrain (default)
 * - 'bounce': Bounce at minY/maxY bounds
 * - 'wrap': Teleport to opposite side
 * - 'stop': Stop at boundary (one-way)
 */
export class MovingColumn extends HazardBase {
  private config: MovingColumnConfig;
  private sprite: Phaser.GameObjects.Rectangle;
  private direction: number;
  private velocityY: number = 0;
  private stopped: boolean = false;
  private lastCollisionTime: number = 0;
  private collisionCooldown: number = 100; // ms between collision reversals

  constructor(scene: Phaser.Scene, config: MovingColumnConfig) {
    super(scene, config);

    // Handle legacy 'wrap' property
    const topMode = config.topMode ?? (config.wrap ? 'wrap' : 'terrain');
    const bottomMode = config.bottomMode ?? (config.wrap ? 'wrap' : 'terrain');

    this.config = {
      startDirection: 1,
      phaseOffset: 0,
      color: 0x884444,
      topMode,
      bottomMode,
      ...config,
    };

    this.direction = this.config.startDirection ?? 1;
    this.velocityY = this.direction * this.config.speed;

    // Create the column sprite
    this.sprite = scene.add.rectangle(
      config.x,
      config.y,
      config.width,
      config.height,
      this.config.color
    );

    // Add physics body
    scene.physics.add.existing(this.sprite);
    this.body = this.sprite.body as Phaser.Physics.Arcade.Body;
    this.body.setImmovable(true);
    this.body.setAllowGravity(false);

    // Set the game object reference
    this.gameObject = this.sprite;

    // Apply phase offset by adjusting initial position
    if (this.config.phaseOffset && this.config.phaseOffset > 0) {
      const offsetDistance = this.config.speed * this.config.phaseOffset;
      const newY = config.y + (this.direction * offsetDistance);
      this.sprite.setPosition(config.x, newY);
    }
  }

  /**
   * Handle collision with terrain - reverse direction.
   */
  onTerrainCollision(collisionTime: number): void {
    // Cooldown to prevent multiple reversals from single collision
    if (collisionTime - this.lastCollisionTime < this.collisionCooldown) {
      return;
    }
    this.lastCollisionTime = collisionTime;

    const mode = this.direction < 0 ? this.config.topMode : this.config.bottomMode;

    if (mode === 'terrain' || mode === 'bounce') {
      this.reverseDirection();
    }
  }

  /**
   * Reverse the column's direction.
   */
  reverseDirection(): void {
    this.direction *= -1;
    this.velocityY = this.direction * this.config.speed;
  }

  /**
   * Update the column position.
   */
  update(_time: number, delta: number): void {
    if (!this.isActive || this.stopped) {
      return;
    }

    const deltaSeconds = delta / 1000;
    const currentY = this.sprite.y;
    let newY = currentY + this.velocityY * deltaSeconds;
    const halfHeight = this.config.height / 2;

    // Get level bounds
    const levelMinY = this.config.levelBounds?.minY ?? 0;
    const levelMaxY = this.config.levelBounds?.maxY ?? 360;

    // Check top boundary (moving up)
    if (this.direction < 0) {
      const topEdge = newY - halfHeight;
      const boundaryY = this.config.minY ?? levelMinY;

      if (topEdge <= boundaryY || newY <= boundaryY) {
        newY = this.handleTopBoundary(newY, boundaryY, halfHeight, levelMaxY);
      }
    }

    // Check bottom boundary (moving down)
    if (this.direction > 0) {
      const bottomEdge = newY + halfHeight;
      const boundaryY = this.config.maxY ?? levelMaxY;

      if (bottomEdge >= boundaryY || newY >= boundaryY) {
        newY = this.handleBottomBoundary(newY, boundaryY, halfHeight, levelMinY);
      }
    }

    // Update position
    this.sprite.setPosition(this.config.x, newY);

    // Update physics body
    if (this.body) {
      this.body.position.set(
        this.config.x - this.config.width / 2,
        newY - halfHeight
      );
    }
  }

  /**
   * Handle reaching the top boundary.
   */
  private handleTopBoundary(_currentY: number, boundaryY: number, halfHeight: number, levelMaxY: number): number {
    const mode = this.config.topMode ?? 'terrain';

    switch (mode) {
      case 'wrap': {
        // Teleport to bottom (or specified wrapTopTo position)
        const wrapTo = this.config.wrapTopTo ?? this.config.maxY ?? (levelMaxY - halfHeight);
        this.sprite.setPosition(this.config.x, wrapTo);
        return wrapTo;
      }
      case 'stop':
        this.stopped = true;
        this.velocityY = 0;
        return boundaryY + halfHeight;
      case 'bounce':
      case 'terrain':
      default:
        this.reverseDirection();
        return boundaryY + halfHeight;
    }
  }

  /**
   * Handle reaching the bottom boundary.
   */
  private handleBottomBoundary(_currentY: number, boundaryY: number, halfHeight: number, levelMinY: number): number {
    const mode = this.config.bottomMode ?? 'terrain';

    switch (mode) {
      case 'wrap': {
        // Teleport to top (or specified wrapBottomTo position)
        const wrapTo = this.config.wrapBottomTo ?? this.config.minY ?? (levelMinY + halfHeight);
        this.sprite.setPosition(this.config.x, wrapTo);
        return wrapTo;
      }
      case 'stop':
        this.stopped = true;
        this.velocityY = 0;
        return boundaryY - halfHeight;
      case 'bounce':
      case 'terrain':
      default:
        this.reverseDirection();
        return boundaryY - halfHeight;
    }
  }

  /**
   * Get the current direction.
   */
  getDirection(): number {
    return this.direction;
  }

  /**
   * Check if column is stopped.
   */
  isStopped(): boolean {
    return this.stopped;
  }

  /**
   * Reset the column to initial state.
   */
  reset(): void {
    this.direction = this.config.startDirection ?? 1;
    this.velocityY = this.direction * this.config.speed;
    this.stopped = false;
    this.sprite.setPosition(this.config.x, this.config.y);
    this.isActive = true;
  }

  /**
   * Set the movement speed.
   */
  setSpeed(speed: number): void {
    this.config.speed = speed;
    this.velocityY = this.direction * speed;
  }

  protected onEnable(): void {
    this.sprite.setVisible(true);
    this.body.enable = true;
  }

  protected onDisable(): void {
    this.sprite.setVisible(false);
    this.body.enable = false;
  }
}

/**
 * Factory function to create multiple synchronized columns.
 */
export function createColumnGroup(
  scene: Phaser.Scene,
  configs: MovingColumnConfig[]
): MovingColumn[] {
  return configs.map((config) => new MovingColumn(scene, config));
}
