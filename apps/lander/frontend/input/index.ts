/**
 * @fileoverview Input system exports.
 * Provides all input-related types and classes.
 */

export type { InputState, InputConfig } from './InputState';
export {
  createDefaultInputState,
  clampNormalized,
  applyDeadzone,
  DEFAULT_INPUT_CONFIG,
} from './InputState';

export type { InputProvider, InputInitResult } from './InputProvider';
export { BaseInputProvider } from './InputProvider';

export { MobileTiltInput, createThrustButtonHandler } from './MobileTiltInput';
export { KeyboardInput } from './KeyboardInput';

export type { InputManagerConfig } from './InputManager';
export {
  InputManager,
  InputPriorityMode,
  getInputManager,
  destroyInputManager,
} from './InputManager';
