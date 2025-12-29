/**
 * @fileoverview Save state management and persistence.
 * Handles level unlocks, star ratings, coins, and local storage.
 */

import {
  createDefaultLevelState,
  type LevelState,
} from '@shared/types/Level';
import { TOTAL_LEVELS } from '../levels/levels';

/**
 * Storage key for save data in localStorage.
 */
const STORAGE_KEY = 'rocket-puzzle-lander-save';

/**
 * Current save file version for migration support.
 */
const SAVE_VERSION = 1;

/**
 * Player statistics.
 */
export interface PlayerStats {
  /** Total play time in seconds */
  totalPlayTime: number;
  /** Total number of crashes */
  totalCrashes: number;
  /** Total successful landings */
  totalLandings: number;
  /** Perfect landings */
  perfectLandings: number;
  /** Total fuel used */
  totalFuelUsed: number;
}

/**
 * Settings that persist across sessions.
 */
export interface GameSettings {
  /** Master volume (0-1) */
  masterVolume: number;
  /** Music volume (0-1) */
  musicVolume: number;
  /** SFX volume (0-1) */
  sfxVolume: number;
  /** Whether to show tutorial hints */
  showHints: boolean;
  /** Whether to use high-contrast mode */
  highContrast: boolean;
  /** Sensitivity multiplier for tilt controls */
  tiltSensitivity: number;
  /** Whether tilt controls are inverted */
  invertTilt: boolean;
}

/**
 * Complete save state structure.
 */
export interface SaveState {
  /** Save file version */
  version: number;
  /** Timestamp of last save */
  lastSaved: number;
  /** Current coin balance */
  coins: number;
  /** Total stars earned */
  totalStars: number;
  /** Level progress by level ID */
  levelProgress: Record<string, LevelState>;
  /** Player statistics */
  stats: PlayerStats;
  /** Game settings */
  settings: GameSettings;
  /** Inventory item type IDs */
  inventory: string[];
}

/**
 * Default player statistics.
 */
const DEFAULT_STATS: PlayerStats = {
  totalPlayTime: 0,
  totalCrashes: 0,
  totalLandings: 0,
  perfectLandings: 0,
  totalFuelUsed: 0,
};

/**
 * Default game settings.
 */
const DEFAULT_SETTINGS: GameSettings = {
  masterVolume: 0.8,
  musicVolume: 0.6,
  sfxVolume: 0.8,
  showHints: true,
  highContrast: false,
  tiltSensitivity: 1.0,
  invertTilt: false,
};

/**
 * Creates a fresh save state with default values.
 */
export function createDefaultSaveState(): SaveState {
  const levelProgress: Record<string, LevelState> = {};

  // Initialize progress for all levels
  for (let i = 1; i <= TOTAL_LEVELS; i++) {
    const levelId = `level-${String(i).padStart(2, '0')}`;
    // First level is unlocked by default
    levelProgress[levelId] = createDefaultLevelState(levelId, i === 1);
  }

  return {
    version: SAVE_VERSION,
    lastSaved: Date.now(),
    coins: 0,
    totalStars: 0,
    levelProgress,
    stats: { ...DEFAULT_STATS },
    settings: { ...DEFAULT_SETTINGS },
    inventory: [],
  };
}

/**
 * Save manager class for handling persistence.
 */
export class SaveManager {
  private state: SaveState;
  private autoSaveEnabled: boolean;
  private autoSaveIntervalMs: number;
  private autoSaveTimer: ReturnType<typeof setInterval> | null = null;

  constructor(autoSave = true, autoSaveInterval = 30000) {
    this.autoSaveEnabled = autoSave;
    this.autoSaveIntervalMs = autoSaveInterval;
    this.state = this.load();

    if (this.autoSaveEnabled) {
      this.startAutoSave();
    }
  }

  /**
   * Load save state from localStorage.
   */
  load(): SaveState {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);

      if (!saved) {
        return createDefaultSaveState();
      }

      const parsed = JSON.parse(saved) as SaveState;

      // Migrate if needed
      if (parsed.version !== SAVE_VERSION) {
        return this.migrate(parsed);
      }

