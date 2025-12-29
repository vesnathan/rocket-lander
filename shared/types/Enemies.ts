/**
 * @fileoverview Enemy type definitions for level data.
 * Defines enemy configurations that can be placed in levels.
 */

import type { Vector2 } from '../core/math';
import type { PositionedObject } from './Obstacles';

/**
 * Patrol waypoint for enemy movement.
 */
export interface EnemyWaypoint {
  /** Position of waypoint */
  position: Vector2;
  /** Wait time at this waypoint in seconds */
  waitTime?: number;
  /** Custom speed to this waypoint */
  speed?: number;
}

/**
 * Enemy type enumeration.
 */
export type EnemyType = 'patrol' | 'stationary' | 'chaser' | 'turret';

/**
 * Base enemy definition.
 */
export interface EnemyBaseDef extends PositionedObject {
  /** Unique identifier for this enemy */
  id: string;
  /** Enemy type */
  type: EnemyType;
  /** Whether enemy is active at level start */
  active?: boolean;
}

/**
 * Patrol enemy definition.
 * Follows a predefined path, chases on sight.
 */
export interface PatrolEnemyDef extends EnemyBaseDef {
  type: 'patrol';
  /** Patrol waypoints */
  patrolPath: EnemyWaypoint[];
  /** Whether to loop patrol (true) or reverse (false) */
  loopPatrol?: boolean;
  /** Patrol speed */
  patrolSpeed?: number;
  /** Chase speed */
  chaseSpeed?: number;
  /** Vision range in pixels */
  visionRange?: number;
  /** Vision cone angle in degrees */
  visionAngle?: number;
  /** How long to chase after losing sight (seconds) */
  chasePersistence?: number;
}

/**
 * Stationary enemy definition.
 * Stays in place but can detect and alert.
 */
export interface StationaryEnemyDef extends EnemyBaseDef {
  type: 'stationary';
  /** Vision range */
  visionRange?: number;
  /** Vision angle */
  visionAngle?: number;
  /** Facing direction in degrees */
  facingAngle?: number;
}

/**
 * Chaser enemy definition.
 * Always chases the player when in range.
 */
export interface ChaserEnemyDef extends EnemyBaseDef {
  type: 'chaser';
  /** Activation range */
  activationRange: number;
  /** Chase speed */
  chaseSpeed?: number;
  /** Maximum chase distance from spawn */
  maxChaseDistance?: number;
}

/**
 * Turret enemy definition.
 * Fires projectiles at the player.
 */
export interface TurretEnemyDef extends EnemyBaseDef {
  type: 'turret';
  /** Fire rate in shots per second */
  fireRate: number;
  /** Projectile speed */
  projectileSpeed: number;
  /** Detection range */
  detectionRange: number;
  /** Rotation speed in degrees per second */
  rotationSpeed?: number;
  /** Aiming lead (predicts player movement) */
  aimLead?: number;
}

/**
 * Union type for all enemy definitions.
 */
export type EnemyDef =
  | PatrolEnemyDef
  | StationaryEnemyDef
  | ChaserEnemyDef
  | TurretEnemyDef;

/**
 * Creates a default patrol enemy definition.
 */
export function createPatrolEnemyDef(
  id: string,
  x: number,
  y: number,
  patrolPath: EnemyWaypoint[]
): PatrolEnemyDef {
  return {
    id,
    type: 'patrol',
    x,
    y,
    patrolPath,
    loopPatrol: true,
    patrolSpeed: 60,
    chaseSpeed: 100,
    visionRange: 200,
    visionAngle: 90,
    chasePersistence: 2,
    active: true,
  };
}

/**
 * Creates a simple back-and-forth patrol path.
 */
export function createSimplePatrolPath(
  startX: number,
  endX: number,
  y: number,
  waitTime = 0.5
): EnemyWaypoint[] {
  return [
    { position: { x: startX, y }, waitTime },
    { position: { x: endX, y }, waitTime },
  ];
}
