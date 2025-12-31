/**
 * @fileoverview Visual effects and game feel utilities.
 * Provides screen shake, particle effects, and feedback systems.
 */

import * as Phaser from 'phaser';
import type { Vector2 } from '../core/math';

/**
 * Screen shake configuration.
 */
export interface ShakeConfig {
  /** Duration in milliseconds */
  duration: number;
  /** Intensity (0-1, where 1 = very intense) */
  intensity: number;
  /** Whether to affect both X and Y equally */
  uniform?: boolean;
  /** Direction to shake (optional, for directional shake) */
  direction?: Vector2;
}

/**
 * Preset shake configurations.
 */
export const SHAKE_PRESETS = {
  /** Gentle feedback for soft landing */
  softLanding: {
    duration: 150,
    intensity: 0.002,
    uniform: true,
  },
  /** Medium impact for rough landing */
  roughLanding: {
    duration: 250,
    intensity: 0.005,
    uniform: true,
  },
  /** Intense shake for crashes */
  crash: {
    duration: 400,
    intensity: 0.015,
    uniform: true,
  },
  /** Quick shake for enemy collision */
  enemyHit: {
    duration: 200,
    intensity: 0.01,
    uniform: false,
  },
  /** Subtle shake for laser activation */
  laserWarning: {
    duration: 100,
    intensity: 0.003,
    uniform: true,
  },
} as const;

/**
 * Applies screen shake to a camera.
 *
 * @param camera - The camera to shake
 * @param config - Shake configuration
 */
export function applyScreenShake(
  camera: Phaser.Cameras.Scene2D.Camera,
  config: ShakeConfig
): void {
  camera.shake(config.duration, config.intensity);
}

/**
 * Flash configuration.
 */
export interface FlashConfig {
  /** Duration in milliseconds */
  duration: number;
  /** Flash color as hex number */
  color: number;
  /** Alpha at peak of flash */
  alpha?: number;
}

/**
 * Preset flash configurations.
 */
export const FLASH_PRESETS = {
  /** White flash for successful landing */
  success: {
    duration: 200,
    color: 0xffffff,
    alpha: 0.3,
  },
  /** Red flash for damage */
  damage: {
    duration: 150,
    color: 0xff0000,
    alpha: 0.4,
  },
  /** Yellow flash for collection */
  collect: {
    duration: 100,
    color: 0xffff00,
    alpha: 0.2,
  },
} as const;

/**
 * Applies a screen flash effect.
 *
 * @param camera - The camera to flash
 * @param config - Flash configuration
 */
export function applyScreenFlash(
  camera: Phaser.Cameras.Scene2D.Camera,
  config: FlashConfig
): void {
  const { duration, color, alpha = 0.5 } = config;

  // Convert hex color to RGB
  const r = (color >> 16) & 0xff;
  const g = (color >> 8) & 0xff;
  const b = color & 0xff;

  camera.flash(duration, r, g, b, false, (_cam: Phaser.Cameras.Scene2D.Camera, progress: number) => {
    // Custom alpha curve - peak at 30%
    const flashAlpha = progress < 0.3
      ? progress / 0.3
      : 1 - (progress - 0.3) / 0.7;
    camera.setAlpha(1 - flashAlpha * alpha);
  });
}

/**
 * Particle burst configuration.
 */
export interface ParticleBurstConfig {
  /** Number of particles */
  count: number;
  /** Particle texture key */
  texture?: string;
  /** Particle tint color */
  tint: number;
  /** Particle lifetime in milliseconds */
  lifespan: number;
  /** Speed range */
  speed: { min: number; max: number };
  /** Scale range */
  scale: { start: number; end: number };
  /** Gravity for particles */
  gravityY?: number;
}

/**
 * Preset particle configurations.
 */
export const PARTICLE_PRESETS = {
  /** Explosion particles for crash */
  explosion: {
    count: 30,
    tint: 0xff6600,
    lifespan: 800,
    speed: { min: 100, max: 300 },
    scale: { start: 0.8, end: 0 },
    gravityY: 200,
  },
  /** Sparkle particles for collection */
  sparkle: {
    count: 15,
    tint: 0xffff00,
    lifespan: 500,
    speed: { min: 50, max: 150 },
    scale: { start: 0.5, end: 0 },
    gravityY: 0,
  },
  /** Dust particles for landing */
  dust: {
    count: 20,
    tint: 0x888888,
    lifespan: 600,
    speed: { min: 30, max: 80 },
    scale: { start: 0.6, end: 0 },
    gravityY: -50,
  },
  /** Thrust particles */
  thrust: {
    count: 5,
    tint: 0xff8800,
    lifespan: 200,
    speed: { min: 50, max: 100 },
    scale: { start: 0.4, end: 0 },
    gravityY: 0,
  },
} as const;

