/**
 * @fileoverview Level 2 - Narrow Descent
 *
 * DESIGN INTENT:
 * - Second tutorial level
 * - Introduces narrower landing pad
 * - Simple terrain obstacles to navigate
 * - Slightly higher gravity
 * - Player learns: precision landing, obstacle awareness
 */

/**
 * @fileoverview Narrow Descent
 * Created with Level Editor
 */

import type { Level } from '@shared/types/Level';

export const levelNarrowDescent: Level = {
  id: 'level-02',
  name: 'Narrow Descent',
  description: 'Navigate through a narrow canyon to land.',
  difficulty: 1,
  levelNumber: 2,

  gravity: 180,
  startingFuel: 90,
  safeLandingVelocity: 110,
  safeLandingAngle: 18,
  autoStabilization: 0.6,

  spawnPoint: { x: 540, y: 50 },

  bounds: {
    minX: 0,
    maxX: 640,
    minY: 0,
    maxY: 356,
  },

  terrain: [
    { x: 0, y: 0, width: 5, height: 356 },
    { x: 635, y: 0, width: 5, height: 356 },
    { x: 5, y: 0, width: 630, height: 5 },
    { x: 5, y: 351, width: 630, height: 5 },
    { x: 260, y: 100, width: 20, height: 20 },
    { x: 280, y: 100, width: 20, height: 20 },
    { x: 300, y: 100, width: 20, height: 20 },
    { x: 320, y: 100, width: 20, height: 20 },
    { x: 340, y: 100, width: 20, height: 20 },
    { x: 360, y: 100, width: 20, height: 20 },
    { x: 380, y: 100, width: 20, height: 20 },
    { x: 400, y: 100, width: 20, height: 20 },
    { x: 160, y: 200, width: 20, height: 20 },
    { x: 180, y: 200, width: 20, height: 20 },
    { x: 200, y: 200, width: 20, height: 20 },
    { x: 160, y: 220, width: 20, height: 20 },
    { x: 180, y: 220, width: 20, height: 20 },
    { x: 200, y: 220, width: 20, height: 20 },
    { x: 160, y: 240, width: 20, height: 20 },
    { x: 180, y: 240, width: 20, height: 20 },
    { x: 200, y: 240, width: 20, height: 20 },
  ],

  landingPads: [
    {
      id: 'pad-1',
      x: 60,
      y: 321,
      width: 100,
      height: 20,
      primary: true,
      pointMultiplier: 1,
    },
  ],

  multiplierBubbles: [
    { id: 'mult-1', x: 260, y: 160, value: 2, color: 'bronze' },
    { id: 'mult-2', x: 180, y: 290, value: 5, color: 'silver' },
  ],

  baseScore: 150,
  starThresholds: {
    oneStar: 75,
    twoStar: 120,
    threeStar: 180,
  },
  parTime: 35,

  visuals: {
    theme: 'moon',
    backgroundColor: '#0a0a18',
    showStars: true,
  },
};