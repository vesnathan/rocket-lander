/**
 * @fileoverview Obstacle and terrain type definitions.
 * Defines all static and dynamic obstacles in levels.
 */

/**
 * Base interface for all level objects with position.
 */
export interface PositionedObject {
  /** X coordinate */
  x: number;
  /** Y coordinate */
  y: number;
}

/**
 * Base interface for rectangular objects.
 */
export interface RectObject extends PositionedObject {
  /** Width in pixels */
  width: number;
  /** Height in pixels */
  height: number;
}

/**
 * Terrain block definition.
 * Represents solid, immovable terrain.
 */
export interface TerrainBlock extends RectObject {
  /** Optional texture/style identifier */
  style?: 'rock' | 'metal' | 'ice' | 'default';
  /** Whether this terrain is slippery (affects landing) */
  slippery?: boolean;
}

/**
 * Landing pad definition.
 * The target for successful level completion.
 */
export interface LandingPad extends RectObject {
  /** Unique identifier for this pad */
  id: string;
  /** Whether this is the primary/required landing pad */
  primary?: boolean;
  /** Point multiplier for landing on this pad */
  pointMultiplier?: number;
  /** Minimum clearance required above pad */
  clearanceRequired?: number;
}

/**
 * Ice layer definition.
 * Can be destroyed with Nuclear Ice Drill item.
 */
export interface IceLayer extends RectObject {
  /** Unique identifier for this ice layer */
  id: string;
  /** Thickness affects drill time (1 = standard) */
  thickness?: number;
  /** Whether destroying this ice reveals a landing pad */
  revealsLandingPad?: boolean;
  /** ID of landing pad revealed (if applicable) */
  revealedPadId?: string;
}

/**
 * Boundary behavior for moving columns.
 * - 'bounce': Reverse direction when hitting terrain or bounds
 * - 'wrap': Teleport to opposite side
 * - 'stop': Stop at this boundary (one-way movement)
 * - 'terrain': Dynamically detect and bounce off terrain (default)
 */
export type ColumnBoundaryMode = 'bounce' | 'wrap' | 'stop' | 'terrain';

/**
 * Patrol ship hazard configuration.
 */
export interface PatrolShipDef extends PositionedObject {
  /** Type identifier */
  type: 'patrolShip';
  /** Column width */
  width: number;
  /** Column height */
  height: number;
  /** Movement speed in pixels per second */
  speed: number;
  /** Starting direction (1 = down, -1 = up) */
  startDirection?: 1 | -1;
  /** Behavior when reaching top: 'terrain' (default), 'bounce', 'wrap', or 'stop' */
  topMode?: ColumnBoundaryMode;
  /** Behavior when reaching bottom: 'terrain' (default), 'bounce', 'wrap', or 'stop' */
  bottomMode?: ColumnBoundaryMode;
  /** Hard limit for top (used with bounce/stop modes, or wrap destination) */
  minY?: number;
  /** Hard limit for bottom (used with bounce/stop modes, or wrap destination) */
  maxY?: number;
  /** Where column wraps TO when going up through top (default: maxY) */
  wrapTopTo?: number;
  /** Where column wraps TO when going down through bottom (default: minY) */
  wrapBottomTo?: number;
  /** Phase offset in seconds (for syncing multiple columns) */
  phaseOffset?: number;

  // Legacy support
  /** @deprecated Use topMode/bottomMode='wrap' instead */
  wrap?: boolean;
  /** @deprecated Use minY instead */
  wrapMinY?: number;
  /** @deprecated Use maxY instead */
  wrapMaxY?: number;
}

/**
 * Laser field hazard configuration.
 * Supports two formats:
 * 1. Old: x, y, length, angle (horizontal laser centered at x,y)
 * 2. New: x, y, emitterX, emitterY, receiverX, receiverY (endpoints relative to center)
 */
export interface LaserFieldDef extends PositionedObject {
  /** Type identifier */
  type: 'laserField';
  /** Laser width (thickness) */
  width: number;

  // Old format properties (for backward compatibility)
  /** Laser length (old format) */
  length?: number;
  /** Rotation angle in degrees (old format) */
  angle?: number;

  // New endpoint format (relative to center position x,y)
  /** Emitter X position relative to center */
  emitterX?: number;
  /** Emitter Y position relative to center */
  emitterY?: number;
  /** Receiver X position relative to center */
  receiverX?: number;
  /** Receiver Y position relative to center */
  receiverY?: number;

