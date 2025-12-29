/**
 * @fileoverview Editor-specific type definitions.
 */

import type { Vector2 } from '@shared/core/math';
import type {
  TerrainBlock,
  LandingPad,
  FuelPickup,
  Collectible,
  MultiplierBubble,
  Checkpoint,
  IceLayer,
  HazardDef,
} from '@shared/types/Obstacles';
import type { EnemyDef } from '@shared/types/Enemies';
import type {
  DifficultyRating,
  LevelTheme,
  StarThresholds,
  LevelBounds,
  BubbleColor,
} from '@shared/types/Level';

/**
 * Entity types that can be placed in the editor.
 */
export type EditorEntityType =
  | 'terrain'
  | 'landingPad'
  | 'fuelPickup'
  | 'collectible'
  | 'multiplierBubble'
  | 'checkpoint'
  | 'iceLayer'
  | 'patrolShip'
  | 'laserField'
  | 'bubbleGun'
  | 'warpZone'
  | 'gravityWell'
  | 'enemy'
  | 'spawnPoint';

/**
 * Base interface for all editor entities.
 */
export interface EditorEntityBase {
  /** Unique editor ID for tracking */
  editorId: string;
  /** Entity type */
  type: EditorEntityType;
}

/**
 * Editor terrain block with editor ID.
 */
export interface EditorTerrainBlock extends TerrainBlock, EditorEntityBase {
  type: 'terrain';
}

/**
 * Editor landing pad with editor ID.
 */
export interface EditorLandingPad extends LandingPad, EditorEntityBase {
  type: 'landingPad';
}

/**
 * Editor fuel pickup with editor ID.
 */
export interface EditorFuelPickup extends FuelPickup, EditorEntityBase {
  type: 'fuelPickup';
}

/**
 * Editor collectible with editor ID.
 */
export interface EditorCollectible extends Collectible, EditorEntityBase {
  type: 'collectible';
}

/**
 * Editor multiplier bubble with editor ID.
 */
export interface EditorMultiplierBubble extends MultiplierBubble, EditorEntityBase {
  type: 'multiplierBubble';
}

/**
 * Editor checkpoint with editor ID.
 */
export interface EditorCheckpoint extends Checkpoint, EditorEntityBase {
  type: 'checkpoint';
}

/**
 * Editor ice layer with editor ID.
 */
export interface EditorIceLayer extends IceLayer, EditorEntityBase {
  type: 'iceLayer';
}

/**
 * Editor hazard with editor ID.
 */
export interface EditorHazard extends EditorEntityBase {
  type: 'patrolShip' | 'laserField' | 'bubbleGun' | 'warpZone' | 'gravityWell';
  data: HazardDef;
}

/**
 * Editor enemy with editor ID.
 */
export interface EditorEnemy extends EditorEntityBase {
  type: 'enemy';
  data: EnemyDef;
}

/**
 * Editor spawn point.
 */
export interface EditorSpawnPoint extends EditorEntityBase {
  type: 'spawnPoint';
  x: number;
  y: number;
  /** Bubble color - affects gravity (green=standard, white=reduced, blue=anti) */
  bubbleColor: BubbleColor;
}

/**
 * Union of all editor entity types.
 */
export type EditorEntity =
  | EditorTerrainBlock
  | EditorLandingPad
  | EditorFuelPickup
  | EditorCollectible
  | EditorMultiplierBubble
  | EditorCheckpoint
  | EditorIceLayer
  | EditorHazard
  | EditorEnemy
  | EditorSpawnPoint;

/**
 * Complete editor state for a level.
 */
export interface EditorState {
  // Level metadata
  levelId: string;
  levelName: string;
  description: string;
  difficulty: DifficultyRating;
  levelNumber: number;

  // Physics settings
  gravity: number;
  startingFuel: number;
  safeLandingVelocity: number;
  safeLandingAngle: number;
  autoStabilization: number;

  // Spawn and bounds
  spawnPoint: { x: number; y: number; bubbleColor: BubbleColor };
  bounds: LevelBounds;

  // Entities
  terrain: EditorTerrainBlock[];
  landingPads: EditorLandingPad[];
  fuelPickups: EditorFuelPickup[];
  collectibles: EditorCollectible[];
  multiplierBubbles: EditorMultiplierBubble[];
  checkpoints: EditorCheckpoint[];
  iceLayers: EditorIceLayer[];
  hazards: EditorHazard[];
  enemies: EditorEnemy[];

  // Visual settings
  theme: LevelTheme;
  backgroundColor: string;
  showStars: boolean;
  ambientLight: string;

  // Scoring
  baseScore: number;
  starThresholds: StarThresholds;
  parTime: number;
}

/**
 * Palette item definition.
 */
export interface PaletteItem {
  type: EditorEntityType;
  label: string;
  icon: string;
  color: number;
  defaultWidth?: number;
  defaultHeight?: number;
}

/**
 * Editor visual entity - links data to Phaser objects.
 */
export interface EditorVisualEntity {
  editorId: string;
  type: EditorEntityType;
  container: Phaser.GameObjects.Container;
  selectionBox?: Phaser.GameObjects.Rectangle;
  resizeHandles?: Phaser.GameObjects.Rectangle[];
}

/**
 * Editor mode.
 */
export type EditorMode = 'edit' | 'test';

/**
 * Selection state.
 */
export interface SelectionState {
  selectedId: string | null;
  isDragging: boolean;
  isResizing: boolean;
  resizeHandle: 'nw' | 'ne' | 'sw' | 'se' | null;
  dragStartX: number;
  dragStartY: number;
  entityStartX: number;
  entityStartY: number;
  entityStartWidth: number;
  entityStartHeight: number;
}