/**
 * Creates a particle burst effect at a position.
 *
 * @param scene - The scene to add particles to
 * @param x - X position
 * @param y - Y position
 * @param config - Particle configuration
 */
export function createParticleBurst(
  scene: Phaser.Scene,
  x: number,
  y: number,
  config: ParticleBurstConfig
): void {
  // Create or use default particle texture
  const textureKey = config.texture ?? 'particle';

  if (!scene.textures.exists(textureKey)) {
    // Create simple circular particle
    const graphics = scene.add.graphics();
    graphics.fillStyle(0xffffff);
    graphics.fillCircle(4, 4, 4);
    graphics.generateTexture(textureKey, 8, 8);
    graphics.destroy();
  }

  const particles = scene.add.particles(x, y, textureKey, {
    speed: config.speed,
    lifespan: config.lifespan,
    quantity: config.count,
    tint: config.tint,
    scale: config.scale,
    gravityY: config.gravityY ?? 0,
    emitting: false,
  });

  // Emit once
  particles.explode(config.count);

  // Auto-destroy after particles finish
  scene.time.delayedCall(config.lifespan + 100, () => {
    particles.destroy();
  });
}

/**
 * Landing feedback effect based on landing quality.
 */
export function playLandingFeedback(
  scene: Phaser.Scene,
  x: number,
  y: number,
  quality: 'perfect' | 'good' | 'rough' | 'crash'
): void {
  const camera = scene.cameras.main;

  switch (quality) {
    case 'perfect':
      applyScreenFlash(camera, FLASH_PRESETS.success);
      createParticleBurst(scene, x, y, PARTICLE_PRESETS.dust);
      break;

    case 'good':
      applyScreenShake(camera, SHAKE_PRESETS.softLanding);
      createParticleBurst(scene, x, y, PARTICLE_PRESETS.dust);
      break;

    case 'rough':
      applyScreenShake(camera, SHAKE_PRESETS.roughLanding);
      createParticleBurst(scene, x, y, {
        ...PARTICLE_PRESETS.dust,
        count: 30,
      });
      break;

    case 'crash':
      applyScreenShake(camera, SHAKE_PRESETS.crash);
      applyScreenFlash(camera, FLASH_PRESETS.damage);
      createParticleBurst(scene, x, y, PARTICLE_PRESETS.explosion);
      break;
  }
}

/**
 * Slow motion effect handler.
 */
export class SlowMotionEffect {
  private scene: Phaser.Scene;
  private originalTimeScale: number = 1;
  private tween: Phaser.Tweens.Tween | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * Apply slow motion effect.
   *
   * @param factor - Time scale factor (0.5 = half speed)
   * @param duration - Duration in milliseconds
   * @param easeIn - Ease in duration in ms
   * @param easeOut - Ease out duration in ms
   */
  apply(
    factor: number,
    duration: number,
    easeIn = 200,
    easeOut = 200
  ): void {
    this.originalTimeScale = this.scene.time.timeScale;

    // Ease into slow motion
    this.tween = this.scene.tweens.addCounter({
      from: this.originalTimeScale,
      to: factor,
      duration: easeIn,
      ease: 'Power2',
      onUpdate: (tween) => {
        this.scene.time.timeScale = tween.getValue() ?? this.originalTimeScale;
      },
      onComplete: () => {
        // Hold slow motion
        this.scene.time.delayedCall(duration - easeIn - easeOut, () => {
          // Ease back to normal
          this.tween = this.scene.tweens.addCounter({
            from: factor,
            to: this.originalTimeScale,
            duration: easeOut,
            ease: 'Power2',
            onUpdate: (tween) => {
              this.scene.time.timeScale = tween.getValue() ?? this.originalTimeScale;
            },
          });
        });
      },
    });
  }

  /**
   * Cancel slow motion and restore normal speed.
   */
  cancel(): void {
    if (this.tween) {
      this.tween.stop();
      this.tween = null;
    }
    this.scene.time.timeScale = this.originalTimeScale;
  }
}

/**
 * Hitstop effect (brief pause on impact).
 */
export function applyHitstop(
  scene: Phaser.Scene,
  durationMs = 50
): void {
  const originalScale = scene.time.timeScale;
  scene.time.timeScale = 0.01;

  scene.time.delayedCall(durationMs, () => {
    scene.time.timeScale = originalScale;
  });
}
