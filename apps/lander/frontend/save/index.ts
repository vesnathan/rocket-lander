/**
 * @fileoverview Save system exports.
 */

export type {
  PlayerStats,
  GameSettings,
  SaveState,
} from './SaveState';

export {
  SaveManager,
  createDefaultSaveState,
  getSaveManager,
  destroySaveManager,
} from './SaveState';
