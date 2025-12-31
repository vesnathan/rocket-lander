/**
 * @fileoverview Math utilities for physics calculations.
 * All operations are deterministic for consistent simulation.
 */

/**
 * 2D Vector representation.
 */
export interface Vector2 {
  x: number;
  y: number;
}

/**
 * Creates a new Vector2.
 *
 * @param x - X component (default: 0)
 * @param y - Y component (default: 0)
 * @returns New Vector2
 */
export function vec2(x = 0, y = 0): Vector2 {
  return { x, y };
}

/**
 * Adds two vectors.
 *
 * @param a - First vector
 * @param b - Second vector
 * @returns Sum vector
 */
export function vec2Add(a: Vector2, b: Vector2): Vector2 {
  return { x: a.x + b.x, y: a.y + b.y };
}

/**
 * Subtracts vector b from vector a.
 *
 * @param a - First vector
 * @param b - Second vector
 * @returns Difference vector
 */
export function vec2Sub(a: Vector2, b: Vector2): Vector2 {
  return { x: a.x - b.x, y: a.y - b.y };
}

/**
 * Multiplies a vector by a scalar.
 *
 * @param v - Vector to scale
 * @param scalar - Scalar value
 * @returns Scaled vector
 */
export function vec2Scale(v: Vector2, scalar: number): Vector2 {
  return { x: v.x * scalar, y: v.y * scalar };
}

/**
 * Calculates the magnitude (length) of a vector.
 *
 * @param v - Vector
 * @returns Magnitude
 */
export function vec2Magnitude(v: Vector2): number {
  return Math.sqrt(v.x * v.x + v.y * v.y);
}

/**
 * Normalizes a vector to unit length.
 *
 * @param v - Vector to normalize
 * @returns Normalized vector (zero vector if magnitude is 0)
 */
export function vec2Normalize(v: Vector2): Vector2 {
  const mag = vec2Magnitude(v);
  if (mag === 0) {
    return { x: 0, y: 0 };
  }
  return { x: v.x / mag, y: v.y / mag };
}

/**
 * Calculates the dot product of two vectors.
 *
 * @param a - First vector
 * @param b - Second vector
 * @returns Dot product
 */
export function vec2Dot(a: Vector2, b: Vector2): number {
  return a.x * b.x + a.y * b.y;
}

/**
 * Rotates a vector by an angle.
 *
 * @param v - Vector to rotate
 * @param angle - Angle in radians
 * @returns Rotated vector
 */
export function vec2Rotate(v: Vector2, angle: number): Vector2 {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return {
    x: v.x * cos - v.y * sin,
    y: v.x * sin + v.y * cos,
  };
}

/**
 * Linearly interpolates between two vectors.
 *
 * @param a - Start vector
 * @param b - End vector
 * @param t - Interpolation factor (0-1)
 * @returns Interpolated vector
 */
export function vec2Lerp(a: Vector2, b: Vector2, t: number): Vector2 {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
  };
}

/**
 * Clamps a value between min and max.
 *
 * @param value - Value to clamp
 * @param min - Minimum value
 * @param max - Maximum value
 * @returns Clamped value
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Linearly interpolates between two numbers.
 *
 * @param a - Start value
 * @param b - End value
 * @param t - Interpolation factor (0-1)
 * @returns Interpolated value
 */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Converts degrees to radians.
 *
 * @param degrees - Angle in degrees
 * @returns Angle in radians
 */
export function degToRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Converts radians to degrees.
 *
 * @param radians - Angle in radians
 * @returns Angle in degrees
 */
export function radToDeg(radians: number): number {
  return (radians * 180) / Math.PI;
}

/**
 * Normalizes an angle to the range [-PI, PI].
 *
 * @param angle - Angle in radians
 * @returns Normalized angle
 */
export function normalizeAngle(angle: number): number {
  while (angle > Math.PI) angle -= 2 * Math.PI;
  while (angle < -Math.PI) angle += 2 * Math.PI;
  return angle;
}

/**
 * Calculates the shortest angular difference between two angles.
 *
 * @param from - Start angle in radians
 * @param to - End angle in radians
 * @returns Shortest angular difference
 */
export function angleDifference(from: number, to: number): number {
  return normalizeAngle(to - from);
}

/**
 * Moves a value towards a target at a given speed.
 *
 * @param current - Current value
 * @param target - Target value
 * @param maxDelta - Maximum change per step
 * @returns New value moved towards target
 */
export function moveTowards(
  current: number,
  target: number,
  maxDelta: number
): number {
  const diff = target - current;
  if (Math.abs(diff) <= maxDelta) {
    return target;
  }
  return current + Math.sign(diff) * maxDelta;
}

/**
 * Applies exponential decay (smooth damping).
 *
 * @param current - Current value
 * @param target - Target value
 * @param decay - Decay rate (higher = faster decay)
 * @param deltaTime - Time step
 * @returns Decayed value
 */
export function expDecay(
  current: number,
  target: number,
  decay: number,
  deltaTime: number
): number {
  return target + (current - target) * Math.exp(-decay * deltaTime);
}
