/**
 * @fileoverview Mobile device tilt input provider.
 * Uses DeviceOrientation API to detect device tilt for roll control.
 * Implements low-pass filtering to smooth noisy sensor data.
 */

import {
  BaseInputProvider,
  type InputInitResult,
} from './InputProvider';
import {
  clampNormalized,
  applyDeadzone,
  DEFAULT_INPUT_CONFIG,
  type InputConfig,
} from './InputState';

/**
 * Device orientation event data interface.
 * Normalizes browser-specific implementations.
 */
interface OrientationData {
  /** Rotation around z-axis (compass direction) */
  alpha: number | null;
  /** Rotation around x-axis (front-back tilt) */
  beta: number | null;
  /** Rotation around y-axis (left-right tilt) - used for roll */
  gamma: number | null;
}

/**
 * Low-pass filter coefficient for smoothing sensor data.
 * Higher value = more smoothing but more lag.
 */
const DEFAULT_SMOOTHING = 0.3;

/**
 * Mobile tilt input provider using DeviceOrientation API.
 *
 * Features:
 * - Low-pass filtering for smooth control
 * - Automatic permission handling
 * - Graceful fallback when unavailable
 *
 * @example
 * ```typescript
 * const tiltInput = new MobileTiltInput();
 * const result = await tiltInput.initialize();
 * if (result.success) {
 *   // Use tiltInput.getState() for roll values
 * }
 * ```
 */
export class MobileTiltInput extends BaseInputProvider {
  readonly id = 'mobile-tilt';
  readonly name = 'Mobile Tilt';
  readonly priority = 100; // High priority - preferred on mobile

  private smoothedGamma = 0;
  private lastGamma = 0;
  private boundHandler: ((event: DeviceOrientationEvent) => void) | null = null;
  private permissionGranted = false;

  constructor(config: Partial<InputConfig> = {}) {
    super({ ...DEFAULT_INPUT_CONFIG, ...config });
  }

  /**
   * Checks if DeviceOrientation API is supported.
   */
  isSupported(): boolean {
    return typeof window !== 'undefined' && 'DeviceOrientationEvent' in window;
  }

  /**
   * Initialize the tilt input provider.
   * Requests permission on iOS 13+ devices.
   */
  async initialize(): Promise<InputInitResult> {
    if (!this.isSupported()) {
      return {
        success: false,
        error: 'DeviceOrientation API not supported',
      };
    }

    // Check if permission is required (iOS 13+)
    if (this.requiresPermission()) {
      try {
        const result = await this.requestPermission();
        if (!result) {
          return {
            success: false,
            error: 'Permission denied',
            permissionDenied: true,
          };
        }
      } catch (err) {
        return {
          success: false,
          error: `Permission request failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
          permissionDenied: true,
        };
      }
    }

    // Set up event listener
    this.boundHandler = this.handleOrientation.bind(this);
    window.addEventListener('deviceorientation', this.boundHandler);

    this.initialized = true;
    this.state.isAvailable = true;
    this.permissionGranted = true;

    return { success: true };
  }

  /**
   * Check if explicit permission request is required.
   * iOS 13+ requires user gesture to request permission.
   */
  private requiresPermission(): boolean {
    // DeviceOrientationEvent.requestPermission is iOS 13+ specific
    const DOEvent = DeviceOrientationEvent as unknown as {
      requestPermission?: () => Promise<string>;
    };
    return typeof DOEvent.requestPermission === 'function';
  }

  /**
   * Request permission for device orientation on iOS 13+.
   */
  private async requestPermission(): Promise<boolean> {
    const DOEvent = DeviceOrientationEvent as unknown as {
      requestPermission: () => Promise<string>;
    };

    try {
      const permission = await DOEvent.requestPermission();
      return permission === 'granted';
    } catch {
      return false;
    }
  }

  /**
   * Handle device orientation event.
   */
  private handleOrientation(event: DeviceOrientationEvent): void {
    const data: OrientationData = {
      alpha: event.alpha,
      beta: event.beta,
      gamma: event.gamma,
    };

    // gamma is left-right tilt, range -90 to 90
    if (data.gamma !== null) {
      this.lastGamma = data.gamma;
    }
  }

  /**
   * Update the input state with filtered sensor data.
   */
  update(deltaTime: number): void {
    if (!this.initialized || !this.permissionGranted) {
      return;
    }

    // Store raw value
    const rawRoll = this.normalizeGamma(this.lastGamma);
    this.state.rawRoll = rawRoll;

    // Apply low-pass filter for smoothing
    // Formula: smoothed = smoothed + alpha * (new - smoothed)
    const smoothingFactor = Math.min(
      1,
      this.config.rollSmoothing * deltaTime * 60
    );
    this.smoothedGamma += smoothingFactor * (rawRoll - this.smoothedGamma);

    // Apply deadzone and inversion
    let roll = applyDeadzone(this.smoothedGamma, this.config.rollDeadzone);
    if (this.config.invertRoll) {
      roll = -roll;
    }

    this.state.roll = clampNormalized(roll);
    this.state.timestamp = performance.now();
  }

  /**
   * Convert gamma angle to normalized roll value.
   *
   * @param gamma - Gamma angle in degrees (-90 to 90)
   * @returns Normalized roll value (-1 to 1)
   */
  private normalizeGamma(gamma: number): number {
    // Map maxTiltAngle degrees to full roll
    const maxAngle = this.config.maxTiltAngle;
    return clampNormalized(gamma / maxAngle);
  }

  /**
   * Shutdown the tilt input provider.
   */
  shutdown(): void {
    if (this.boundHandler) {
      window.removeEventListener('deviceorientation', this.boundHandler);
      this.boundHandler = null;
    }
    this.initialized = false;
    this.state.isAvailable = false;
    this.smoothedGamma = 0;
  }

  /**
   * Check if permission was granted.
   */
  hasPermission(): boolean {
    return this.permissionGranted;
  }
}

/**
 * Creates a button handler for mobile thrust input.
 * This is a pure UI component - no Phaser dependency.
 *
 * @returns Object with methods to control thrust state
 */
export function createThrustButtonHandler() {
  let isPressed = false;

  return {
    /**
     * Call when button is pressed.
     */
    onPress(): void {
      isPressed = true;
    },

    /**
     * Call when button is released.
     */
    onRelease(): void {
      isPressed = false;
    },

    /**
     * Get current thrust state.
     */
    isThrusting(): boolean {
      return isPressed;
    },

    /**
     * Reset thrust state.
     */
    reset(): void {
      isPressed = false;
    },
  };
}
