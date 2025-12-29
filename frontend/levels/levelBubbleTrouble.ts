/**
 * @fileoverview Level 11 - Bubble Trouble
 *
 * DESIGN INTENT:
 * - Introduces bubble guns that shoot encapsulating bubbles
 * - Blue bubbles = anti-gravity (float up)
 * - Green bubbles = gravity (fall faster)
 * - White bubbles = neutral (hold for a few seconds)
 * - Player learns: dealing with movement modifiers, timing escapes
 */

import type { Level } from '@shared/types/Level';

export const levelBubbleTrouble: Level = {
  id: 'level-11',
  name: 'Bubble Trouble',
  description: 'Avoid bubbles that can trap your ship!',
  difficulty: 4,
  levelNumber: 11,

  gravity: 200,
  startingFuel: 85,
  safeLandingVelocity: 95,
  safeLandingAngle: 14,

  spawnPoint: { x: 320, y: 50 },

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
    // Platforms for bubble guns (3 blocks each)
    { x: 5, y: 150, width: 20, height: 20 },
    { x: 25, y: 150, width: 20, height: 20 },
    { x: 45, y: 150, width: 20, height: 20 },
    { x: 575, y: 150, width: 20, height: 20 },
    { x: 595, y: 150, width: 20, height: 20 },
    { x: 615, y: 150, width: 20, height: 20 },
    { x: 5, y: 250, width: 20, height: 20 },
    { x: 25, y: 250, width: 20, height: 20 },
    { x: 45, y: 250, width: 20, height: 20 },
    { x: 575, y: 250, width: 20, height: 20 },
    { x: 595, y: 250, width: 20, height: 20 },
    { x: 615, y: 250, width: 20, height: 20 },
  ],

  landingPads: [
    {
      id: 'pad-1',
      x: 270,
      y: 311,
      width: 100,
      height: 20,
      primary: true,
      pointMultiplier: 1.3,
    },
  ],

  // Bubble guns on both sides
  hazards: [
    {
      type: 'bubbleGun',
      x: 65,
      y: 157,
      direction: 'right',
      bubbleType: 'blue',
      fireRate: 3000,
      bubbleSpeed: 60,
      bubbleDuration: 4000,
    },
    {
      type: 'bubbleGun',
      x: 575,
      y: 157,
      direction: 'left',
      bubbleType: 'green',
      fireRate: 3500,
      bubbleSpeed: 60,
      bubbleDuration: 4000,
    },
    {
      type: 'bubbleGun',
      x: 65,
      y: 257,
      direction: 'right',
      bubbleType: 'white',
      fireRate: 4000,
      bubbleSpeed: 50,
      bubbleDuration: 3000,
    },
  ],

  enemies: [],

  fuelPickups: [],
  collectibles: [],

  // Multipliers in bubble gun crossfire zones
  multiplierBubbles: [
    { id: 'mult-1', x: 200, y: 160, value: 5, color: 'silver' },  // Upper left bubble zone
    { id: 'mult-2', x: 440, y: 160, value: 5, color: 'silver' },  // Upper right bubble zone
    { id: 'mult-3', x: 200, y: 260, value: 10, color: 'gold' },   // Lower left bubble zone
    { id: 'mult-4', x: 320, y: 260, value: 10, color: 'gold' }, // Center crossfire
  ],

  baseScore: 500,
  starThresholds: {
    oneStar: 250,
    twoStar: 400,
    threeStar: 600,
  },
  parTime: 60,

  visuals: {
    theme: 'station',
    backgroundColor: '#0a0818',
    showStars: false,
    ambientLight: '#1a1030',
  },

  tutorialMessages: [
    'Blue bubbles float up!',
    'Green bubbles pull down!',
    'White bubbles hold you!',
  ],
  hint: 'DEV (L11): Bubble guns shoot different colored bubbles that affect ship movement.',
};
