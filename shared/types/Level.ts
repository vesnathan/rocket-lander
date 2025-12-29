/**
 * @fileoverview Level data type definitions.
 * Defines the complete schema for level configuration.
 */

import type { Vector2 } from '../core/math';
import type {
  TerrainBlock,
  LandingPad,
  IceLayer,
  HazardDef,
  FuelPickup,
  Collectible,
  Checkpoint,
  MultiplierBubble,
} from './Obstacles';
import type { EnemyDef } from './Enemies';

/**
 * Level difficulty rating.
 */
export type DifficultyRating = 1 | 2 | 3 | 4 | 5;

/**
 * Star rating thresholds for level completion.
 */
export interface StarThresholds {
  /** Minimum score for 1 star */
  oneStar: number;
  /** Minimum score for 2 stars */
  twoStar: number;
  /** Minimum score for 3 stars */
  threeStar: number;
}

/**
 * Level bounds definition.
 */
export interface LevelBounds {
  /** Minimum X coordinate */
  minX: number;
  /** Maximum X coordinate */
  maxX: number;
  /** Minimum Y coordinate (top) */
  minY: number;
  /** Maximum Y coordinate (bottom) */
  maxY: number;
}

/**
 * Spawn bubble color - affects gravity behavior.
 * - green: Standard gravity
 * - white: Reduced gravity
 * - blue: Reversed/anti-gravity
 */
export type BubbleColor = 'green' | 'white' | 'blue';

/**
 * Player spawn point definition.
 */
export interface SpawnPoint {
  /** X coordinate */
  x: number;
  /** Y coordinate */
  y: number;
  /** Bubble color - affects gravity (default: green) */
  bubbleColor?: BubbleColor;
}

/**
 * Wrap hole definition - allows rocket to wrap through top/bottom.
 */
export interface WrapHole {
  /** Minimum X of the hole */
  minX: number;
  /** Maximum X of the hole */
  maxX: number;
}

/**
 * Level environment/theme.
 */
export type LevelTheme =
  | 'space'
  | 'moon'
  | 'mars'
  | 'asteroid'
  | 'ice'
  | 'underground'
  | 'station';

/**
 * Background layer definition.
 */
export interface BackgroundLayer {
  /** Texture key for this layer */
  texture: string;
  /** Parallax factor (0 = static, 1 = moves with camera) */
  parallax: number;
  /** Tint color (optional) */
  tint?: number;
  /** Alpha transparency */
  alpha?: number;
}

/**
 * Level visual configuration.
 */
export interface LevelVisuals {
  /** Level theme */
  theme: LevelTheme;
  /** Background color */
  backgroundColor: string;
  /** Background layers for parallax effect */
  backgroundLayers?: BackgroundLayer[];
  /** Ambient light color */
  ambientLight?: string;
  /** Whether to show stars in background */
  showStars?: boolean;
}

/**
 * Complete level data definition.
 *
 * This interface defines all data needed to load and play a level.
 * Levels are defined as static data objects (not classes).
 */
export interface Level {
  /** Unique level identifier */
  id: string;

  /** Display name */
  name: string;

  /** Brief description */
  description: string;

  /** Difficulty rating (1-5) */
  difficulty: DifficultyRating;

  /** Level number for ordering (1-based) */
  levelNumber: number;

  // === Physics Configuration ===

  /** Gravity strength (positive = downward) */
  gravity: number;

  /** Starting fuel amount */
  startingFuel: number;

  /** Maximum safe landing velocity */
  safeLandingVelocity?: number;

  /** Maximum safe landing angle in degrees */
  safeLandingAngle?: number;

  /** Auto-stabilization strength (0 = none, 1 = strong) - helps beginners */
  autoStabilization?: number;

  // === Spawn & Bounds ===

  /** Player spawn point with optional bubble color */
  spawnPoint: SpawnPoint;

  /** Level boundaries */
  bounds: LevelBounds;

  /** Wrap holes - horizontal zones where rocket can wrap top/bottom */
  wrapHoles?: WrapHole[];

  // === Terrain & Obstacles ===

  /** Terrain blocks (solid collision) */
  terrain: TerrainBlock[];

  /** Landing pads */
  landingPads: LandingPad[];

  /** Ice layers (can be drilled) */
  iceLayers?: IceLayer[];

  // === Dynamic Elements ===

  /** Hazards (moving columns, lasers, etc.) */
  hazards?: HazardDef[];

  /** Enemies */
  enemies?: EnemyDef[];

  /** Fuel pickups */
  fuelPickups?: FuelPickup[];

  /** Collectibles (coins, stars) */
  collectibles?: Collectible[];

  /** Checkpoints */
  checkpoints?: Checkpoint[];

  /** Multiplier bubbles (collect to increase score multiplier) */
  multiplierBubbles?: MultiplierBubble[];

  // === Scoring & Progression ===

  /** Base score for completing the level */
  baseScore: number;

  /** Star rating thresholds */
  starThresholds: StarThresholds;

  /** Time bonus multiplier */
  timeBonusMultiplier?: number;

  /** Par time in seconds (for time bonus) */
  parTime?: number;

  // === Visuals ===

  /** Visual configuration */
  visuals: LevelVisuals;

  // === Hints & Tutorial ===

  /** Tutorial messages to show */
  tutorialMessages?: string[];

  /** Hint text shown on first attempt */
  hint?: string;
}

/**
 * Level state snapshot (for save/load).
 */
export interface LevelState {
  /** Level ID */
  levelId: string;
  /** Whether level is unlocked */
  unlocked: boolean;
  /** Best star rating achieved */
  bestStars: number;
  /** High score */
  highScore: number;
  /** Best time in seconds */
  bestTime: number | null;
  /** Number of attempts */
  attempts: number;
  /** Number of completions */
  completions: number;
  /** Collected collectible IDs */
  collectedItems: string[];
}

/**
 * Creates a default level state.
 */
export function createDefaultLevelState(
  levelId: string,
  unlocked = false
): LevelState {
  return {
    levelId,
    unlocked,
    bestStars: 0,
    highScore: 0,
    bestTime: null,
    attempts: 0,
    completions: 0,
    collectedItems: [],
  };
}

/**
 * Validates a level definition for completeness.
 */
export function validateLevel(level: Level): string[] {
  const errors: string[] = [];

  if (!level.id) errors.push('Level must have an id');
  if (!level.name) errors.push('Level must have a name');
  if (level.landingPads.length === 0) {
    errors.push('Level must have at least one landing pad');
  }
  if (level.gravity <= 0) {
    errors.push('Gravity must be positive');
  }
  if (level.startingFuel <= 0) {
    errors.push('Starting fuel must be positive');
  }

  // Check bounds contain spawn point
  const { spawnPoint, bounds } = level;
  if (
    spawnPoint.x < bounds.minX ||
    spawnPoint.x > bounds.maxX ||
    spawnPoint.y < bounds.minY ||
    spawnPoint.y > bounds.maxY
  ) {
    errors.push('Spawn point must be within level bounds');
  }

  return errors;
}
