/**
 * @fileoverview Level 1 - First Contact
 *
 * DESIGN INTENT:
 * - Tutorial level introducing basic controls
 * - No hazards or obstacles
 * - Wide landing pad with generous fuel
 * - Low gravity for easier control
 * - Player learns: thrust, rotation, landing
 */

import type { Level } from '@shared/types/Level';

export const levelFirstContact: Level = {
  id: 'level-01',
  name: 'First Contact',
  description: 'Learn the basics of rocket control and landing.',
  difficulty: 1,
  levelNumber: 1,

  // Forgiving physics for learning
  gravity: 120,
  startingFuel: 100,
  safeLandingVelocity: 120, // Very forgiving
  safeLandingAngle: 20,
  autoStabilization: 0.8, // Strong auto-stabilization for beginners

  spawnPoint: { x: 100, y: 60 },

  bounds: {
    minX: 0,
    maxX: 640,
    minY: 0,
    maxY: 356,
  },

  // Simple terrain - fly across to reach landing pad
  terrain: [
    // Walls
    { x: 0, y: 0, width: 5, height: 356 },
    { x: 635, y: 0, width: 5, height: 356 },
    // Roof and Floor
    { x: 5, y: 0, width: 630, height: 5 },
    { x: 5, y: 351, width: 630, height: 5 },
    // Small platform near spawn (4 x 20x20 blocks)
    { x: 60, y: 120, width: 20, height: 20 },
    { x: 80, y: 120, width: 20, height: 20 },
    { x: 100, y: 120, width: 20, height: 20 },
    { x: 120, y: 120, width: 20, height: 20 },
  ],

  // Landing pad on the right side
  landingPads: [
    {
      id: 'pad-1',
      x: 450,
      y: 311,
      width: 120,
      height: 20,
      primary: true,
      pointMultiplier: 1,
    },
  ],

  // No hazards for tutorial
  hazards: [],
  enemies: [],
  fuelPickups: [],
  collectibles: [],

  // Easy intro multiplier - low risk position
  multiplierBubbles: [
    { id: 'mult-1', x: 300, y: 200, value: 2, color: 'bronze' },
  ],

  baseScore: 100,
  starThresholds: {
    oneStar: 50,
    twoStar: 80,
    threeStar: 100,
  },
  parTime: 30,

  visuals: {
    theme: 'moon',
    backgroundColor: '#0a0a15',
    showStars: true,
  },

  tutorialMessages: [
    'Use A/D or tilt to rotate',
    'Press SPACE or tap to thrust',
    'Land gently on the green pad',
  ],
  hint: 'DEV (L1): Basic horizontal flight. Spawn left, land right. No hazards.',
};
