/**
 * @fileoverview Base item system definitions.
 * Defines the item interface and inventory management.
 */

import * as Phaser from 'phaser';

/**
 * Item types available in the game.
 */
export type ItemType =
  | 'nuclearIceDrill'
  | 'fuelBoost'
  | 'shield'
  | 'slowMotion';

/**
 * Item rarity levels.
 */
export type ItemRarity = 'common' | 'rare' | 'legendary';

/**
 * Base interface for all items.
 */
export interface Item {
  /** Unique identifier for this item instance */
  id: string;
  /** Item type */
  type: ItemType;
  /** Display name */
  name: string;
  /** Description of what the item does */
  description: string;
  /** Rarity level */
  rarity: ItemRarity;
  /** Whether the item is single-use */
  consumable: boolean;
  /** Icon texture key */
  iconKey: string;
  /** Use the item. Returns true if successfully used. */
  use(context: ItemUseContext): boolean;
  /** Check if item can be used in current context */
  canUse(context: ItemUseContext): boolean;
}

/**
 * Context provided when using an item.
 */
export interface ItemUseContext {
  /** Reference to the scene */
  scene: Phaser.Scene;
  /** Player rocket position */
  rocketPosition: { x: number; y: number };
  /** Current fuel level */
  currentFuel: number;
  /** Maximum fuel */
  maxFuel: number;
  /** Callback to add fuel */
  addFuel: (amount: number) => void;
  /** Callback to activate shield */
  activateShield?: (duration: number) => void;
  /** Callback to drill ice at position */
  drillIce?: (x: number, y: number) => boolean;
  /** Callback to apply slow motion */
  applySlowMotion?: (factor: number, duration: number) => void;
}

/**
 * Abstract base class for items.
 */
export abstract class BaseItem implements Item {
  abstract readonly id: string;
  abstract readonly type: ItemType;
  abstract readonly name: string;
  abstract readonly description: string;
  abstract readonly rarity: ItemRarity;
  abstract readonly consumable: boolean;
  abstract readonly iconKey: string;

  abstract use(context: ItemUseContext): boolean;
  abstract canUse(context: ItemUseContext): boolean;
}

/**
 * Maximum inventory slots.
 */
export const MAX_INVENTORY_SLOTS = 2;

/**
 * Player inventory for holding items.
 */
export class Inventory {
  /** Items in inventory */
  private items: Array<Item | null>;

  /** Event emitter for inventory changes */
  readonly events: Phaser.Events.EventEmitter;

  constructor() {
    this.items = new Array(MAX_INVENTORY_SLOTS).fill(null);
    this.events = new Phaser.Events.EventEmitter();
  }

  /**
   * Add an item to the inventory.
   *
   * @param item - Item to add
   * @returns True if item was added, false if inventory is full
   */
  addItem(item: Item): boolean {
    const emptySlot = this.items.findIndex((slot) => slot === null);

    if (emptySlot === -1) {
      this.events.emit('inventoryFull', item);
      return false;
    }

    this.items[emptySlot] = item;
    this.events.emit('itemAdded', item, emptySlot);
    return true;
  }

  /**
   * Remove an item from inventory.
   *
   * @param slotIndex - Slot to remove from
   * @returns The removed item, or null if slot was empty
   */
  removeItem(slotIndex: number): Item | null {
    if (slotIndex < 0 || slotIndex >= MAX_INVENTORY_SLOTS) {
      return null;
    }

    const item = this.items[slotIndex];
    this.items[slotIndex] = null;

    if (item) {
      this.events.emit('itemRemoved', item, slotIndex);
    }

    return item;
  }

  /**
   * Use an item from inventory.
   *
   * @param slotIndex - Slot of item to use
   * @param context - Context for item use
   * @returns True if item was used successfully
   */
  useItem(slotIndex: number, context: ItemUseContext): boolean {
    const item = this.items[slotIndex];

    if (!item) {
      return false;
    }

    if (!item.canUse(context)) {
      this.events.emit('itemCannotUse', item, slotIndex);
      return false;
    }

    const used = item.use(context);

    if (used) {
      this.events.emit('itemUsed', item, slotIndex);

      // Remove consumable items after use
      if (item.consumable) {
        this.items[slotIndex] = null;
        this.events.emit('itemConsumed', item, slotIndex);
      }
    }

    return used;
  }

  /**
   * Get item in a specific slot.
   *
   * @param slotIndex - Slot to check
   * @returns Item in slot, or null if empty
   */
  getItem(slotIndex: number): Item | null {
    if (slotIndex < 0 || slotIndex >= MAX_INVENTORY_SLOTS) {
      return null;
    }
    return this.items[slotIndex];
  }

  /**
   * Get all items.
   */
  getAllItems(): Array<Item | null> {
    return [...this.items];
  }

  /**
   * Check if inventory has any items.
   */
  hasItems(): boolean {
    return this.items.some((item) => item !== null);
  }

  /**
   * Check if inventory is full.
   */
  isFull(): boolean {
    return this.items.every((item) => item !== null);
  }

  /**
   * Get number of items in inventory.
   */
  getItemCount(): number {
    return this.items.filter((item) => item !== null).length;
  }

  /**
   * Clear all items from inventory.
   */
  clear(): void {
    for (let i = 0; i < this.items.length; i++) {
      const item = this.items[i];
      if (item) {
        this.events.emit('itemRemoved', item, i);
      }
      this.items[i] = null;
    }
    this.events.emit('inventoryCleared');
  }

  /**
   * Destroy the inventory and clean up.
   */
  destroy(): void {
    this.events.removeAllListeners();
    this.items = [];
  }
}

/**
 * Create a unique item ID.
 */
export function createItemId(type: ItemType): string {
  return `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
