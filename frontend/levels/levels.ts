/**
 * @fileoverview Level registry and loading utilities.
 * This module provides centralized access to all game levels.
 */

import type { Level } from '@shared/types/Level';

import { levelFirstContact } from './levelFirstContact';
import { levelNarrowDescent } from './levelNarrowDescent';
import { levelPatrolShips } from './levelPatrolShips';
import { levelWarpZone } from './levelWarpZone';
import { levelWarpZonePatrolShip } from './levelWarpZonePatrolShip';
import { levelPrecisionLanding } from './levelPrecisionLanding';
import { levelLaserGrid } from './levelLaserGrid';
import { levelLaserGrid2 } from './levelLaserGrid2';
import { levelEnemyTerritory } from './levelEnemyTerritory';
import { levelDualThreat } from './levelDualThreat';
import { levelTheGauntlet } from './levelTheGauntlet';
import { levelBubbleTrouble } from './levelBubbleTrouble';
import { levelPortalMaze } from './levelPortalMaze';

/**
 * Complete registry of all game levels.
 */
export const LEVELS: readonly Level[] = [
  levelFirstContact,
  levelNarrowDescent,
  levelPatrolShips,
  levelWarpZone,
  levelWarpZonePatrolShip,
  levelPrecisionLanding,
  levelLaserGrid,
  levelLaserGrid2,
  levelEnemyTerritory,
  levelDualThreat,
  levelTheGauntlet,
  levelBubbleTrouble,
  levelPortalMaze,
] as const;

export const TOTAL_LEVELS = LEVELS.length;

export function getLevel(levelNumber: number): Level | undefined {
  if (levelNumber < 1 || levelNumber > TOTAL_LEVELS) return undefined;
  return LEVELS[levelNumber - 1];
}