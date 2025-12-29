/**
 * @fileoverview Core rocket physics controller.
 * Implements deterministic physics independent of any game engine.
 */

import type { Vector2 } from './math';
import {
  vec2,
  vec2Add,
  vec2Scale,
  vec2Magnitude,
  clamp,
  degToRad,
  normalizeAngle,
  expDecay,
} from './math';
import type { InputState } from '../input/InputState';

/**
 * Rocket physics configuration.
 */
export interface RocketConfig {
  /** Maximum thrust force */
  maxThrust: number;
  /** Rotation speed in radians per second */
  rotationSpeed: number;
  /** Linear velocity damping (air resistance) */
  linearDamping: number;
  /** Angular velocity damping */
  angularDamping: number;
  /** Starting fuel amount */
  maxFuel: number;
  /** Fuel consumption rate per second at full thrust */
  fuelConsumption: number;
  /** Maximum safe landing velocity */
  safeLandingVelocity: number;
  /** Maximum safe landing angle in degrees */
  safeLandingAngle: number;
  /** Gravity vector */
  gravity: Vector2;
  /** Auto-stabilization strength (0 = none, 1 = strong) - helps beginners */
  autoStabilization: number;
}

/**
 * Default rocket configuration.
 */
export const DEFAULT_ROCKET_CONFIG: RocketConfig = {
  maxThrust: 500,
  rotationSpeed: 3.0,
  linearDamping: 0.1,
  angularDamping: 2.0,
  maxFuel: 100,
  fuelConsumption: 10,
  safeLandingVelocity: 100,
  safeLandingAngle: 15,
  gravity: vec2(0, 200),
  autoStabilization: 0,
};

/**
 * Rocket state snapshot for interpolation.
 */
export interface RocketState {
  /** Position in world space */
  position: Vector2;
  /** Velocity in world units per second */
  velocity: Vector2;
  /** Rotation in radians (0 = up) */
  rotation: number;
  /** Angular velocity in radians per second */
  angularVelocity: number;
  /** Current fuel level */
  fuel: number;
  /** Whether thrust is currently active */
  isThrusting: boolean;
  /** Whether the rocket is alive */
  isAlive: boolean;
  /** Whether the rocket has landed successfully */
  hasLanded: boolean;
}

/**
 * Landing evaluation result.
 */
export interface LandingResult {
  /** Whether the landing was successful */
  success: boolean;
  /** Velocity at landing */
  velocity: number;
  /** Angle at landing in degrees */
  angle: number;
  /** Score multiplier based on landing quality */
  scoreMultiplier: number;
  /** Description of landing quality */
  quality: 'perfect' | 'good' | 'rough' | 'crash';
}

/**
 * Collision type enumeration.
 */
export enum CollisionType {
  None = 'none',
  Terrain = 'terrain',
  LandingPad = 'landingPad',
  Hazard = 'hazard',
  Enemy = 'enemy',
}

/**
 * Collision information.
 */
export interface CollisionInfo {
  type: CollisionType;
  point: Vector2;
  normal: Vector2;
}

/**
 * Engine-agnostic rocket physics controller.
 *
 * This class handles all rocket physics simulation:
 * - Thrust and rotation from input
 * - Gravity and damping
 * - Fuel consumption
 * - Landing/crash detection
 *
 * It does NOT handle:
 * - Rendering (handled by Phaser adapter)
 * - Collision detection (provided externally)
 * - Sound effects (triggered via callbacks)
 *
 * @example
 * ```typescript
 * const rocket = new RocketController({
 *   ...DEFAULT_ROCKET_CONFIG,
 *   gravity: vec2(0, 250),
 * });
 *
 * rocket.setPosition(400, 100);
 *
 * // In fixed update loop:
 * rocket.update(inputState, deltaTime);
 *
 * // Check state for rendering
 * const state = rocket.getState();
 * ```
 */
export class RocketController {
  private config: RocketConfig;
  private position: Vector2;
  private velocity: Vector2;
  private rotation: number;
  private angularVelocity: number;
  private fuel: number;
  private isThrusting: boolean;
  private isAlive: boolean;
  private hasLanded: boolean;

  // Previous state for interpolation
  private prevPosition: Vector2;
  private prevRotation: number;

  // Event callbacks
  private onCrash?: () => void;
  private onLand?: (result: LandingResult) => void;
  private onThrustStart?: () => void;
  private onThrustEnd?: () => void;
  private onFuelEmpty?: () => void;

