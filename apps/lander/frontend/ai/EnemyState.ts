/**
 * @fileoverview Enemy state machine definitions.
 * Defines states and transitions for enemy AI behavior.
 */

import type { Vector2 } from '../core/math';

/**
 * Enemy behavior states.
 */
export enum EnemyBehaviorState {
  /** Following a predefined patrol path */
  Patrol = 'patrol',
  /** Actively chasing the player */
  Chase = 'chase',
  /** Returning to patrol path after losing sight */
  Return = 'return',
  /** Temporarily stunned or disabled */
  Stunned = 'stunned',
  /** Idle, not moving */
  Idle = 'idle',
}

/**
 * Patrol path waypoint.
 */
export interface PatrolWaypoint {
  /** Position of this waypoint */
  position: Vector2;
  /** Optional wait time at this waypoint in seconds */
  waitTime?: number;
  /** Optional custom speed to use when traveling to this waypoint */
  speed?: number;
}

/**
 * Vision cone configuration for detecting the player.
 */
export interface VisionConfig {
  /** Maximum detection range in pixels */
  range: number;
  /** Vision cone angle in degrees (full cone width) */
  angle: number;
  /** Whether vision is blocked by terrain */
  blockedByTerrain: boolean;
}

/**
 * Enemy AI configuration.
 */
export interface EnemyConfig {
  /** Movement speed during patrol */
  patrolSpeed: number;
  /** Movement speed during chase */
  chaseSpeed: number;
  /** Movement speed when returning to patrol */
  returnSpeed: number;
  /** Vision configuration */
  vision: VisionConfig;
  /** How long to chase after losing sight (seconds) */
  chasePersistence: number;
  /** Patrol waypoints */
  patrolPath: PatrolWaypoint[];
  /** Whether to loop patrol path or reverse */
  loopPatrol: boolean;
  /** Starting behavior state */
  initialState: EnemyBehaviorState;
}

/**
 * Default enemy configuration.
 */
export const DEFAULT_ENEMY_CONFIG: EnemyConfig = {
  patrolSpeed: 60,
  chaseSpeed: 100,
  returnSpeed: 80,
  vision: {
    range: 200,
    angle: 90,
    blockedByTerrain: true,
  },
  chasePersistence: 2.0,
  patrolPath: [],
  loopPatrol: true,
  initialState: EnemyBehaviorState.Patrol,
};

/**
 * State data for patrol behavior.
 */
export interface PatrolStateData {
  /** Current waypoint index */
  waypointIndex: number;
  /** Time waiting at current waypoint */
  waitTimer: number;
  /** Direction of patrol traversal (1 = forward, -1 = backward) */
  direction: 1 | -1;
}

/**
 * State data for chase behavior.
 */
export interface ChaseStateData {
  /** Last known position of the target */
  lastKnownPosition: Vector2;
  /** Time since target was last seen */
  timeSinceSeen: number;
  /** Whether target is currently visible */
  canSeeTarget: boolean;
}

/**
 * State data for return behavior.
 */
export interface ReturnStateData {
  /** Position to return to (nearest patrol waypoint) */
  returnTarget: Vector2;
  /** Index of target waypoint */
  waypointIndex: number;
}

/**
 * State data for stunned behavior.
 */
export interface StunnedStateData {
  /** Remaining stun duration */
  stunTimer: number;
  /** State to return to after stun */
  previousState: EnemyBehaviorState;
}

/**
 * Union type for all state data.
 */
export type EnemyStateData =
  | { type: EnemyBehaviorState.Patrol; data: PatrolStateData }
  | { type: EnemyBehaviorState.Chase; data: ChaseStateData }
  | { type: EnemyBehaviorState.Return; data: ReturnStateData }
  | { type: EnemyBehaviorState.Stunned; data: StunnedStateData }
  | { type: EnemyBehaviorState.Idle; data: Record<string, never> };

/**
 * Creates initial patrol state data.
 */
export function createPatrolState(): PatrolStateData {
  return {
    waypointIndex: 0,
    waitTimer: 0,
    direction: 1,
  };
}

/**
 * Creates initial chase state data.
 */
export function createChaseState(targetPosition: Vector2): ChaseStateData {
  return {
    lastKnownPosition: { ...targetPosition },
    timeSinceSeen: 0,
    canSeeTarget: true,
  };
}

/**
 * Creates initial return state data.
 */
export function createReturnState(
  returnTarget: Vector2,
  waypointIndex: number
): ReturnStateData {
  return {
    returnTarget: { ...returnTarget },
    waypointIndex,
  };
}

/**
 * Creates initial stunned state data.
 */
export function createStunnedState(
  duration: number,
  previousState: EnemyBehaviorState
): StunnedStateData {
  return {
    stunTimer: duration,
    previousState,
  };
}
