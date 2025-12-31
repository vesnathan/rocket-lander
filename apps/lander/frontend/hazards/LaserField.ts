/**
 * @fileoverview Laser field hazard with timed on/off cycles.
 * Includes visual telegraphing to warn players.
 */

import * as Phaser from 'phaser';
import { HazardBase, type HazardBaseConfig } from './HazardBase';

/**
 * Laser field state.
 */
export enum LaserState {
  /** Laser is off and safe */
  Off = 'off',
  /** Laser is warning before activation */
  Warning = 'warning',
  /** Laser is active and dangerous */
  Active = 'active',
  /** Laser is cooling down after deactivation */
  Cooldown = 'cooldown',
}

/**
 * Configuration for a laser field hazard.
 */
export interface LaserFieldConfig extends HazardBaseConfig {
  /** Width of the laser beam */
  width: number;
  /** Length of the laser beam */
  length: number;
  /** Rotation angle in degrees (0 = horizontal) */
  angle?: number;
  /** Duration the laser is active in milliseconds */
  onDuration: number;
  /** Duration the laser is off in milliseconds */
  offDuration: number;
  /** Warning duration before laser activates in milliseconds */
  warningDuration: number;
  /** Phase offset in milliseconds (for syncing multiple lasers) */
  phaseOffset?: number;
  /** Color when laser is active */
  activeColor?: number;
  /** Color during warning */
  warningColor?: number;
  /** Color when laser is off */
  offColor?: number;
}

/**
 * A laser field that cycles on and off with visual warning.
 *
 * Lifecycle per cycle:
 * 1. Off - Laser is invisible, collision disabled
 * 2. Warning - Laser flashes to warn player
 * 3. Active - Laser is deadly
 * 4. Back to Off
 *
 * @example
 * ```typescript
 * const laser = new LaserField(scene, {
 *   x: 300,
 *   y: 200,
 *   width: 4,
 *   length: 200,
 *   onDuration: 2000,
 *   offDuration: 3000,
 *   warningDuration: 500,
 * });
 *
 * // In update loop
 * laser.update(time, delta);
 *
 * // Check if dangerous before collision
 * if (laser.isDangerous()) {
 *   // Handle collision
 * }
 * ```
 */
export class LaserField extends HazardBase {
  private config: LaserFieldConfig;
  private laserSprite: Phaser.GameObjects.Rectangle;
  private warningSprite: Phaser.GameObjects.Rectangle;
  private state: LaserState;
  private cycleTime: number;

  constructor(scene: Phaser.Scene, config: LaserFieldConfig) {
    super(scene, config);
    this.config = {
      angle: 0,
      phaseOffset: 0,
      activeColor: 0xff0000,
      warningColor: 0xff8800,
      offColor: 0x440000,
      ...config,
    };

    this.state = LaserState.Off;
    this.cycleTime = this.config.phaseOffset ?? 0;

    // Create warning indicator (always visible when laser exists)
    this.warningSprite = scene.add.rectangle(
      config.x,
      config.y,
      config.length,
      config.width * 2,
      this.config.offColor,
      0.3
    );
    this.warningSprite.setAngle(this.config.angle ?? 0);

    // Create the laser beam
    this.laserSprite = scene.add.rectangle(
      config.x,
      config.y,
      config.length,
      config.width,
      this.config.activeColor
    );
    this.laserSprite.setAngle(this.config.angle ?? 0);
    this.laserSprite.setVisible(false);

    // Add physics body
    scene.physics.add.existing(this.laserSprite);
    this.body = this.laserSprite.body as Phaser.Physics.Arcade.Body;
    this.body.setImmovable(true);
    this.body.setAllowGravity(false);
    this.body.enable = false;

    // Rotate physics body to match visual
    // Note: Arcade physics doesn't support rotated bodies well,
    // so we use a bounding box approximation
    const angleRad = Phaser.Math.DegToRad(this.config.angle ?? 0);
    const cos = Math.abs(Math.cos(angleRad));
    const sin = Math.abs(Math.sin(angleRad));
    const boundWidth = config.length * cos + config.width * sin;
    const boundHeight = config.length * sin + config.width * cos;
    this.body.setSize(boundWidth, boundHeight);

    // Set the game object reference
    this.gameObject = this.laserSprite;

    // Initialize cycle position
    this.updateCycle(this.cycleTime);
  }

  /**
   * Update the laser state based on time.
   */
  update(_time: number, delta: number): void {
    if (!this.isActive) {
      return;
    }

    this.cycleTime += delta;
    this.updateCycle(this.cycleTime);
  }