      return parsed;
    } catch (error) {
      console.error('Failed to load save:', error);
      return createDefaultSaveState();
    }
  }

  /**
   * Save current state to localStorage.
   */
  save(): boolean {
    try {
      this.state.lastSaved = Date.now();
      const json = JSON.stringify(this.state);
      localStorage.setItem(STORAGE_KEY, json);
      return true;
    } catch (error) {
      console.error('Failed to save:', error);
      return false;
    }
  }

  /**
   * Migrate save data from older versions.
   */
  private migrate(oldState: SaveState): SaveState {
    // For now, just create fresh state
    // In future versions, implement actual migration logic
    console.log('Migrating save from version', oldState.version);
    const newState = createDefaultSaveState();

    // Preserve what we can
    if (oldState.coins !== undefined) {
      newState.coins = oldState.coins;
    }
    if (oldState.levelProgress) {
      // Merge level progress
      for (const [key, value] of Object.entries(oldState.levelProgress)) {
        if (newState.levelProgress[key]) {
          newState.levelProgress[key] = {
            ...newState.levelProgress[key],
            ...value,
          };
        }
      }
    }

    return newState;
  }

  /**
   * Start auto-save timer.
   */
  private startAutoSave(): void {
    if (this.autoSaveTimer) {
      return;
    }

    this.autoSaveTimer = setInterval(() => {
      this.save();
    }, this.autoSaveIntervalMs);
  }

  /**
   * Stop auto-save timer.
   */
  stopAutoSave(): void {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
      this.autoSaveTimer = null;
    }
  }

  /**
   * Get the current save state (read-only copy).
   */
  getState(): SaveState {
    return { ...this.state };
  }

  // === Level Progress ===

  /**
   * Get progress for a specific level.
   */
  getLevelProgress(levelId: string): LevelState | undefined {
    return this.state.levelProgress[levelId];
  }

  /**
   * Check if a level is unlocked.
   */
  isLevelUnlocked(levelId: string): boolean {
    return this.state.levelProgress[levelId]?.unlocked ?? false;
  }

  /**
   * Unlock a level.
   */
  unlockLevel(levelId: string): void {
    if (this.state.levelProgress[levelId]) {
      this.state.levelProgress[levelId].unlocked = true;
    }
  }

  /**
   * Record level completion.
   */
  completeLevel(
    levelId: string,
    stars: number,
    score: number,
    time: number
  ): void {
    const progress = this.state.levelProgress[levelId];
    if (!progress) return;

    // Update attempts
    progress.completions++;

    // Update best stars
    if (stars > progress.bestStars) {
      progress.bestStars = stars;
    }

    // Update high score
    if (score > progress.highScore) {
      progress.highScore = score;
    }

    // Update best time
    if (progress.bestTime === null || time < progress.bestTime) {
      progress.bestTime = time;
    }

    // Recalculate total stars
    this.recalculateTotalStars();

    // Unlock next level
    const levelNum = parseInt(levelId.split('-')[1], 10);
    const nextLevelId = `level-${String(levelNum + 1).padStart(2, '0')}`;
    if (this.state.levelProgress[nextLevelId]) {
      this.state.levelProgress[nextLevelId].unlocked = true;
    }

    this.save();
  }

  /**
   * Record level attempt (even if failed).
   */
  recordAttempt(levelId: string): void {
    const progress = this.state.levelProgress[levelId];
    if (progress) {
      progress.attempts++;
    }
  }

  /**
   * Recalculate total stars from all levels.
   */
  private recalculateTotalStars(): void {
    let total = 0;
    for (const progress of Object.values(this.state.levelProgress)) {
      total += progress.bestStars;
    }
    this.state.totalStars = total;
  }

  // === Coins ===

  /**
   * Get current coin balance.
   */
  getCoins(): number {
    return this.state.coins;
  }

  /**
   * Add coins.
   */
  addCoins(amount: number): void {
    this.state.coins += Math.max(0, amount);
  }

  /**
   * Spend coins. Returns false if insufficient.
   */
  spendCoins(amount: number): boolean {
    if (this.state.coins < amount) {
      return false;
    }
    this.state.coins -= amount;
    return true;
  }

  // === Statistics ===

  /**
   * Get player statistics.
   */
  getStats(): PlayerStats {
    return { ...this.state.stats };
  }

  /**
   * Update statistics.
   */
  updateStats(updates: Partial<PlayerStats>): void {
    this.state.stats = { ...this.state.stats, ...updates };
  }

  /**
   * Record a crash.
   */
  recordCrash(): void {
    this.state.stats.totalCrashes++;
  }

  /**
   * Record a landing.
   */
  recordLanding(isPerfect = false): void {
    this.state.stats.totalLandings++;
    if (isPerfect) {
      this.state.stats.perfectLandings++;
    }
  }

  /**
   * Add play time.
   */
  addPlayTime(seconds: number): void {
    this.state.stats.totalPlayTime += seconds;
  }

  // === Settings ===

  /**
   * Get current settings.
   */
  getSettings(): GameSettings {
    return { ...this.state.settings };
  }

  /**
   * Update settings.
   */
  updateSettings(updates: Partial<GameSettings>): void {
    this.state.settings = { ...this.state.settings, ...updates };
    this.save();
  }

  // === Reset ===

  /**
   * Reset all progress (but keep settings).
   */
  resetProgress(): void {
    const settings = this.state.settings;
    this.state = createDefaultSaveState();
    this.state.settings = settings;
    this.save();
  }

  /**
   * Completely reset everything.
   */
  resetAll(): void {
    this.state = createDefaultSaveState();
    this.save();
  }

  /**
   * Destroy and clean up.
   */
  destroy(): void {
    this.stopAutoSave();
    this.save();
  }
}

// Singleton instance
let saveManagerInstance: SaveManager | null = null;

/**
 * Get the global SaveManager instance.
 */
export function getSaveManager(): SaveManager {
  if (!saveManagerInstance) {
    saveManagerInstance = new SaveManager();
  }
  return saveManagerInstance;
}

/**
 * Destroy the global SaveManager instance.
 */
export function destroySaveManager(): void {
  if (saveManagerInstance) {
    saveManagerInstance.destroy();
    saveManagerInstance = null;
  }
}
