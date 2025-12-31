/**
 * @fileoverview Central input management system.
 * Coordinates multiple input providers and presents a unified input state.
 */

import type { InputProvider } from './InputProvider';
import type { InputState, InputConfig } from './InputState';
import { createDefaultInputState, DEFAULT_INPUT_CONFIG } from './InputState';
import { MobileTiltInput, createThrustButtonHandler } from './MobileTiltInput';
import { KeyboardInput } from './KeyboardInput';

/**
 * Input source priority modes.
 */
export enum InputPriorityMode {
  /** Use highest priority available provider */
  Highest = 'highest',
  /** Use most recently active provider */
  MostRecent = 'mostRecent',
  /** Combine inputs from all providers */
  Combined = 'combined',
}

/**
 * Configuration for the InputManager.
 */
export interface InputManagerConfig {
  /** How to select between multiple input sources */
  priorityMode: InputPriorityMode;
  /** Whether to auto-initialize providers */
  autoInit: boolean;
  /** Input configuration shared across providers */
  inputConfig: InputConfig;
}

/**
 * Default InputManager configuration.
 */
const DEFAULT_MANAGER_CONFIG: InputManagerConfig = {
  priorityMode: InputPriorityMode.MostRecent,
  autoInit: true,
  inputConfig: DEFAULT_INPUT_CONFIG,
};

/**
 * Central input manager that coordinates multiple input sources.
 *
 * Features:
 * - Automatic provider detection and initialization
 * - Priority-based input source selection
 * - Unified input state for game consumption
 * - Mobile thrust button integration
 *
 * @example
 * ```typescript
 * const inputManager = new InputManager();
 * await inputManager.initialize();
 *
 * // In game loop
 * inputManager.update(deltaTime);
 * const input = inputManager.getState();
 *
 * // Apply to rocket
 * rocket.setRoll(input.roll);
 * rocket.setThrust(input.thrust);
 * ```
 */
export class InputManager {
  private providers: InputProvider[] = [];
  private activeProvider: InputProvider | null = null;
  private state: InputState;
  private config: InputManagerConfig;
  private thrustButton: ReturnType<typeof createThrustButtonHandler>;
  private initialized = false;
  private lastInputTimestamp = 0;

  constructor(config: Partial<InputManagerConfig> = {}) {
    this.config = { ...DEFAULT_MANAGER_CONFIG, ...config };
    this.state = createDefaultInputState();
    this.thrustButton = createThrustButtonHandler();
  }

  /**
   * Initialize the input manager and all supported providers.
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    // Create providers
    const tilt = new MobileTiltInput(this.config.inputConfig);
    const keyboard = new KeyboardInput(this.config.inputConfig);

    // Try to initialize each provider
    const providers: InputProvider[] = [tilt, keyboard];

    for (const provider of providers) {
      if (provider.isSupported()) {
        const result = await provider.initialize();
        if (result.success) {
          this.providers.push(provider);
        }
      }
    }

    // Sort by priority (highest first)
    this.providers.sort((a, b) => b.priority - a.priority);

    // Select initial active provider
    this.selectActiveProvider();

    this.initialized = true;
  }

  /**
   * Shutdown the input manager and all providers.
   */
  shutdown(): void {
    for (const provider of this.providers) {
      provider.shutdown();
    }
    this.providers = [];
    this.activeProvider = null;
    this.initialized = false;
  }

  /**
   * Update all providers and compute unified state.
   *
   * @param deltaTime - Time since last update in seconds
   */
  update(deltaTime: number): void {
    if (!this.initialized) {
      return;
    }

    // Update all providers
    for (const provider of this.providers) {
      provider.update(deltaTime);
    }

    // Select active provider based on mode
    this.selectActiveProvider();

    // Get state from active provider
    if (this.activeProvider) {
      const providerState = this.activeProvider.getState();

      this.state.roll = providerState.roll;
      this.state.rawRoll = providerState.rawRoll;
      this.state.isAvailable = true;
      this.state.timestamp = performance.now();

      // For thrust, combine keyboard thrust with mobile button
      // Keyboard provider handles its own thrust; mobile needs button
      if (this.activeProvider.id === 'mobile-tilt') {
        this.state.thrust = this.thrustButton.isThrusting();
      } else {
        this.state.thrust = providerState.thrust;
      }
    } else {
      this.state.isAvailable = false;
    }
  }