  constructor(config: Partial<RocketConfig> = {}) {
    this.config = { ...DEFAULT_ROCKET_CONFIG, ...config };

    // Initialize state
    this.position = vec2(0, 0);
    this.velocity = vec2(0, 0);
    this.rotation = 0;
    this.angularVelocity = 0;
    this.fuel = this.config.maxFuel;
    this.isThrusting = false;
    this.isAlive = true;
    this.hasLanded = false;

    // Initialize previous state
    this.prevPosition = vec2(0, 0);
    this.prevRotation = 0;
  }

  /**
   * Update rocket physics for one simulation step.
   *
   * @param input - Current input state
   * @param deltaTime - Fixed delta time in seconds
   */
  update(input: InputState, deltaTime: number): void {
    if (!this.isAlive || this.hasLanded) {
      return;
    }

    // Store previous state for interpolation
    this.prevPosition = { ...this.position };
    this.prevRotation = this.rotation;

    // Handle rotation from input
    this.updateRotation(input.roll, deltaTime);

    // Handle thrust
    this.updateThrust(input.thrust, deltaTime);

    // Apply gravity
    this.velocity = vec2Add(
      this.velocity,
      vec2Scale(this.config.gravity, deltaTime)
    );

    // Apply linear damping (air resistance)
    this.velocity = vec2Scale(
      this.velocity,
      Math.pow(1 - this.config.linearDamping, deltaTime)
    );

    // Update position
    this.position = vec2Add(
      this.position,
      vec2Scale(this.velocity, deltaTime)
    );
  }

  /**
   * Update rotation based on roll input.
   */
  private updateRotation(roll: number, deltaTime: number): void {
    // Calculate target angular velocity from input
    let targetAngularVel = roll * this.config.rotationSpeed;

    // Auto-stabilization: gently rotate back to upright when no input
    if (this.config.autoStabilization > 0 && Math.abs(roll) < 0.1) {
      // Calculate how far from upright we are (-PI to PI, 0 = upright)
      const uprightError = normalizeAngle(this.rotation);
      // Apply corrective rotation proportional to error
      const stabilizationForce = -uprightError * this.config.autoStabilization * 2;
      targetAngularVel += stabilizationForce;
    }

    // Smoothly approach target angular velocity
    this.angularVelocity = expDecay(
      this.angularVelocity,
      targetAngularVel,
      this.config.angularDamping,
      deltaTime
    );

    // Apply rotation
    this.rotation = normalizeAngle(
      this.rotation + this.angularVelocity * deltaTime
    );
  }

  /**
   * Update thrust based on input.
   */
  private updateThrust(thrustInput: boolean, deltaTime: number): void {
    const wasThrusting = this.isThrusting;
    this.isThrusting = thrustInput;

    // Handle thrust state changes
    if (this.isThrusting && !wasThrusting) {
      this.onThrustStart?.();
    } else if (!this.isThrusting && wasThrusting) {
      this.onThrustEnd?.();
    }

    if (this.isThrusting) {
      // Calculate thrust direction (opposite of rotation)
      // Rocket points "up" at rotation = 0
      const thrustDirection: Vector2 = {
        x: Math.sin(this.rotation),
        y: -Math.cos(this.rotation),
      };

      // Apply thrust force
      const thrustForce = vec2Scale(
        thrustDirection,
        this.config.maxThrust * deltaTime
      );
      this.velocity = vec2Add(this.velocity, thrustForce);
    }
  }

  /**
   * Handle collision with terrain or objects.
   *
   * @param collision - Collision information
   */
  handleCollision(collision: CollisionInfo): void {
    if (!this.isAlive) {
      return;
    }

    switch (collision.type) {
      case CollisionType.LandingPad:
        this.handleLanding();
        break;

      case CollisionType.Terrain:
      case CollisionType.Hazard:
      case CollisionType.Enemy:
        this.crash();
        break;

      case CollisionType.None:
        break;
    }
  }

  /**
   * Attempt a landing.
   */
  private handleLanding(): void {
    const result = this.evaluateLanding();

    if (result.success) {
      this.hasLanded = true;
      this.velocity = vec2(0, 0);
      this.angularVelocity = 0;
      this.isThrusting = false;
      this.onLand?.(result);
    } else {
      this.crash();
    }
  }

