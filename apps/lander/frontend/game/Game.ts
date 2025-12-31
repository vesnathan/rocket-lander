/**
 * @fileoverview Main Phaser game instance configuration and factory.
 * This module provides the core game setup with fixed timestep physics
 * and arcade physics configured for a rocket landing game.
 */

import * as Phaser from 'phaser';
import { BaseScene } from './BaseScene';

/**
 * Configuration options for creating a new game instance.
 */
export interface GameConfig {
  /** The parent DOM element ID or element to mount the game canvas */
  parent: string | HTMLElement;
  /** Initial width of the game canvas */
  width: number;
  /** Initial height of the game canvas */
  height: number;
  /** Optional custom gravity (default: 200) */
  gravity?: number;
  /** Optional background color (default: '#1a1a2e') */
  backgroundColor?: string;
}

/**
 * Fixed timestep configuration for deterministic physics.
 * Using 60 FPS for consistent simulation across devices.
 */
export const PHYSICS_CONFIG = {
  /** Target frames per second for fixed timestep */
  FPS: 60,
  /** Fixed delta time in seconds */
  FIXED_DELTA: 1 / 60,
  /** Fixed delta time in milliseconds */
  FIXED_DELTA_MS: 1000 / 60,
  /** Maximum frame accumulation to prevent spiral of death */
  MAX_FRAME_SKIP: 5,
} as const;

/**
 * Default game configuration values.
 */
const DEFAULT_CONFIG = {
  width: 800,
  height: 600,
  gravity: 200,
  backgroundColor: '#1a1a2e',
} as const;

/**
 * Creates a new Phaser game instance configured for the Rocket Puzzle Lander.
 *
 * @param config - Configuration options for the game instance
 * @param scenes - Array of scene classes to register with the game
 * @returns A configured Phaser.Game instance
 *
 * @example
 * ```typescript
 * const game = createGame({
 *   parent: 'game-container',
 *   width: 800,
 *   height: 600,
 *   gravity: 250
 * }, [GameScene]);
 * ```
 */
export function createGame(
  config: GameConfig,
  scenes: Array<typeof Phaser.Scene>
): Phaser.Game {
  const phaserConfig: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    parent: config.parent,
    width: config.width ?? DEFAULT_CONFIG.width,
    height: config.height ?? DEFAULT_CONFIG.height,
    backgroundColor: config.backgroundColor ?? DEFAULT_CONFIG.backgroundColor,

    // Arcade physics configuration
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { x: 0, y: config.gravity ?? DEFAULT_CONFIG.gravity },
        debug: false,
      },
    },

    // Fixed timestep for deterministic physics
    fps: {
      target: PHYSICS_CONFIG.FPS,
      forceSetTimeOut: false,
      smoothStep: true,
    },

    // Scale configuration for responsive canvas
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: config.width ?? DEFAULT_CONFIG.width,
      height: config.height ?? DEFAULT_CONFIG.height,
    },

    // Input configuration
    input: {
      keyboard: true,
      mouse: true,
      touch: true,
    },

    // Register scenes
    scene: scenes,

    // Render configuration
    render: {
      pixelArt: false,
      antialias: true,
      antialiasGL: true,
    },
  };

  return new Phaser.Game(phaserConfig);
}

/**
 * Destroys a Phaser game instance and cleans up resources.
 *
 * @param game - The game instance to destroy
 */
export function destroyGame(game: Phaser.Game): void {
  game.destroy(true, false);
}

/**
 * Re-exports BaseScene for convenience.
 */
export { BaseScene };