  /** Active duration in milliseconds */
  onDuration: number;
  /** Off duration in milliseconds */
  offDuration: number;
  /** Warning duration in milliseconds */
  warningDuration: number;
  /** Phase offset in milliseconds */
  phaseOffset?: number;
}

/**
 * Bubble type for bubble gun.
 * 'random' will randomly pick blue, green, or white for each shot.
 */
export type BubbleType = 'blue' | 'green' | 'white' | 'random';

/**
 * Bubble gun hazard configuration.
 * Shoots bubbles that can encapsulate the rocket.
 */
export interface BubbleGunDef extends PositionedObject {
  /** Type identifier */
  type: 'bubbleGun';
  /** Direction gun faces: 'left', 'right', 'up', 'down' */
  direction: 'left' | 'right' | 'up' | 'down';
  /** Type of bubbles: green (anti-gravity), blue (gravity), white (neutral/floats) */
  bubbleType: BubbleType;
  /** Time between shots in milliseconds */
  fireRate: number;
  /** Bubble speed in pixels per second */
  bubbleSpeed: number;
  /** How long bubbles last before popping (ms) */
  bubbleDuration?: number;
}

/**
 * Warp zone configuration.
 * Teleports rocket from one location to another.
 */
export interface WarpZoneDef extends PositionedObject {
  /** Type identifier */
  type: 'warpZone';
  /** Width of the warp zone */
  width: number;
  /** Height of the warp zone */
  height: number;
  /** ID of this warp zone (for linking) */
  id: string;
  /** ID of the destination warp zone */
  targetId: string;
  /** Color tint for visual distinction */
  color?: number;
}

/**
 * Gravity well configuration.
 * Creates a localized gravity field that pulls objects toward it.
 */
export interface GravityWellDef extends PositionedObject {
  /** Type identifier */
  type: 'gravityWell';
  /** Radius of effect */
  radius: number;
  /** Strength of pull (positive = attract, negative = repel) */
  strength: number;
  /** Whether it affects the rocket */
  affectsRocket?: boolean;
  /** Whether it affects the start bubble */
  affectsBubble?: boolean;
  /** Color for visual */
  color?: number;
}

/**
 * Union type for all hazard definitions.
 */
export type HazardDef = PatrolShipDef | LaserFieldDef | BubbleGunDef | WarpZoneDef | GravityWellDef;

/**
 * Fuel pickup definition.
 */
export interface FuelPickup extends PositionedObject {
  /** Amount of fuel restored */
  amount: number;
  /** Whether this is a one-time pickup */
  oneTime?: boolean;
}

/**
 * Coin/collectible definition.
 */
export interface Collectible extends PositionedObject {
  /** Type of collectible */
  type: 'coin' | 'star' | 'gem';
  /** Point value */
  value: number;
}

/**
 * Checkpoint definition.
 */
export interface Checkpoint extends PositionedObject {
  /** Unique identifier */
  id: string;
  /** Whether this checkpoint is initially active */
  active?: boolean;
}

/**
 * Multiplier bubble definition.
 * Collecting these increases the end-of-stage score multiplier.
 * Place on riskier routes for higher multipliers.
 */
export interface MultiplierBubble extends PositionedObject {
  /** Unique identifier */
  id: string;
  /** Multiplier value added when collected (e.g., 0.5 adds 0.5x to multiplier) */
  value: number;
  /** Bubble color - higher values should use warmer colors */
  color?: 'bronze' | 'silver' | 'gold' | 'platinum';
  /** Optional group ID - when one in a group is collected, others in the group disappear */
  group?: string;
}

/**
 * All static obstacle types.
 */
export interface StaticObstacles {
  /** Terrain blocks */
  terrain: TerrainBlock[];
  /** Landing pads */
  landingPads: LandingPad[];
  /** Ice layers (drillable) */
  iceLayers: IceLayer[];
}

/**
 * All dynamic obstacle types.
 */
export interface DynamicObstacles {
  /** Hazards (moving columns, lasers, etc.) */
  hazards: HazardDef[];
  /** Fuel pickups */
  fuelPickups: FuelPickup[];
  /** Collectibles */
  collectibles: Collectible[];
  /** Checkpoints */
  checkpoints: Checkpoint[];
}
