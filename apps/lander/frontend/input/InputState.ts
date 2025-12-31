/**
 * @fileoverview Input state types and interfaces.
 * Defines the normalized input representation used across all input sources.
 */

/**
 * Represents the current normalized input state.
 * This interface is engine-agnostic and consumed by game logic.
 */
export interface InputState {
  /**
   * Roll input from -1 (full left) to 1 (full right).
   * 0 represents no roll input.
   */
  roll: number;

  /**
   * Whether thrust is currently active.
   */
  thrust: boolean;

  /**
   * Raw unfiltered roll value (before smoothing).
   * Useful for debugging sensor noise.
   */
  rawRoll: number;

  /**
   * Whether input is currently available/connected.
   */
  isAvailable: boolean;

  /**
   * Timestamp of the last input update in milliseconds.
   */
  timestamp: number;
}

/**
 * Creates a default input state with all values zeroed.
 *
 * @returns A fresh InputState with default values
 */
export function createDefaultInputState(): InputState {
  return {
    roll: 0,
    rawRoll: 0,
    thrust: false,
    isAvailable: true,
    timestamp: 0,
  };
}

/**
 * Clamps a value between -1 and 1.
 *
 * @param value - Value to clamp
 * @returns Clamped value
 */
export function clampNormalized(value: number): number {
  return Math.max(-1, Math.min(1, value));
}

/**
 * Applies a deadzone to a normalized input value.
 * Values within the deadzone are mapped to 0.
 *
 * @param value - Normalized input value (-1 to 1)
 * @param deadzone - Deadzone threshold (0 to 1)
 * @returns Value with deadzone applied
 */
export function applyDeadzone(value: number, deadzone: number): number {
  const absValue = Math.abs(value);
  if (absValue < deadzone) {
    return 0;
  }
  // Rescale remaining range to 0-1
  const sign = value > 0 ? 1 : -1;
  return sign * ((absValue - deadzone) / (1 - deadzone));
}

/**
 * Input configuration options.
 */
export interface InputConfig {
  /** Deadzone for roll input (0-1), default: 0.1 */
  rollDeadzone: number;

  /** Smoothing factor for roll input (0-1), higher = smoother but more lag */
  rollSmoothing: number;

  /** Maximum tilt angle in degrees for full roll input */
  maxTiltAngle: number;

  /** Whether to invert roll direction */
  invertRoll: boolean;
}

/**
 * Default input configuration.
 */
export const DEFAULT_INPUT_CONFIG: InputConfig = {
  rollDeadzone: 0.1,
  rollSmoothing: 0.3,
  maxTiltAngle: 30,
  invertRoll: false,
};