  /**
   * Evaluate landing conditions.
   */
  private evaluateLanding(): LandingResult {
    const speed = vec2Magnitude(this.velocity);
    const angleDeg = Math.abs((this.rotation * 180) / Math.PI);

    const safeSpeed = speed <= this.config.safeLandingVelocity;
    const safeAngle = angleDeg <= this.config.safeLandingAngle;
    const success = safeSpeed && safeAngle;

    // Calculate quality and score multiplier
    let quality: LandingResult['quality'];
    let scoreMultiplier: number;

    if (!success) {
      quality = 'crash';
      scoreMultiplier = 0;
    } else if (speed < this.config.safeLandingVelocity * 0.3 && angleDeg < 5) {
      quality = 'perfect';
      scoreMultiplier = 3.0;
    } else if (speed < this.config.safeLandingVelocity * 0.6 && angleDeg < 10) {
      quality = 'good';
      scoreMultiplier = 2.0;
    } else {
      quality = 'rough';
      scoreMultiplier = 1.0;
    }

    return {
      success,
      velocity: speed,
      angle: angleDeg,
      scoreMultiplier,
      quality,
    };
  }

  /**
   * Crash the rocket.
   */
  crash(): void {
    if (!this.isAlive) {
      return;
    }

    this.isAlive = false;
    this.isThrusting = false;
    this.onCrash?.();
  }

  /**
   * Reset the rocket to initial state.
   *
   * @param position - Starting position
   * @param rotation - Starting rotation in radians (default: 0)
   */
  reset(position: Vector2, rotation = 0): void {
    this.position = { ...position };
    this.prevPosition = { ...position };
    this.velocity = vec2(0, 0);
    this.rotation = rotation;
    this.prevRotation = rotation;
    this.angularVelocity = 0;
    this.fuel = this.config.maxFuel;
    this.isThrusting = false;
    this.isAlive = true;
    this.hasLanded = false;
  }

  /**
   * Get the current rocket state.
   */
  getState(): RocketState {
    return {
      position: { ...this.position },
      velocity: { ...this.velocity },
      rotation: this.rotation,
      angularVelocity: this.angularVelocity,
      fuel: this.fuel,
      isThrusting: this.isThrusting,
      isAlive: this.isAlive,
      hasLanded: this.hasLanded,
    };
  }

  /**
   * Get interpolated state for rendering.
   *
   * @param alpha - Interpolation factor (0-1)
   * @returns Interpolated position and rotation
   */
  getInterpolatedState(alpha: number): { position: Vector2; rotation: number } {
    return {
      position: {
        x: this.prevPosition.x + (this.position.x - this.prevPosition.x) * alpha,
        y: this.prevPosition.y + (this.position.y - this.prevPosition.y) * alpha,
      },
      rotation:
        this.prevRotation + (this.rotation - this.prevRotation) * alpha,
    };
  }

  /**
   * Set the rocket position directly.
   */
  setPosition(x: number, y: number): void {
    this.position = vec2(x, y);
    this.prevPosition = vec2(x, y);
  }

  /**
   * Set the rocket velocity directly.
   */
  setVelocity(x: number, y: number): void {
    this.velocity = vec2(x, y);
  }

  /**
   * Set the rocket rotation directly.
   */
  setRotation(rotation: number): void {
    this.rotation = normalizeAngle(rotation);
    this.prevRotation = this.rotation;
  }

  /**
   * Add fuel to the rocket.
   */
  addFuel(amount: number): void {
    this.fuel = clamp(this.fuel + amount, 0, this.config.maxFuel);
  }

  /**
   * Get the current fuel level.
   */
  getFuel(): number {
    return this.fuel;
  }

  /**
   * Get the fuel percentage (0-1).
   */
  getFuelPercent(): number {
    return this.fuel / this.config.maxFuel;
  }

  /**
   * Check if the rocket is alive.
   */
  getIsAlive(): boolean {
    return this.isAlive;
  }

  /**
   * Check if the rocket has landed.
   */
  getHasLanded(): boolean {
    return this.hasLanded;
  }

  /**
   * Get the current configuration.
   */
  getConfig(): RocketConfig {
    return { ...this.config };
  }

  /**
   * Update configuration.
   */
  setConfig(config: Partial<RocketConfig>): void {
    this.config = { ...this.config, ...config };
  }

  // Event setters
  setOnCrash(callback: () => void): void {
    this.onCrash = callback;
  }

  setOnLand(callback: (result: LandingResult) => void): void {
    this.onLand = callback;
  }

  setOnThrustStart(callback: () => void): void {
    this.onThrustStart = callback;
  }

  setOnThrustEnd(callback: () => void): void {
    this.onThrustEnd = callback;
  }

  setOnFuelEmpty(callback: () => void): void {
    this.onFuelEmpty = callback;
  }
}
