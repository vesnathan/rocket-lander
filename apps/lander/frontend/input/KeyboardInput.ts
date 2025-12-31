/**
 * @fileoverview Keyboard input provider for desktop fallback.
 * Provides roll control via A/D or arrow keys and thrust via Space.
 */

import {
  BaseInputProvider,
  type InputInitResult,
} from './InputProvider';
import {
  clampNormalized,
  DEFAULT_INPUT_CONFIG,
  type InputConfig,
} from './InputState';

/**
 * Key bindings configuration.
 */
interface KeyBindings {
  /** Keys for rolling left */
  rollLeft: string[];
  /** Keys for rolling right */
  rollRight: string[];
  /** Keys for thrust */
  thrust: string[];
}

/**
 * Default key bindings.
 */
const DEFAULT_BINDINGS: KeyBindings = {
  rollLeft: ['KeyA', 'ArrowLeft'],
  rollRight: ['KeyD', 'ArrowRight'],
  thrust: ['Space'],
};

/**
 * Smoothing speed for keyboard input.
 * Controls how quickly roll accelerates/decelerates.
 */
const ROLL_ACCELERATION = 5.0;

/**
 * Keyboard input provider for desktop control.
 *
 * Features:
 * - A/D and Arrow key support for roll
 * - Space bar for thrust
 * - Smooth input ramping (not instant)
 * - Customizable key bindings
 *
 * @example
 * ```typescript
 * const keyboard = new KeyboardInput();
 * await keyboard.initialize();
 *
 * // In game loop
 * keyboard.update(deltaTime);
 * const state = keyboard.getState();
 * ```
 */
export class KeyboardInput extends BaseInputProvider {
  readonly id = 'keyboard';
  readonly name = 'Keyboard';
  readonly priority = 50; // Lower priority than tilt on mobile

  private bindings: KeyBindings;
  private pressedKeys = new Set<string>();
  private targetRoll = 0;
  private currentRoll = 0;

  private boundKeyDownHandler: ((e: KeyboardEvent) => void) | null = null;
  private boundKeyUpHandler: ((e: KeyboardEvent) => void) | null = null;

  constructor(config: Partial<InputConfig> = {}, bindings: Partial<KeyBindings> = {}) {
    super({ ...DEFAULT_INPUT_CONFIG, ...config });
    this.bindings = { ...DEFAULT_BINDINGS, ...bindings };
  }

  /**
   * Check if keyboard input is supported.
   */
  isSupported(): boolean {
    return typeof window !== 'undefined' && 'KeyboardEvent' in window;
  }

  /**
   * Initialize the keyboard input provider.
   */
  async initialize(): Promise<InputInitResult> {
    if (!this.isSupported()) {
      return {
        success: false,
        error: 'Keyboard input not supported',
      };
    }

    // Set up event listeners
    this.boundKeyDownHandler = this.handleKeyDown.bind(this);
    this.boundKeyUpHandler = this.handleKeyUp.bind(this);

    window.addEventListener('keydown', this.boundKeyDownHandler);
    window.addEventListener('keyup', this.boundKeyUpHandler);

    this.initialized = true;
    this.state.isAvailable = true;

    return { success: true };
  }

  /**
   * Handle key down event.
   */
  private handleKeyDown(event: KeyboardEvent): void {
    // Prevent default for game keys to avoid scrolling
    if (this.isGameKey(event.code)) {
      event.preventDefault();
    }
    this.pressedKeys.add(event.code);
  }

  /**
   * Handle key up event.
   */
  private handleKeyUp(event: KeyboardEvent): void {
    this.pressedKeys.delete(event.code);
  }

  /**
   * Check if a key code is bound to a game action.
   */
  private isGameKey(code: string): boolean {
    return (
      this.bindings.rollLeft.includes(code) ||
      this.bindings.rollRight.includes(code) ||
      this.bindings.thrust.includes(code)
    );
  }

  /**
   * Check if any key in a binding list is pressed.
   */
  private isBindingPressed(keys: string[]): boolean {
    return keys.some((key) => this.pressedKeys.has(key));
  }

  /**
   * Update the input state.
   */
  update(deltaTime: number): void {
    if (!this.initialized) {
      return;
    }

    // Calculate target roll from key presses
    const leftPressed = this.isBindingPressed(this.bindings.rollLeft);
    const rightPressed = this.isBindingPressed(this.bindings.rollRight);

    if (leftPressed && !rightPressed) {
      this.targetRoll = -1;
    } else if (rightPressed && !leftPressed) {
      this.targetRoll = 1;
    } else {
      this.targetRoll = 0;
    }

    // Smooth roll towards target
    const rollDiff = this.targetRoll - this.currentRoll;
    const maxChange = ROLL_ACCELERATION * deltaTime;

    if (Math.abs(rollDiff) <= maxChange) {
      this.currentRoll = this.targetRoll;
    } else {
      this.currentRoll += Math.sign(rollDiff) * maxChange;
    }

    // Apply inversion if configured
    let roll = this.currentRoll;
    if (this.config.invertRoll) {
      roll = -roll;
    }

    // Update state
    this.state.roll = clampNormalized(roll);
    this.state.rawRoll = this.targetRoll; // Raw is the unsmoothed target
    this.state.thrust = this.isBindingPressed(this.bindings.thrust);
    this.state.timestamp = performance.now();
  }

  /**
   * Shutdown the keyboard input provider.
   */
  shutdown(): void {
    if (this.boundKeyDownHandler) {
      window.removeEventListener('keydown', this.boundKeyDownHandler);
      this.boundKeyDownHandler = null;
    }
    if (this.boundKeyUpHandler) {
      window.removeEventListener('keyup', this.boundKeyUpHandler);
      this.boundKeyUpHandler = null;
    }

    this.pressedKeys.clear();
    this.initialized = false;
    this.state.isAvailable = false;
  }

  /**
   * Update key bindings.
   */
  setBindings(bindings: Partial<KeyBindings>): void {
    this.bindings = { ...this.bindings, ...bindings };
  }

  /**
   * Get current key bindings.
   */
  getBindings(): KeyBindings {
    return { ...this.bindings };
  }

  /**
   * Check if a specific key is currently pressed.
   */
  isKeyPressed(code: string): boolean {
    return this.pressedKeys.has(code);
  }
}
