/**
 * @fileoverview Abstract input provider interface.
 * Defines the contract that all input sources must implement.
 */

import type { InputState, InputConfig } from './InputState';

/**
 * Result of attempting to initialize an input provider.
 */
export interface InputInitResult {
  /** Whether initialization succeeded */
  success: boolean;
  /** Error message if initialization failed */
  error?: string;
  /** Whether permission was denied (relevant for sensors) */
  permissionDenied?: boolean;
}

/**
 * Abstract interface for input providers.
 * All input sources (tilt, keyboard, gamepad) implement this interface.
 */
export interface InputProvider {
  /**
   * Unique identifier for this input provider.
   */
  readonly id: string;

  /**
   * Human-readable name for this input provider.
   */
  readonly name: string;

  /**
   * Priority for input source selection.
   * Higher priority providers are preferred when multiple are available.
   */
  readonly priority: number;

  /**
   * Initialize the input provider.
   * May request permissions, set up event listeners, etc.
   *
   * @returns Promise resolving to initialization result
   */
  initialize(): Promise<InputInitResult>;

  /**
   * Shutdown the input provider.
   * Clean up event listeners, release resources.
   */
  shutdown(): void;

  /**
   * Update the input provider state.
   * Called once per frame.
   *
   * @param deltaTime - Time since last update in seconds
   */
  update(deltaTime: number): void;

  /**
   * Get the current input state from this provider.
   *
   * @returns Current normalized input state
   */
  getState(): InputState;

  /**
   * Check if this input provider is currently available.
   *
   * @returns True if provider can provide input
   */
  isAvailable(): boolean;

  /**
   * Check if this input provider is supported on the current platform.
   *
   * @returns True if provider can potentially be used
   */
  isSupported(): boolean;

  /**
   * Apply configuration to this provider.
   *
   * @param config - Configuration to apply
   */
  setConfig(config: Partial<InputConfig>): void;

  /**
   * Get the current configuration.
   *
   * @returns Current configuration
   */
  getConfig(): InputConfig;
}

/**
 * Abstract base class providing common functionality for input providers.
 */
export abstract class BaseInputProvider implements InputProvider {
  abstract readonly id: string;
  abstract readonly name: string;
  abstract readonly priority: number;

  protected config: InputConfig;
  protected state: InputState;
  protected initialized = false;

  /**
   * Creates a new BaseInputProvider.
   *
   * @param defaultConfig - Default configuration for this provider
   */
  constructor(defaultConfig: InputConfig) {
    this.config = { ...defaultConfig };
    this.state = {
      roll: 0,
      rawRoll: 0,
      thrust: false,
      isAvailable: false,
      timestamp: 0,
    };
  }

  abstract initialize(): Promise<InputInitResult>;
  abstract shutdown(): void;
  abstract update(deltaTime: number): void;
  abstract isSupported(): boolean;

  getState(): InputState {
    return { ...this.state };
  }

  isAvailable(): boolean {
    return this.initialized && this.state.isAvailable;
  }

  setConfig(config: Partial<InputConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): InputConfig {
    return { ...this.config };
  }
}
