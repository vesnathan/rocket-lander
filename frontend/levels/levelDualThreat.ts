/**
 * @fileoverview Level 9 - Dual Threat
 *
 * DESIGN INTENT:
 * - Multiple enemies with different patrol paths
 * - Lasers combined with enemies
 * - Complex routing decisions
 * - Player learns: multi-threat awareness, route planning
 */

import type { Level } from '@shared/types/Level';

export const levelDualThreat: Level = {
  id: 'level-09',
  name: 'Dual Threat',
  description: 'Navigate past two guardians and laser defenses.',
  difficulty: 4,
  levelNumber: 9,

  gravity: 220,
  startingFuel: 85,
  safeLandingVelocity: 90,
  safeLandingAngle: 12,

  spawnPoint: { x: 320, y: 36 },

  bounds: {
    minX: 0,
    maxX: 640,
    minY: 0,
    maxY: 356,
  },

  terrain: [
    // Outer frame
    { x: 0, y: 0, width: 5, height: 356 },
    { x: 635, y: 0, width: 5, height: 356 },
    { x: 0, y: 0, width: 640, height: 5 },
    { x: 0, y: 351, width: 640, height: 5 },

    // Upper platforms (8 blocks each)
    { x: 5, y: 77, width: 20, height: 20 },
    { x: 25, y: 77, width: 20, height: 20 },
    { x: 45, y: 77, width: 20, height: 20 },
    { x: 65, y: 77, width: 20, height: 20 },
    { x: 85, y: 77, width: 20, height: 20 },
    { x: 105, y: 77, width: 20, height: 20 },
    { x: 125, y: 77, width: 20, height: 20 },
    { x: 145, y: 77, width: 20, height: 20 },
    { x: 475, y: 77, width: 20, height: 20 },
    { x: 495, y: 77, width: 20, height: 20 },
    { x: 515, y: 77, width: 20, height: 20 },
    { x: 535, y: 77, width: 20, height: 20 },
    { x: 555, y: 77, width: 20, height: 20 },
    { x: 575, y: 77, width: 20, height: 20 },
    { x: 595, y: 77, width: 20, height: 20 },
    { x: 615, y: 77, width: 20, height: 20 },

    // Middle divider with gaps (6, 10, 6 blocks)
    { x: 5, y: 166, width: 20, height: 20 },
    { x: 25, y: 166, width: 20, height: 20 },
    { x: 45, y: 166, width: 20, height: 20 },
    { x: 65, y: 166, width: 20, height: 20 },
    { x: 85, y: 166, width: 20, height: 20 },
    { x: 105, y: 166, width: 20, height: 20 },
    { x: 224, y: 166, width: 20, height: 20 },
    { x: 244, y: 166, width: 20, height: 20 },
    { x: 264, y: 166, width: 20, height: 20 },
    { x: 284, y: 166, width: 20, height: 20 },
    { x: 304, y: 166, width: 20, height: 20 },
    { x: 324, y: 166, width: 20, height: 20 },
    { x: 344, y: 166, width: 20, height: 20 },
    { x: 364, y: 166, width: 20, height: 20 },
    { x: 384, y: 166, width: 20, height: 20 },
    { x: 404, y: 166, width: 20, height: 20 },
    { x: 507, y: 166, width: 20, height: 20 },
    { x: 527, y: 166, width: 20, height: 20 },
    { x: 547, y: 166, width: 20, height: 20 },
    { x: 567, y: 166, width: 20, height: 20 },
    { x: 587, y: 166, width: 20, height: 20 },
    { x: 607, y: 166, width: 20, height: 20 },

    // Lower platforms (10 blocks each)
    { x: 5, y: 255, width: 20, height: 20 },
    { x: 25, y: 255, width: 20, height: 20 },
    { x: 45, y: 255, width: 20, height: 20 },
    { x: 65, y: 255, width: 20, height: 20 },
    { x: 85, y: 255, width: 20, height: 20 },
    { x: 105, y: 255, width: 20, height: 20 },
    { x: 125, y: 255, width: 20, height: 20 },
    { x: 145, y: 255, width: 20, height: 20 },
    { x: 165, y: 255, width: 20, height: 20 },
    { x: 185, y: 255, width: 20, height: 20 },
    { x: 435, y: 255, width: 20, height: 20 },
    { x: 455, y: 255, width: 20, height: 20 },
    { x: 475, y: 255, width: 20, height: 20 },
    { x: 495, y: 255, width: 20, height: 20 },
    { x: 515, y: 255, width: 20, height: 20 },
    { x: 535, y: 255, width: 20, height: 20 },
    { x: 555, y: 255, width: 20, height: 20 },
    { x: 575, y: 255, width: 20, height: 20 },
    { x: 595, y: 255, width: 20, height: 20 },
    { x: 615, y: 255, width: 20, height: 20 },

    // Floor sections (8 blocks each)
    { x: 5, y: 320, width: 20, height: 20 },
    { x: 25, y: 320, width: 20, height: 20 },
    { x: 45, y: 320, width: 20, height: 20 },
    { x: 65, y: 320, width: 20, height: 20 },
    { x: 85, y: 320, width: 20, height: 20 },
    { x: 105, y: 320, width: 20, height: 20 },
    { x: 125, y: 320, width: 20, height: 20 },
    { x: 145, y: 320, width: 20, height: 20 },
    { x: 475, y: 320, width: 20, height: 20 },
    { x: 495, y: 320, width: 20, height: 20 },
    { x: 515, y: 320, width: 20, height: 20 },
    { x: 535, y: 320, width: 20, height: 20 },
    { x: 555, y: 320, width: 20, height: 20 },
    { x: 575, y: 320, width: 20, height: 20 },
    { x: 595, y: 320, width: 20, height: 20 },
    { x: 615, y: 320, width: 20, height: 20 },
  ],

  landingPads: [
    {
      id: 'pad-1',
      x: 256,
      y: 308,
      width: 128,
      height: 20,
      primary: true,
      pointMultiplier: 1.5,
    },
  ],

  hazards: [
    // Laser between platforms
    {
      type: 'laserField',
      x: 320,
      y: 208,
      width: 5,
      length: 240,
      angle: 0,
      onDuration: 1500,
      offDuration: 2000,
      warningDuration: 400,
      phaseOffset: 0,
    },
    // Vertical laser on left
    {
      type: 'laserField',
      x: 192,
      y: 122,
      width: 5,
      length: 71,
      angle: 90, // Vertical
      onDuration: 1500,
      offDuration: 2000,
      warningDuration: 400,
      phaseOffset: 1000,
    },
    // Vertical laser on right
    {
      type: 'laserField',
      x: 448,
      y: 122,
      width: 5,
      length: 71,
      angle: 90,
      onDuration: 1500,
      offDuration: 2000,
      warningDuration: 400,
      phaseOffset: 1000,
    },
  ],

  enemies: [
    // Left side patrol
    {
      id: 'guardian-left',
      type: 'patrol',
      x: 120,
      y: 119,
      patrolPath: [
        { position: { x: 80, y: 119 }, waitTime: 0.5 },
        { position: { x: 80, y: 225 }, waitTime: 0.5 },
        { position: { x: 160, y: 225 }, waitTime: 0.5 },
        { position: { x: 160, y: 119 }, waitTime: 0.5 },
      ],
      loopPatrol: true,
      patrolSpeed: 55,
      chaseSpeed: 90,
      visionRange: 120,
      visionAngle: 70,
      chasePersistence: 2,
      active: true,
    },
    // Right side patrol
    {
      id: 'guardian-right',
      type: 'patrol',
      x: 520,
      y: 225,
      patrolPath: [
        { position: { x: 560, y: 225 }, waitTime: 0.5 },
        { position: { x: 560, y: 119 }, waitTime: 0.5 },
        { position: { x: 480, y: 119 }, waitTime: 0.5 },
        { position: { x: 480, y: 225 }, waitTime: 0.5 },
      ],
      loopPatrol: true,
      patrolSpeed: 55,
      chaseSpeed: 90,
      visionRange: 120,
      visionAngle: 70,
      chasePersistence: 2,
      active: true,
    },
  ],

  fuelPickups: [],
  collectibles: [],

  // Multipliers in high-danger zones between patrols and lasers
  multiplierBubbles: [
    { id: 'mult-1', x: 160, y: 200, value: 5, color: 'silver' },  // Left patrol zone
    { id: 'mult-2', x: 480, y: 200, value: 5, color: 'silver' },  // Right patrol zone
    { id: 'mult-3', x: 320, y: 100, value: 10, color: 'gold' },   // Near center
    { id: 'mult-4', x: 320, y: 250, value: 10, color: 'gold' }, // Near bottom laser - extreme
  ],

  baseScore: 500,
  starThresholds: {
    oneStar: 250,
    twoStar: 400,
    threeStar: 600,
  },
  parTime: 65,

  visuals: {
    theme: 'station',
    backgroundColor: '#0a0510',
    showStars: false,
    ambientLight: '#15102a',
  },

  hint: 'DEV (L9): Two patrol enemies + lasers. Multi-threat awareness test.',
};
