/**
 * @fileoverview Type definitions exports.
 */

export type {
  PositionedObject,
  RectObject,
  TerrainBlock,
  LandingPad,
  IceLayer,
  MovingColumnDef,
  LaserFieldDef,
  HazardDef,
  FuelPickup,
  Collectible,
  Checkpoint,
  MultiplierBubble,
  StaticObstacles,
  DynamicObstacles,
} from './Obstacles';

export type {
  EnemyWaypoint,
  EnemyType,
  EnemyBaseDef,
  PatrolEnemyDef,
  StationaryEnemyDef,
  ChaserEnemyDef,
  TurretEnemyDef,
  EnemyDef,
} from './Enemies';
export { createPatrolEnemyDef, createSimplePatrolPath } from './Enemies';

export type {
  DifficultyRating,
  StarThresholds,
  LevelBounds,
  LevelTheme,
  BackgroundLayer,
  LevelVisuals,
  Level,
  LevelState,
} from './Level';
export { createDefaultLevelState, validateLevel } from './Level';
