/**
 * @fileoverview Core module exports.
 * Provides engine-agnostic game logic.
 */

export type { Vector2 } from './math';
export {
  vec2,
  vec2Add,
  vec2Sub,
  vec2Scale,
  vec2Magnitude,
  vec2Normalize,
  vec2Dot,
  vec2Rotate,
  vec2Lerp,
  clamp,
  lerp,
  degToRad,
  radToDeg,
  normalizeAngle,
  angleDifference,
  moveTowards,
  expDecay,
} from './math';

export type {
  RocketConfig,
  RocketState,
  LandingResult,
  CollisionInfo,
} from './RocketController';
export {
  RocketController,
  DEFAULT_ROCKET_CONFIG,
  CollisionType,
} from './RocketController';
