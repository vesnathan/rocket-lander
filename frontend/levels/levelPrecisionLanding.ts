/**
 * @fileoverview Level 5 - Precision Landing
 *
 * DESIGN INTENT:
 * - Small landing pad on elevated platform
 * - Tight corridors requiring precise control
 * - Higher gravity increases challenge
 * - Player learns: precise thrust control, tight maneuvering
 */

import type { Level } from '@shared/types/Level';

export const levelPrecisionLanding: Level = {
  id: 'level-05',
  name: 'Precision Landing',
  description: 'Land on the small platform with pinpoint accuracy.',
  difficulty: 3,
  levelNumber: 5,

  gravity: 200,
  startingFuel: 85,
  safeLandingVelocity: 95,
  safeLandingAngle: 14,

  spawnPoint: { x: 550, y: 60 },

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
    // Ceiling overhang forcing a path (5x4 = 20 blocks)
    { x: 300, y: 5, width: 20, height: 20 },
    { x: 320, y: 5, width: 20, height: 20 },
    { x: 340, y: 5, width: 20, height: 20 },
    { x: 360, y: 5, width: 20, height: 20 },
    { x: 380, y: 5, width: 20, height: 20 },
    { x: 300, y: 25, width: 20, height: 20 },
    { x: 320, y: 25, width: 20, height: 20 },
    { x: 340, y: 25, width: 20, height: 20 },
    { x: 360, y: 25, width: 20, height: 20 },
    { x: 380, y: 25, width: 20, height: 20 },
    { x: 300, y: 45, width: 20, height: 20 },
    { x: 320, y: 45, width: 20, height: 20 },
    { x: 340, y: 45, width: 20, height: 20 },
    { x: 360, y: 45, width: 20, height: 20 },
    { x: 380, y: 45, width: 20, height: 20 },
    { x: 300, y: 65, width: 20, height: 20 },
    { x: 320, y: 65, width: 20, height: 20 },
    { x: 340, y: 65, width: 20, height: 20 },
    { x: 360, y: 65, width: 20, height: 20 },
    { x: 380, y: 65, width: 20, height: 20 },
    // Middle obstacle (6 x 20x20 blocks)
    { x: 160, y: 140, width: 20, height: 20 },
    { x: 180, y: 140, width: 20, height: 20 },
    { x: 200, y: 140, width: 20, height: 20 },
    { x: 220, y: 140, width: 20, height: 20 },
    { x: 240, y: 140, width: 20, height: 20 },
    { x: 260, y: 140, width: 20, height: 20 },
    // Small platform (4 x 20x20 blocks)
    { x: 400, y: 220, width: 20, height: 20 },
    { x: 420, y: 220, width: 20, height: 20 },
    { x: 440, y: 220, width: 20, height: 20 },
    { x: 460, y: 220, width: 20, height: 20 },
  ],

  landingPads: [
    {
      id: 'pad-1',
      x: 60,
      y: 321,
      width: 80,
      height: 20,
      primary: true,
      pointMultiplier: 1.5,
    },
  ],

  // Moving column, black hole, and bubble gun
  hazards: [
    {
      type: 'patrolShip',
      x: 200,
      y: 280,
      width: 40,
      height: 40,
      // Auto-detects terrain: bounces off middle obstacle above and floor below
      speed: 65,
      startDirection: 1,
    },
    // Black hole to pull bubble to the right
    {
      type: 'gravityWell',
      x: 600,
      y: 60,
      radius: 200,
      strength: 100,
      affectsRocket: false,
      affectsBubble: true,
      color: 0x111111,
    },
    // Bubble gun on right platform, shooting toward ship
    {
      type: 'bubbleGun',
      x: 440,
      y: 205,
      direction: 'left',
      bubbleType: 'random',
      fireRate: 2000,
      bubbleSpeed: 400,
      bubbleDuration: 3000,
    },
  ],

  enemies: [],

  fuelPickups: [],
  collectibles: [],

  // Multipliers near hazards
  multiplierBubbles: [
    { id: 'mult-1', x: 230, y: 170, value: 2, color: 'bronze' }, // Near middle obstacle
    { id: 'mult-2', x: 200, y: 300, value: 5, color: 'silver' },  // Near moving column
    { id: 'mult-3', x: 360, y: 60, value: 10, color: 'gold' },    // Tight ceiling gap
  ],

  baseScore: 300,
  starThresholds: {
    oneStar: 150,
    twoStar: 250,
    threeStar: 380,
  },
  parTime: 50,

  visuals: {
    theme: 'station',
    backgroundColor: '#080810',
    showStars: false,
    ambientLight: '#1a1a2e',
  },

  hint: 'DEV (L5): Ceiling block forces path choice. Two columns at different heights.',
};
