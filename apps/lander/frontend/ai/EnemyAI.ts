/**
 * @fileoverview Enemy AI controller with patrol and chase behavior.
 * Implements Bubble-Bobble-style enemy movement patterns.
 */

import * as Phaser from 'phaser';
import {
  vec2,
  vec2Sub,
  vec2Magnitude,
  vec2Normalize,
  vec2Scale,
  vec2Add,
  type Vector2,
} from '../core/math';
import {
  EnemyBehaviorState,
  DEFAULT_ENEMY_CONFIG,
  createPatrolState,
  createChaseState,
  createReturnState,
  createStunnedState,
  type EnemyConfig,
  type PatrolStateData,
  type ChaseStateData,
  type ReturnStateData,
  type StunnedStateData,
  type PatrolWaypoint,
} from './EnemyState';

/**
 * AI controller for enemy behavior.
 *
 * Features:
 * - Predefined patrol paths
 * - Vision cone detection
 * - Chase on sight
 * - Return to patrol after losing target
 * - Stun support
 *
 * @example
 * ```typescript
 * const enemy = new EnemyAI(scene, 100, 200, {
 *   patrolPath: [
 *     { position: { x: 100, y: 200 } },
 *     { position: { x: 300, y: 200 }, waitTime: 1 },
 *   ],
 *   vision: { range: 150, angle: 60, blockedByTerrain: true },
 * });
 *
 * // In update
 * enemy.update(deltaTime, playerPosition);
 * ```
 */
export class EnemyAI {
  /** Reference to the scene */
  private scene: Phaser.Scene;

  /** The enemy sprite */
  readonly sprite: Phaser.Physics.Arcade.Sprite;

  /** Configuration */
  private config: EnemyConfig;

  /** Current behavior state */
  private behaviorState: EnemyBehaviorState;

  /** State-specific data */
  private patrolData: PatrolStateData;
  private chaseData: ChaseStateData | null = null;
  private returnData: ReturnStateData | null = null;
  private stunnedData: StunnedStateData | null = null;

  /** Current position */
  private position: Vector2;

  /** Current velocity */
  private velocity: Vector2;

  /** Facing direction (-1 = left, 1 = right) */
  private facing: -1 | 1 = 1;