  /**
   * Update laser state based on cycle time.
   */
  private updateCycle(cycleTime: number): void {
    const { offDuration, warningDuration, onDuration } = this.config;
    const totalCycle = offDuration + warningDuration + onDuration;

    // Get position within current cycle
    const cyclePos = cycleTime % totalCycle;

    // Determine state based on cycle position
    let newState: LaserState;
    let stateProgress: number;

    if (cyclePos < offDuration) {
      newState = LaserState.Off;
      stateProgress = cyclePos / offDuration;
    } else if (cyclePos < offDuration + warningDuration) {
      newState = LaserState.Warning;
      stateProgress = (cyclePos - offDuration) / warningDuration;
    } else {
      newState = LaserState.Active;
      stateProgress = (cyclePos - offDuration - warningDuration) / onDuration;
    }

    // Handle state transitions
    if (newState !== this.state) {
      this.onStateChange(newState);
    }

    this.state = newState;

    // Update visuals
    this.updateVisuals(stateProgress);
  }

  /**
   * Handle state transitions.
   */
  private onStateChange(newState: LaserState): void {
    switch (newState) {
      case LaserState.Off:
        this.laserSprite.setVisible(false);
        this.body.enable = false;
        this.events.emit('deactivate');
        break;

      case LaserState.Warning:
        this.laserSprite.setVisible(true);
        this.laserSprite.setFillStyle(this.config.warningColor, 0.5);
        this.body.enable = false;
        this.events.emit('warning');
        break;

      case LaserState.Active:
        this.laserSprite.setVisible(true);
        this.laserSprite.setFillStyle(this.config.activeColor, 1);
        this.body.enable = true;
        this.events.emit('activate');
        break;
    }
  }

  /**
   * Update visual effects based on state progress.
   */
  private updateVisuals(progress: number): void {
    switch (this.state) {
      case LaserState.Warning:
        // Flashing effect during warning
        const flash = Math.sin(progress * Math.PI * 6) > 0;
        this.laserSprite.setAlpha(flash ? 0.8 : 0.3);
        break;

      case LaserState.Active:
        // Slight pulsing when active
        const pulse = 0.9 + Math.sin(progress * Math.PI * 4) * 0.1;
        this.laserSprite.setAlpha(pulse);
        break;

      case LaserState.Off:
        // Dim glow showing where laser will be
        this.warningSprite.setAlpha(0.15 + Math.sin(progress * Math.PI * 2) * 0.1);
        break;
    }
  }

  /**
   * Check if the laser is currently dangerous.
   */
  isDangerous(): boolean {
    return this.isActive && this.state === LaserState.Active;
  }

  /**
   * Get the current laser state.
   */
  getState(): LaserState {
    return this.state;
  }

  /**
   * Get time until next state change in milliseconds.
   */
  getTimeUntilStateChange(): number {
    const { offDuration, warningDuration, onDuration } = this.config;
    const totalCycle = offDuration + warningDuration + onDuration;
    const cyclePos = this.cycleTime % totalCycle;

    switch (this.state) {
      case LaserState.Off:
        return offDuration - cyclePos;
      case LaserState.Warning:
        return offDuration + warningDuration - cyclePos;
      case LaserState.Active:
        return totalCycle - cyclePos;
      default:
        return 0;
    }
  }

  /**
   * Reset the laser to initial state.
   */
  reset(): void {
    this.cycleTime = this.config.phaseOffset ?? 0;
    this.state = LaserState.Off;
    this.laserSprite.setVisible(false);
    this.body.enable = false;
    this.isActive = true;
  }

  /**
   * Set timing configuration.
   */
  setTiming(onDuration: number, offDuration: number, warningDuration: number): void {
    this.config.onDuration = onDuration;
    this.config.offDuration = offDuration;
    this.config.warningDuration = warningDuration;
  }

  protected onEnable(): void {
    this.warningSprite.setVisible(true);
  }

  protected onDisable(): void {
    this.laserSprite.setVisible(false);
    this.warningSprite.setVisible(false);
    this.body.enable = false;
  }

  /**
   * Clean up resources.
   */
  destroy(): void {
    this.warningSprite.destroy();
    super.destroy();
  }
}

/**
 * Factory function to create synchronized laser fields.
 * Creates lasers that alternate in a pattern.
 */
export function createLaserPattern(
  scene: Phaser.Scene,
  configs: LaserFieldConfig[],
  alternating = true
): LaserField[] {
  if (!alternating) {
    return configs.map((config) => new LaserField(scene, config));
  }

  // Calculate offset to alternate lasers
  const firstConfig = configs[0];
  if (!firstConfig) {
    return [];
  }
  const halfCycle =
    (firstConfig.offDuration +
      firstConfig.warningDuration +
      firstConfig.onDuration) /
    2;

  return configs.map((config, index) => {
    const offset = index % 2 === 0 ? 0 : halfCycle;
    return new LaserField(scene, {
      ...config,
      phaseOffset: (config.phaseOffset ?? 0) + offset,
    });
  });
}
