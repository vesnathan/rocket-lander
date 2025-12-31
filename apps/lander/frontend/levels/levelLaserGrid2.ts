/**
 * @fileoverview Level 7 - Laser Grid
 *
 * DESIGN INTENT:
 * - First introduction of laser hazards
 * - Timed on/off cycles require patience
 * - Visual telegraphing teaches danger awareness
 * - Player learns: observation, timing windows, danger recognition
 */

import type { Level } from '@shared/types/Level';

export const levelLaserGrid2: Level = {
  id: 'level-07',
  name: 'Laser Grid',
  description: 'Time your descent through deadly laser fields.',
  difficulty: 3,
  levelNumber: 7,

  gravity: 200,
  startingFuel: 85,
  safeLandingVelocity: 95,
  safeLandingAngle: 14,

  spawnPoint: { x: 320, y: 36 },

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
    // Roof
    { x: 5, y: 0, width: 630, height: 5 },

    // Laser mounting platforms (3 x 20x20 blocks each)
    { x: 5, y: 89, width: 20, height: 20 },
    { x: 25, y: 89, width: 20, height: 20 },
    { x: 45, y: 89, width: 20, height: 20 },
    { x: 575, y: 89, width: 20, height: 20 },
    { x: 595, y: 89, width: 20, height: 20 },
    { x: 615, y: 89, width: 20, height: 20 },

    { x: 5, y: 166, width: 20, height: 20 },
    { x: 25, y: 166, width: 20, height: 20 },
    { x: 45, y: 166, width: 20, height: 20 },
    { x: 575, y: 166, width: 20, height: 20 },
    { x: 595, y: 166, width: 20, height: 20 },
    { x: 615, y: 166, width: 20, height: 20 },

    { x: 5, y: 243, width: 20, height: 20 },
    { x: 25, y: 243, width: 20, height: 20 },
    { x: 45, y: 243, width: 20, height: 20 },
    { x: 575, y: 243, width: 20, height: 20 },
    { x: 595, y: 243, width: 20, height: 20 },
    { x: 615, y: 243, width: 20, height: 20 },

    // Floor (with gap for landing pad)
    { x: 5, y: 351, width: 250, height: 5 },
    { x: 385, y: 351, width: 250, height: 5 },
  ],

  landingPads: [
    {
      id: 'pad-1',
      x: 256,
      y: 321,
      width: 128,
      height: 20,
      primary: true,
      pointMultiplier: 1.2,
    },
  ],

  // Laser fields spanning between platforms
  hazards: [
    // First row
    {
      type: 'laserField',
      x: 69,
      y: 73,
      length: 502,
      width: 6,
      onDuration: 2000,
      offDuration: 2500,
      warningDuration: 500,
      phaseOffset: 0,
    },
    // Second row
    {
      type: 'laserField',
      x: 69,
      y: 150,
      length: 502,
      width: 6,
      onDuration: 2000,
      offDuration: 2500,
      warningDuration: 500,
      phaseOffset: 1500,
    },
    // Third row
    {
      type: 'laserField',
      x: 69,
      y: 227,
      length: 502,
      width: 6,
      onDuration: 2000,
      offDuration: 2500,
      warningDuration: 500,
      phaseOffset: 3000,
    },
  ],

  enemies: [],

  fuelPickups: [],
  collectibles: [],

  // Multipliers between laser rows - timing required
  multiplierBubbles: [
    { id: 'mult-1', x: 200, y: 115, value: 2, color: 'bronze' }, // Between rows 1-2 left
    { id: 'mult-2', x: 440, y: 192, value: 2, color: 'bronze' }, // Between rows 2-3 right
    { id: 'mult-3', x: 320, y: 190, value: 5, color: 'silver' },  // Center between rows 2-3
    { id: 'mult-4', x: 320, y: 115, value: 10, color: 'gold' },   // Center between rows 1-2 - tight
  ],

  baseScore: 400,
  starThresholds: {
    oneStar: 200,
    twoStar: 320,
    threeStar: 480,
  },
  parTime: 50,

  visuals: {
    theme: 'station',
    backgroundColor: '#080012',
    showStars: false,
    ambientLight: '#1a0020',
  },

  tutorialMessages: [
    'Watch the warning glow!',
    'Rows 1 & 3 fire together.',
  ],
  hint: 'DEV (L7): Multiple lasers with phase offsets. Creates timing puzzle.',
};