  /**
   * Select the active input provider based on priority mode.
   */
  private selectActiveProvider(): void {
    const availableProviders = this.providers.filter((p) => p.isAvailable());

    if (availableProviders.length === 0) {
      this.activeProvider = null;
      return;
    }

    switch (this.config.priorityMode) {
      case InputPriorityMode.Highest:
        // Already sorted by priority
        this.activeProvider = availableProviders[0] ?? null;
        break;

      case InputPriorityMode.MostRecent: {
        // Find provider with most recent input
        const firstProvider = availableProviders[0];
        if (!firstProvider) break;
        let mostRecent: InputProvider = firstProvider;
        let mostRecentTime = 0;

        for (const provider of availableProviders) {
          const state = provider.getState();
          // Consider input "active" if roll is non-zero or thrust is on
          if (Math.abs(state.roll) > 0.1 || state.thrust) {
            if (state.timestamp > mostRecentTime) {
              mostRecent = provider;
              mostRecentTime = state.timestamp;
            }
          }
        }

        // Only switch if we have recent input from a different provider
        if (
          mostRecentTime > this.lastInputTimestamp &&
          mostRecent !== this.activeProvider
        ) {
          this.activeProvider = mostRecent;
          this.lastInputTimestamp = mostRecentTime;
        } else if (!this.activeProvider) {
          this.activeProvider = firstProvider;
        }
        break;
      }

      case InputPriorityMode.Combined:
        // Use highest priority but combine thrust from all
        this.activeProvider = availableProviders[0] ?? null;
        break;
    }
  }

  /**
   * Get the current unified input state.
   */
  getState(): InputState {
    return { ...this.state };
  }

  /**
   * Get the currently active provider.
   */
  getActiveProvider(): InputProvider | null {
    return this.activeProvider;
  }

  /**
   * Get all registered providers.
   */
  getProviders(): readonly InputProvider[] {
    return this.providers;
  }

  /**
   * Get the thrust button handler for mobile UI integration.
   * Call onPress/onRelease from your UI button.
   */
  getThrustButton(): ReturnType<typeof createThrustButtonHandler> {
    return this.thrustButton;
  }

  /**
   * Update configuration for all providers.
   */
  setInputConfig(config: Partial<InputConfig>): void {
    this.config.inputConfig = { ...this.config.inputConfig, ...config };
    for (const provider of this.providers) {
      provider.setConfig(this.config.inputConfig);
    }
  }

  /**
   * Set the priority mode.
   */
  setPriorityMode(mode: InputPriorityMode): void {
    this.config.priorityMode = mode;
  }

  /**
   * Check if input manager is initialized.
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Check if any input provider is available.
   */
  hasInput(): boolean {
    return this.activeProvider !== null && this.state.isAvailable;
  }

  /**
   * Check if device has tilt capability.
   */
  hasTilt(): boolean {
    return this.providers.some(
      (p) => p.id === 'mobile-tilt' && p.isAvailable()
    );
  }

  /**
   * Check if keyboard is available.
   */
  hasKeyboard(): boolean {
    return this.providers.some((p) => p.id === 'keyboard' && p.isAvailable());
  }
}

/**
 * Singleton instance of InputManager for convenience.
 */
let globalInputManager: InputManager | null = null;

/**
 * Get or create the global InputManager instance.
 */
export function getInputManager(): InputManager {
  if (!globalInputManager) {
    globalInputManager = new InputManager();
  }
  return globalInputManager;
}

/**
 * Destroy the global InputManager instance.
 */
export function destroyInputManager(): void {
  if (globalInputManager) {
    globalInputManager.shutdown();
    globalInputManager = null;
  }
}
