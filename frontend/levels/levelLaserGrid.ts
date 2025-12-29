/**
 * @fileoverview Level 6 - Laser Grid
 *
 * DESIGN INTENT:
 * - First introduction to lasers
 * - Single horizontal laser with timing
 * - Open layout to focus on laser timing
 * - Player learns: timing, patience
 */

import type { Level } from '@shared/types/Level';

export const levelLaserGrid: Level = {
  id: 'level-06',
  name: 'Laser Grid',
  description: 'Time your descent past the laser beam.',
  difficulty: 3,
  levelNumber: 6,

  gravity: 180,
  startingFuel: 90,
  safeLandingVelocity: 100,
  safeLandingAngle: 15,

  spawnPoint: { x: 100, y: 50 },

  bounds: {
    minX: 0,
    maxX: 640,
    minY: 0,
    maxY: 356,
  },

  terrain: [
    // Walls
    { x: 0, y: 0, width: 5, height: 356 },
    { x: 635, y: 0, width: 5, height: 356 },
    // Roof and Floor
    { x: 5, y: 0, width: 630, height: 5 },
    { x: 5, y: 351, width: 630, height: 5 },
    // Left platform for laser emitter (4 x 20x20 blocks)
    { x: 5, y: 178, width: 20, height: 20 },
    { x: 25, y: 178, width: 20, height: 20 },
    { x: 45, y: 178, width: 20, height: 20 },
    { x: 65, y: 178, width: 20, height: 20 },
    // Right platform for laser emitter (4 x 20x20 blocks)
    { x: 555, y: 178, width: 20, height: 20 },
    { x: 575, y: 178, width: 20, height: 20 },
    { x: 595, y: 178, width: 20, height: 20 },
    { x: 615, y: 178, width: 20, height: 20 },
  ],

  landingPads: [
    {
      id: 'pad-1',
      x: 480,
      y: 321,
      width: 100,
      height: 20,
      primary: true,
      pointMultiplier: 1,
    },
  ],

  hazards: [
    {
      type: 'laserField',
      x: 85,  // Start at platform edge
      y: 162,
      width: 470,
      height: 8,
      onDuration: 2000,
      offDuration: 2000,
      warningDuration: 500,
    },
  ],

  enemies: [],

  fuelPickups: [],
  collectibles: [],

  // Multipliers near laser path
  multiplierBubbles: [
    { id: 'mult-1', x: 320, y: 140, value: 5, color: 'silver' },  // Above laser beam
    { id: 'mult-2', x: 320, y: 185, value: 10, color: 'gold' },   // Below laser - risky timing
  ],

  baseScore: 300,
  starThresholds: {
    oneStar: 150,
    twoStar: 240,
    threeStar: 360,
  },
  parTime: 45,

  visuals: {
    theme: 'station',
    backgroundColor: '#050510',
    showStars: false,
    ambientLight: '#101020',
  },

  hint: 'DEV (L6): First laser field. Horizontal beam with on/off timing cycle.',
};