  /** Event emitter */
  readonly events: Phaser.Events.EventEmitter;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    config: Partial<EnemyConfig> = {}
  ) {
    this.scene = scene;
    this.config = { ...DEFAULT_ENEMY_CONFIG, ...config };
    this.position = vec2(x, y);
    this.velocity = vec2(0, 0);
    this.events = new Phaser.Events.EventEmitter();

    // Initialize state
    this.behaviorState = this.config.initialState;
    this.patrolData = createPatrolState();

    // Create sprite with placeholder graphics
    this.sprite = this.createSprite(x, y);

    // Set initial waypoint if patrolling
    const firstWaypoint = this.config.patrolPath[0];
    if (
      this.behaviorState === EnemyBehaviorState.Patrol &&
      firstWaypoint
    ) {
      this.position = { ...firstWaypoint.position };
      this.sprite.setPosition(this.position.x, this.position.y);
    }
  }

  /**
   * Create the enemy sprite with placeholder graphics.
   */
  private createSprite(x: number, y: number): Phaser.Physics.Arcade.Sprite {
    // Create placeholder texture if needed
    if (!this.scene.textures.exists('enemy')) {
      const graphics = this.scene.add.graphics();

      // Draw enemy shape (simple ghost-like)
      graphics.fillStyle(0xff4444);
      graphics.fillCircle(16, 12, 12); // Head
      graphics.fillRect(4, 12, 24, 16); // Body

      // Eyes
      graphics.fillStyle(0xffffff);
      graphics.fillCircle(11, 10, 4);
      graphics.fillCircle(21, 10, 4);
      graphics.fillStyle(0x000000);
      graphics.fillCircle(12, 10, 2);
      graphics.fillCircle(22, 10, 2);

      graphics.generateTexture('enemy', 32, 32);
      graphics.destroy();
    }

    const sprite = this.scene.physics.add.sprite(x, y, 'enemy');
    sprite.setScale(1);

    const body = sprite.body as Phaser.Physics.Arcade.Body;
    body.setSize(28, 28);
    body.setAllowGravity(false);

    return sprite;
  }

  /**
   * Update the enemy AI.
   *
   * @param deltaTime - Time since last update in seconds
   * @param targetPosition - Current position of the player
   * @param terrainBodies - Optional terrain bodies for vision blocking
   */
  update(
    deltaTime: number,
    targetPosition: Vector2,
    terrainBodies?: Phaser.Physics.Arcade.StaticGroup
  ): void {
    // Check vision
    const canSeeTarget = this.checkVision(targetPosition, terrainBodies);

    // Update behavior state machine
    switch (this.behaviorState) {
      case EnemyBehaviorState.Patrol:
        this.updatePatrol(deltaTime, canSeeTarget, targetPosition);
        break;

      case EnemyBehaviorState.Chase:
        this.updateChase(deltaTime, canSeeTarget, targetPosition);
        break;

      case EnemyBehaviorState.Return:
        this.updateReturn(deltaTime, canSeeTarget, targetPosition);
        break;

      case EnemyBehaviorState.Stunned:
        this.updateStunned(deltaTime);
        break;

      case EnemyBehaviorState.Idle:
        // Do nothing
        break;
    }

    // Apply velocity
    this.position = vec2Add(this.position, vec2Scale(this.velocity, deltaTime));
    this.sprite.setPosition(this.position.x, this.position.y);

    // Update facing direction
    if (this.velocity.x > 0.1) {
      this.facing = 1;
      this.sprite.setFlipX(false);
    } else if (this.velocity.x < -0.1) {
      this.facing = -1;
      this.sprite.setFlipX(true);
    }
  }

  /**
   * Check if target is within vision cone.
   */
  private checkVision(
    targetPosition: Vector2,
    terrainBodies?: Phaser.Physics.Arcade.StaticGroup
  ): boolean {
    const { range, angle, blockedByTerrain } = this.config.vision;

    // Check distance
    const toTarget = vec2Sub(targetPosition, this.position);
    const distance = vec2Magnitude(toTarget);

    if (distance > range) {
      return false;
    }

    // Check angle
    const direction = vec2Normalize(toTarget);
    const facingVec = vec2(this.facing, 0);
    const dot = direction.x * facingVec.x + direction.y * facingVec.y;
    const angleToTarget = Math.acos(dot) * (180 / Math.PI);

    if (angleToTarget > angle / 2) {
      return false;
    }

    // Check terrain blocking (simplified - just uses raycast)
    if (blockedByTerrain && terrainBodies) {
      // For simplicity, we'll skip actual raycasting
      // In a full implementation, you'd use Phaser's ray casting
      return true;
    }

    return true;
  }

  /**
   * Update patrol behavior.
   */
  private updatePatrol(
    deltaTime: number,
    canSeeTarget: boolean,
    targetPosition: Vector2
  ): void {
    // Check for target detection
    if (canSeeTarget) {
      this.transitionToChase(targetPosition);
      return;
    }

    const path = this.config.patrolPath;
    if (path.length === 0) {
      this.velocity = vec2(0, 0);
      return;
    }

    const currentWaypoint = path[this.patrolData.waypointIndex];
    if (!currentWaypoint) {
      this.velocity = vec2(0, 0);
      return;
    }

    // Check if waiting at waypoint
    if (this.patrolData.waitTimer > 0) {
      this.patrolData.waitTimer -= deltaTime;
      this.velocity = vec2(0, 0);
      return;
    }

    // Move towards current waypoint
    const toWaypoint = vec2Sub(currentWaypoint.position, this.position);
    const distance = vec2Magnitude(toWaypoint);

    if (distance < 5) {
      // Reached waypoint
      this.patrolData.waitTimer = currentWaypoint.waitTime ?? 0;

      // Advance to next waypoint
      this.advancePatrolWaypoint();
    } else {
      // Move towards waypoint
      const speed = currentWaypoint.speed ?? this.config.patrolSpeed;
      const direction = vec2Normalize(toWaypoint);
      this.velocity = vec2Scale(direction, speed);
    }
  }

  /**
   * Advance to next patrol waypoint.
   */
  private advancePatrolWaypoint(): void {
    const path = this.config.patrolPath;
    const nextIndex =
      this.patrolData.waypointIndex + this.patrolData.direction;

    if (this.config.loopPatrol) {
      // Loop back to start
      this.patrolData.waypointIndex =
        (nextIndex + path.length) % path.length;
    } else {
      // Reverse direction at ends
      if (nextIndex < 0 || nextIndex >= path.length) {
        this.patrolData.direction *= -1;
        this.patrolData.waypointIndex =
          this.patrolData.waypointIndex + this.patrolData.direction;
      } else {
        this.patrolData.waypointIndex = nextIndex;
      }
    }
  }

  /**
   * Update chase behavior.
   */
  private updateChase(
    deltaTime: number,
    canSeeTarget: boolean,
    targetPosition: Vector2
  ): void {
    if (!this.chaseData) return;

    if (canSeeTarget) {
      // Update last known position
      this.chaseData.lastKnownPosition = { ...targetPosition };
      this.chaseData.timeSinceSeen = 0;
      this.chaseData.canSeeTarget = true;
    } else {
      // Lost sight
      this.chaseData.timeSinceSeen += deltaTime;
      this.chaseData.canSeeTarget = false;

      // Check persistence timeout
      if (this.chaseData.timeSinceSeen >= this.config.chasePersistence) {
        this.transitionToReturn();
        return;
      }
    }

    // Move towards last known position
    const toTarget = vec2Sub(
      this.chaseData.lastKnownPosition,
      this.position
    );
    const distance = vec2Magnitude(toTarget);

    if (distance < 5 && !this.chaseData.canSeeTarget) {
      // Reached last known position but can't see target
      this.transitionToReturn();
    } else {
      const direction = vec2Normalize(toTarget);
      this.velocity = vec2Scale(direction, this.config.chaseSpeed);
    }
  }

  /**
   * Update return behavior.
   */
  private updateReturn(
    _deltaTime: number,
    canSeeTarget: boolean,
    targetPosition: Vector2
  ): void {
    if (!this.returnData) return;

    // Check for target detection
    if (canSeeTarget) {
      this.transitionToChase(targetPosition);
      return;
    }

    // Move towards return target
    const toTarget = vec2Sub(this.returnData.returnTarget, this.position);
    const distance = vec2Magnitude(toTarget);

    if (distance < 5) {
      // Reached return target, resume patrol
      this.behaviorState = EnemyBehaviorState.Patrol;
      this.patrolData.waypointIndex = this.returnData.waypointIndex;
      this.patrolData.waitTimer = 0;
      this.returnData = null;
      this.events.emit('returnComplete');
    } else {
      const direction = vec2Normalize(toTarget);
      this.velocity = vec2Scale(direction, this.config.returnSpeed);
    }
  }

  /**
   * Update stunned behavior.
   */
  private updateStunned(deltaTime: number): void {
    if (!this.stunnedData) return;

    this.velocity = vec2(0, 0);
    this.stunnedData.stunTimer -= deltaTime;

    if (this.stunnedData.stunTimer <= 0) {
      // Return to previous state
      this.behaviorState = this.stunnedData.previousState;
      this.stunnedData = null;
      this.events.emit('stunEnd');
    }
  }

  /**
   * Transition to chase state.
   */
  private transitionToChase(targetPosition: Vector2): void {
    this.behaviorState = EnemyBehaviorState.Chase;
    this.chaseData = createChaseState(targetPosition);
    this.returnData = null;
    this.events.emit('chase');
  }

  /**
   * Transition to return state.
   */
  private transitionToReturn(): void {
    this.behaviorState = EnemyBehaviorState.Return;

    // Find nearest patrol waypoint
    let nearestIndex = 0;
    let nearestDistance = Infinity;

    for (let i = 0; i < this.config.patrolPath.length; i++) {
      const waypoint = this.config.patrolPath[i];
      if (!waypoint) continue;
      const distance = vec2Magnitude(
        vec2Sub(waypoint.position, this.position)
      );
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = i;
      }
    }

    const returnTarget = this.config.patrolPath[nearestIndex]?.position ?? this.position;
    this.returnData = createReturnState(returnTarget, nearestIndex);
    this.chaseData = null;
    this.events.emit('return');
  }

  /**
   * Stun the enemy for a duration.
   */
  stun(duration: number): void {
    const previousState = this.behaviorState;
    this.behaviorState = EnemyBehaviorState.Stunned;
    this.stunnedData = createStunnedState(duration, previousState);
    this.events.emit('stunStart', duration);
  }

  /**
   * Reset the enemy to initial state.
   */
  reset(): void {
    this.behaviorState = this.config.initialState;
    this.patrolData = createPatrolState();
    this.chaseData = null;
    this.returnData = null;
    this.stunnedData = null;
    this.velocity = vec2(0, 0);

    const firstWaypoint = this.config.patrolPath[0];
    if (firstWaypoint) {
      this.position = { ...firstWaypoint.position };
    }

    this.sprite.setPosition(this.position.x, this.position.y);
  }

  /**
   * Get current behavior state.
   */
  getBehaviorState(): EnemyBehaviorState {
    return this.behaviorState;
  }

  /**
   * Get current position.
   */
  getPosition(): Vector2 {
    return { ...this.position };
  }

  /**
   * Set the patrol path.
   */
  setPatrolPath(path: PatrolWaypoint[]): void {
    this.config.patrolPath = path;
    this.patrolData = createPatrolState();
  }

  /**
   * Destroy the enemy and clean up resources.
   */
  destroy(): void {
    this.events.removeAllListeners();
    this.sprite.destroy();
  }
}

/**
 * Factory function to create enemies from level data.
 */
export function createEnemiesFromConfig(
  scene: Phaser.Scene,
  enemyConfigs: Array<{ x: number; y: number; config: Partial<EnemyConfig> }>
): EnemyAI[] {
  return enemyConfigs.map(
    ({ x, y, config }) => new EnemyAI(scene, x, y, config)
  );
}
