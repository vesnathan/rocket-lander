/**
 * @fileoverview Level 12 - Warp Zone
 *
 * DESIGN INTENT:
 * - Introduces warp portals that teleport the ship
 * - Enter one portal, exit from another
 * - Requires spatial planning and timing
 * - Player learns: warp mechanics, level navigation
 */

import type { Level } from '@shared/types/Level';

export const levelPortalMaze: Level = {
  id: 'level-12',
  name: 'Portal Maze',
  description: 'Use warp portals to reach the landing pad!',
  difficulty: 4,
  levelNumber: 12,

  gravity: 200,
  startingFuel: 80,
  safeLandingVelocity: 95,
  safeLandingAngle: 14,

  spawnPoint: { x: 80, y: 80 },

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
    // Dividing wall in middle (forces use of portals) - 10 blocks upper, 4 blocks lower
    { x: 300, y: 5, width: 20, height: 20 },
    { x: 300, y: 25, width: 20, height: 20 },
    { x: 300, y: 45, width: 20, height: 20 },
    { x: 300, y: 65, width: 20, height: 20 },
    { x: 300, y: 85, width: 20, height: 20 },
    { x: 300, y: 105, width: 20, height: 20 },
    { x: 300, y: 125, width: 20, height: 20 },
    { x: 300, y: 145, width: 20, height: 20 },
    { x: 300, y: 165, width: 20, height: 20 },
    { x: 300, y: 185, width: 20, height: 20 },
    { x: 300, y: 250, width: 20, height: 20 },
    { x: 300, y: 270, width: 20, height: 20 },
    { x: 300, y: 290, width: 20, height: 20 },
    { x: 300, y: 310, width: 20, height: 20 },
    // Left platform (4 blocks)
    { x: 50, y: 150, width: 20, height: 20 },
    { x: 70, y: 150, width: 20, height: 20 },
    { x: 90, y: 150, width: 20, height: 20 },
    { x: 110, y: 150, width: 20, height: 20 },
    // Right upper platform (4 blocks)
    { x: 400, y: 100, width: 20, height: 20 },
    { x: 420, y: 100, width: 20, height: 20 },
    { x: 440, y: 100, width: 20, height: 20 },
    { x: 460, y: 100, width: 20, height: 20 },
    // Right lower platform (4 blocks)
    { x: 500, y: 200, width: 20, height: 20 },
    { x: 520, y: 200, width: 20, height: 20 },
    { x: 540, y: 200, width: 20, height: 20 },
    { x: 560, y: 200, width: 20, height: 20 },
  ],

  landingPads: [
    {
      id: 'pad-1',
      x: 500,
      y: 311,
      width: 100,
      height: 20,
      primary: true,
      pointMultiplier: 1.3,
    },
  ],

  // Warp zones - linked pairs
  hazards: [
    {
      type: 'warpZone',
      id: 'warp-a1',
      targetId: 'warp-a2',
      x: 150,
      y: 280,
      width: 50,
      height: 60,
      color: 0x8844ff,
    },
    {
      type: 'warpZone',
      id: 'warp-a2',
      targetId: 'warp-a1',
      x: 400,
      y: 150,
      width: 50,
      height: 60,
      color: 0x8844ff,
    },
    {
      type: 'warpZone',
      id: 'warp-b1',
      targetId: 'warp-b2',
      x: 50,
      y: 50,
      width: 50,
      height: 60,
      color: 0x44ff88,
    },
    {
      type: 'warpZone',
      id: 'warp-b2',
      targetId: 'warp-b1',
      x: 550,
      y: 50,
      width: 50,
      height: 60,
      color: 0x44ff88,
    },
  ],

  enemies: [],

  fuelPickups: [],
  collectibles: [],

  // Multipliers near warp portal paths
  multiplierBubbles: [
    { id: 'mult-1', x: 200, y: 150, value: 2, color: 'bronze' }, // Left side near wall
    { id: 'mult-2', x: 180, y: 310, value: 5, color: 'silver' },  // Near purple portal
    { id: 'mult-3', x: 450, y: 180, value: 5, color: 'silver' },  // Right side after portal
    { id: 'mult-4', x: 600, y: 100, value: 10, color: 'gold' },   // Near green portal exit
    { id: 'mult-5', x: 350, y: 250, value: 10, color: 'gold' }, // In the divider gap
  ],

  baseScore: 550,
  starThresholds: {
    oneStar: 275,
    twoStar: 440,
    threeStar: 660,
  },
  parTime: 55,

  visuals: {
    theme: 'station',
    backgroundColor: '#0a0a1a',
    showStars: true,
    ambientLight: '#201040',
  },

  tutorialMessages: [
    'Enter a portal to teleport!',
    'Same colored portals are linked.',
  ],
  hint: 'DEV (L12): Warp zones teleport between linked pairs. Wall blocks direct path.',
};
