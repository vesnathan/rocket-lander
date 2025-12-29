/**
 * @fileoverview Nuclear Ice Drill item implementation.
 * Destroys ice layers to reveal hidden paths or landing pads.
 */

import {
  BaseItem,
  createItemId,
  type ItemType,
  type ItemRarity,
  type ItemUseContext,
} from './Item';

/**
 * Detection range for ice layers when using the drill.
 */
const ICE_DETECTION_RANGE = 80;

/**
 * Nuclear Ice Drill item.
 *
 * This powerful tool instantly destroys ice layers within range,
 * potentially revealing hidden landing pads or shortcuts.
 *
 * @example
 * ```typescript
 * const drill = new NuclearIceDrill();
 * inventory.addItem(drill);
 *
 * // Later, when near ice
 * inventory.useItem(0, {
 *   scene,
 *   rocketPosition: { x: 100, y: 400 },
 *   drillIce: (x, y) => {
 *     // Destroy ice at position
 *     return true;
 *   },
 * });
 * ```
 */
export class NuclearIceDrill extends BaseItem {
  readonly id: string;
  readonly type: ItemType = 'nuclearIceDrill';
  readonly name = 'Nuclear Ice Drill';
  readonly description = 'Instantly destroys nearby ice layers. Single use.';
  readonly rarity: ItemRarity = 'legendary';
  readonly consumable = true;
  readonly iconKey = 'item-drill';

  /** Detection range for ice */
  readonly detectionRange: number;

  constructor(detectionRange = ICE_DETECTION_RANGE) {
    super();
    this.id = createItemId('nuclearIceDrill');
    this.detectionRange = detectionRange;
  }

  /**
   * Check if the drill can be used.
   * Requires the drillIce callback in context.
   */
  canUse(context: ItemUseContext): boolean {
    return context.drillIce !== undefined;
  }

  /**
   * Use the drill to destroy nearby ice.
   */
  use(context: ItemUseContext): boolean {
    if (!context.drillIce) {
      return false;
    }

    const { x, y } = context.rocketPosition;
    const success = context.drillIce(x, y);

    if (success) {
      // Play drill effect
      this.playDrillEffect(context);
    }

    return success;
  }

  /**
   * Play visual effect when drill is used.
   */
  private playDrillEffect(context: ItemUseContext): void {
    const { scene, rocketPosition } = context;

    // Create expanding circle effect
    const circle = scene.add.circle(
      rocketPosition.x,
      rocketPosition.y,
      10,
      0x00ffff,
      0.8
    );

    // Animate expansion
    scene.tweens.add({
      targets: circle,
      radius: this.detectionRange,
      alpha: 0,
      duration: 500,
      ease: 'Power2',
      onComplete: () => {
        circle.destroy();
      },
    });

    // Screen shake for impact
    scene.cameras.main.shake(200, 0.01);
  }
}

/**
 * Fuel Boost item.
 * Instantly restores a portion of fuel.
 */
export class FuelBoost extends BaseItem {
  readonly id: string;
  readonly type: ItemType = 'fuelBoost';
  readonly name = 'Emergency Fuel';
  readonly description = 'Restores 30% of maximum fuel. Single use.';
  readonly rarity: ItemRarity = 'common';
  readonly consumable = true;
  readonly iconKey = 'item-fuel';

  /** Amount of fuel to restore as percentage of max */
  readonly fuelPercent: number;

  constructor(fuelPercent = 0.3) {
    super();
    this.id = createItemId('fuelBoost');
    this.fuelPercent = fuelPercent;
  }

  canUse(context: ItemUseContext): boolean {
    // Can't use if already at max fuel
    return context.currentFuel < context.maxFuel;
  }

  use(context: ItemUseContext): boolean {
    const fuelToAdd = context.maxFuel * this.fuelPercent;
    context.addFuel(fuelToAdd);

    // Play refuel effect
    this.playRefuelEffect(context);

    return true;
  }

  private playRefuelEffect(context: ItemUseContext): void {
    const { scene, rocketPosition } = context;

    // Create fuel particles rising up
    const particles = scene.add.particles(
      rocketPosition.x,
      rocketPosition.y,
      'particle', // Will fallback if texture doesn't exist
      {
        speed: { min: 50, max: 100 },
        angle: { min: 250, max: 290 },
        lifespan: 500,
        quantity: 10,
        tint: 0x00ff00,
        scale: { start: 0.5, end: 0 },
      }
    );

    scene.time.delayedCall(500, () => {
      particles.destroy();
    });
  }
}

/**
 * Shield item.
 * Provides temporary invulnerability.
 */
export class Shield extends BaseItem {
  readonly id: string;
  readonly type: ItemType = 'shield';
  readonly name = 'Energy Shield';
  readonly description = 'Grants 3 seconds of invulnerability. Single use.';
  readonly rarity: ItemRarity = 'rare';
  readonly consumable = true;
  readonly iconKey = 'item-shield';

  /** Duration of shield in milliseconds */
  readonly duration: number;

  constructor(duration = 3000) {
    super();
    this.id = createItemId('shield');
    this.duration = duration;
  }

  canUse(context: ItemUseContext): boolean {
    return context.activateShield !== undefined;
  }

  use(context: ItemUseContext): boolean {
    if (!context.activateShield) {
      return false;
    }

    context.activateShield(this.duration);
    return true;
  }
}

/**
 * Slow Motion item.
 * Slows down time briefly for precise maneuvering.
 */
export class SlowMotion extends BaseItem {
  readonly id: string;
  readonly type: ItemType = 'slowMotion';
  readonly name = 'Time Dilator';
  readonly description = 'Slows time to 50% for 5 seconds. Single use.';
  readonly rarity: ItemRarity = 'rare';
  readonly consumable = true;
  readonly iconKey = 'item-clock';

  /** Time scale factor (0.5 = half speed) */
  readonly timeFactor: number;

  /** Duration in milliseconds */
  readonly duration: number;

  constructor(timeFactor = 0.5, duration = 5000) {
    super();
    this.id = createItemId('slowMotion');
    this.timeFactor = timeFactor;
    this.duration = duration;
  }

  canUse(context: ItemUseContext): boolean {
    return context.applySlowMotion !== undefined;
  }

  use(context: ItemUseContext): boolean {
    if (!context.applySlowMotion) {
      return false;
    }

    context.applySlowMotion(this.timeFactor, this.duration);
    return true;
  }
}

/**
 * Factory function to create items by type.
 */
export function createItem(type: ItemType): BaseItem {
  switch (type) {
    case 'nuclearIceDrill':
      return new NuclearIceDrill();
    case 'fuelBoost':
      return new FuelBoost();
    case 'shield':
      return new Shield();
    case 'slowMotion':
      return new SlowMotion();
    default:
      throw new Error(`Unknown item type: ${type}`);
  }
}
