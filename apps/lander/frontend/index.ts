/**
 * @fileoverview Main exports for Rocket Puzzle Lander game.
 *
 * This module provides all public APIs needed to integrate
 * the game into a Next.js application.
 *
 * @example
 * ```tsx
 * // In a Next.js page
 * import dynamic from 'next/dynamic';
 *
 * const GameCanvas = dynamic(
 *   () => import('rocket-puzzle-lander/components/GameCanvas'),
 *   { ssr: false }
 * );
 *
 * export default function GamePage() {
 *   return <GameCanvas width={800} height={600} startLevel={1} />;
 * }
 * ```
 */

// Core systems
export { createGame, destroyGame, BaseScene, PHYSICS_CONFIG } from './game/Game';
export type { GameConfig } from './game/Game';

// Input system
export {
  InputManager,
  getInputManager,
  destroyInputManager,
  InputPriorityMode,
} from './input';
export type { InputState, InputConfig } from './input';

// Physics
export {
  RocketController,
  CollisionType,
  DEFAULT_ROCKET_CONFIG,
} from './core';
export type {
  RocketConfig,
  RocketState,
  LandingResult,
  Vector2,
} from './core';

// Level system
export { getLevel, TOTAL_LEVELS } from './levels/levels';
export type { Level, LevelState, DifficultyRating } from '@shared/types';

// Items
export { Inventory, createItem, MAX_INVENTORY_SLOTS } from './items';
export type { Item, ItemType, ItemUseContext } from './items';

// Save system
export { getSaveManager, destroySaveManager, createDefaultSaveState } from './save';
export type { SaveState, PlayerStats, GameSettings } from './save';

// Polish utilities
export {
  playLandingFeedback,
  applyScreenShake,
  SHAKE_PRESETS,
  getAudioManager,
  GameSounds,
} from './polish';

// Scene
export { GameScene, GameState } from './scenes/GameScene';
