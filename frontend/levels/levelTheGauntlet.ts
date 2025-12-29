/**
 * @fileoverview Level 10 - The Gauntlet
 *
 * DESIGN INTENT:
 * - Ultimate mastery test
 * - All hazard types combined
 * - Ice layer hiding bonus landing pad
 * - Multiple routes with risk/reward
 * - Player must demonstrate all learned skills
 */

import type { Level } from '@shared/types/Level';

export const levelTheGauntlet: Level = {
  id: 'level-10',
  name: 'The Gauntlet',
  description: 'The ultimate test. Every skill you\'ve learned will be needed.',
  difficulty: 5,
  levelNumber: 10,

  gravity: 230,
  startingFuel: 90,
  safeLandingVelocity: 85,
  safeLandingAngle: 10,

  spawnPoint: { x: 320, y: 30 },

  bounds: {
    minX: 0,
    maxX: 640,
    minY: 0,
    maxY: 356,
  },

  terrain: [
    // Outer walls
    { x: 0, y: 0, width: 5, height: 356 },
    { x: 635, y: 0, width: 5, height: 356 },
    { x: 0, y: 0, width: 640, height: 5 },
    { x: 0, y: 351, width: 640, height: 5 },

    // Complex maze structure
    // Top section (10 blocks each)
    { x: 5, y: 59, width: 20, height: 20 },
    { x: 25, y: 59, width: 20, height: 20 },
    { x: 45, y: 59, width: 20, height: 20 },
    { x: 65, y: 59, width: 20, height: 20 },
    { x: 85, y: 59, width: 20, height: 20 },
    { x: 105, y: 59, width: 20, height: 20 },
    { x: 125, y: 59, width: 20, height: 20 },
    { x: 145, y: 59, width: 20, height: 20 },
    { x: 165, y: 59, width: 20, height: 20 },
    { x: 185, y: 59, width: 20, height: 20 },
    { x: 435, y: 59, width: 20, height: 20 },
    { x: 455, y: 59, width: 20, height: 20 },
    { x: 475, y: 59, width: 20, height: 20 },
    { x: 495, y: 59, width: 20, height: 20 },
    { x: 515, y: 59, width: 20, height: 20 },
    { x: 535, y: 59, width: 20, height: 20 },
    { x: 555, y: 59, width: 20, height: 20 },
    { x: 575, y: 59, width: 20, height: 20 },
    { x: 595, y: 59, width: 20, height: 20 },
    { x: 615, y: 59, width: 20, height: 20 },

    // Second tier platforms (3, 4, 3 blocks)
    { x: 80, y: 104, width: 20, height: 20 },
    { x: 100, y: 104, width: 20, height: 20 },
    { x: 120, y: 104, width: 20, height: 20 },
    { x: 288, y: 104, width: 20, height: 20 },
    { x: 308, y: 104, width: 20, height: 20 },
    { x: 328, y: 104, width: 20, height: 20 },
    { x: 348, y: 104, width: 20, height: 20 },
    { x: 496, y: 104, width: 20, height: 20 },
    { x: 516, y: 104, width: 20, height: 20 },
    { x: 536, y: 104, width: 20, height: 20 },

    // Middle barrier with narrow passages (7, 4, 4, 7 blocks)
    { x: 5, y: 148, width: 20, height: 20 },
    { x: 25, y: 148, width: 20, height: 20 },
    { x: 45, y: 148, width: 20, height: 20 },
    { x: 65, y: 148, width: 20, height: 20 },
    { x: 85, y: 148, width: 20, height: 20 },
    { x: 105, y: 148, width: 20, height: 20 },
    { x: 125, y: 148, width: 20, height: 20 },
    { x: 224, y: 148, width: 20, height: 20 },
    { x: 244, y: 148, width: 20, height: 20 },
    { x: 264, y: 148, width: 20, height: 20 },
    { x: 284, y: 148, width: 20, height: 20 },
    { x: 336, y: 148, width: 20, height: 20 },
    { x: 356, y: 148, width: 20, height: 20 },
    { x: 376, y: 148, width: 20, height: 20 },
    { x: 396, y: 148, width: 20, height: 20 },
    { x: 491, y: 148, width: 20, height: 20 },
    { x: 511, y: 148, width: 20, height: 20 },
    { x: 531, y: 148, width: 20, height: 20 },
    { x: 551, y: 148, width: 20, height: 20 },
    { x: 571, y: 148, width: 20, height: 20 },
    { x: 591, y: 148, width: 20, height: 20 },
    { x: 611, y: 148, width: 20, height: 20 },

    // Lower platforms (4 blocks each)
    { x: 5, y: 208, width: 20, height: 20 },
    { x: 25, y: 208, width: 20, height: 20 },
    { x: 45, y: 208, width: 20, height: 20 },
    { x: 65, y: 208, width: 20, height: 20 },
    { x: 555, y: 208, width: 20, height: 20 },
    { x: 575, y: 208, width: 20, height: 20 },
    { x: 595, y: 208, width: 20, height: 20 },
    { x: 615, y: 208, width: 20, height: 20 },

    // Central pillar (2x5 blocks)
    { x: 296, y: 166, width: 20, height: 20 },
    { x: 316, y: 166, width: 20, height: 20 },
    { x: 296, y: 186, width: 20, height: 20 },
    { x: 316, y: 186, width: 20, height: 20 },
    { x: 296, y: 206, width: 20, height: 20 },
    { x: 316, y: 206, width: 20, height: 20 },
    { x: 296, y: 226, width: 20, height: 20 },
    { x: 316, y: 226, width: 20, height: 20 },
    { x: 296, y: 246, width: 20, height: 20 },
    { x: 316, y: 246, width: 20, height: 20 },

    // Floor sections (5, 4, 4, 5 blocks)
    { x: 5, y: 267, width: 20, height: 20 },
    { x: 25, y: 267, width: 20, height: 20 },
    { x: 45, y: 267, width: 20, height: 20 },
    { x: 65, y: 267, width: 20, height: 20 },
    { x: 85, y: 267, width: 20, height: 20 },
    { x: 200, y: 267, width: 20, height: 20 },
    { x: 220, y: 267, width: 20, height: 20 },
    { x: 240, y: 267, width: 20, height: 20 },
    { x: 260, y: 267, width: 20, height: 20 },
    { x: 360, y: 267, width: 20, height: 20 },
    { x: 380, y: 267, width: 20, height: 20 },
    { x: 400, y: 267, width: 20, height: 20 },
    { x: 420, y: 267, width: 20, height: 20 },
    { x: 539, y: 267, width: 20, height: 20 },
    { x: 559, y: 267, width: 20, height: 20 },
    { x: 579, y: 267, width: 20, height: 20 },
    { x: 599, y: 267, width: 20, height: 20 },
    { x: 619, y: 267, width: 20, height: 20 },

    // Main floor (11 blocks each side)
    { x: 5, y: 330, width: 20, height: 20 },
    { x: 25, y: 330, width: 20, height: 20 },
    { x: 45, y: 330, width: 20, height: 20 },
    { x: 65, y: 330, width: 20, height: 20 },
    { x: 85, y: 330, width: 20, height: 20 },
    { x: 105, y: 330, width: 20, height: 20 },
    { x: 125, y: 330, width: 20, height: 20 },
    { x: 145, y: 330, width: 20, height: 20 },
    { x: 165, y: 330, width: 20, height: 20 },
    { x: 185, y: 330, width: 20, height: 20 },
    { x: 205, y: 330, width: 20, height: 20 },
    { x: 411, y: 330, width: 20, height: 20 },
    { x: 431, y: 330, width: 20, height: 20 },
    { x: 451, y: 330, width: 20, height: 20 },
    { x: 471, y: 330, width: 20, height: 20 },
    { x: 491, y: 330, width: 20, height: 20 },
    { x: 511, y: 330, width: 20, height: 20 },
    { x: 531, y: 330, width: 20, height: 20 },
    { x: 551, y: 330, width: 20, height: 20 },
    { x: 571, y: 330, width: 20, height: 20 },
    { x: 591, y: 330, width: 20, height: 20 },
    { x: 611, y: 330, width: 20, height: 20 },
  ],

  landingPads: [
    // Primary pad (easier to reach)
    {
      id: 'pad-main',
      x: 276,
      y: 314,
      width: 88,
      height: 20,
      primary: true,
      pointMultiplier: 1,
    },
    // Bonus pad (hidden under ice, harder to reach)
    {
      id: 'pad-bonus',
      x: 80,
      y: 297,
      width: 56,
      height: 20,
      primary: false,
      pointMultiplier: 3, // Triple points!
    },
  ],

  // Ice layer covering bonus pad
  iceLayers: [
    {
      id: 'ice-1',
      x: 64,
      y: 285,
      width: 88,
      height: 18,
      thickness: 1,
      revealsLandingPad: true,
      revealedPadId: 'pad-bonus',
    },
  ],

  hazards: [
    // Moving columns in different sections
    {
      type: 'patrolShip',
      x: 144,
      y: 107,
      width: 36,
      height: 36,
      minY: 77,
      maxY: 136,
      speed: 70,
      startDirection: 1,
      phaseOffset: 0,
    },
    {
      type: 'patrolShip',
      x: 432,
      y: 107,
      width: 36,
      height: 36,
      minY: 77,
      maxY: 136,
      speed: 70,
      startDirection: -1,
      phaseOffset: 0.5,
    },
    {
      type: 'patrolShip',
      x: 176,
      y: 225,
      width: 40,
      height: 42,
      minY: 178,
      maxY: 255,
      speed: 60,
      startDirection: 1,
      phaseOffset: 0,
    },
    {
      type: 'patrolShip',
      x: 424,
      y: 225,
      width: 40,
      height: 42,
      minY: 178,
      maxY: 255,
      speed: 60,
      startDirection: -1,
      phaseOffset: 0.5,
    },

    // Laser defenses
    {
      type: 'laserField',
      x: 320,
      y: 83,
      width: 5,
      length: 160,
      angle: 0,
      onDuration: 1800,
      offDuration: 2200,
      warningDuration: 400,
      phaseOffset: 0,
    },
    {
      type: 'laserField',
      x: 320,
      y: 291,
      width: 5,
      length: 144,
      angle: 0,
      onDuration: 1800,
      offDuration: 2200,
      warningDuration: 400,
      phaseOffset: 1000,
    },
  ],

  enemies: [
    // Central patrol
    {
      id: 'guardian-center',
      type: 'patrol',
      x: 240,
      y: 190,
      patrolPath: [
        { position: { x: 200, y: 190 }, waitTime: 0.3 },
        { position: { x: 200, y: 237 }, waitTime: 0.3 },
        { position: { x: 400, y: 237 }, waitTime: 0.3 },
        { position: { x: 400, y: 190 }, waitTime: 0.3 },
      ],
      loopPatrol: true,
      patrolSpeed: 65,
      chaseSpeed: 105,
      visionRange: 128,
      visionAngle: 80,
      chasePersistence: 2.5,
      active: true,
    },
    // Upper patrol
    {
      id: 'guardian-upper',
      type: 'patrol',
      x: 320,
      y: 119,
      patrolPath: [
        { position: { x: 240, y: 119 }, waitTime: 0.5 },
        { position: { x: 400, y: 119 }, waitTime: 0.5 },
      ],
      loopPatrol: false, // Ping-pong pattern
      patrolSpeed: 50,
      chaseSpeed: 80,
      visionRange: 96,
      visionAngle: 60,
      chasePersistence: 1.5,
      active: true,
    },
  ],

  fuelPickups: [],
  collectibles: [],

  // Final level - multipliers everywhere for maximum risk/reward
  multiplierBubbles: [
    { id: 'mult-1', x: 180, y: 120, value: 2, color: 'bronze' }, // Near moving column
    { id: 'mult-2', x: 460, y: 120, value: 2, color: 'bronze' }, // Near other column
    { id: 'mult-3', x: 160, y: 210, value: 5, color: 'silver' },  // Lower left zone
    { id: 'mult-4', x: 480, y: 210, value: 5, color: 'silver' },  // Lower right zone
    { id: 'mult-5', x: 320, y: 210, value: 10, color: 'gold' },   // Central danger zone
    { id: 'mult-6', x: 100, y: 270, value: 10, color: 'gold' }, // Near ice layer bonus pad
    { id: 'mult-7', x: 320, y: 300, value: 10, color: 'gold' }, // Near bottom laser
  ],

  checkpoints: [
    {
      id: 'checkpoint-mid',
      x: 320,
      y: 166,
      active: false,
    },
  ],

  baseScore: 750,
  starThresholds: {
    oneStar: 375,
    twoStar: 600,
    threeStar: 900,
  },
  timeBonusMultiplier: 1.5,
  parTime: 90,

  visuals: {
    theme: 'space',
    backgroundColor: '#020208',
    showStars: true,
    ambientLight: '#0a0a15',
    backgroundLayers: [
      {
        texture: 'nebula',
        parallax: 0.1,
        alpha: 0.3,
      },
    ],
  },

  hint: 'DEV (L10): Final gauntlet. All hazard types + ice layer hiding bonus pad.',
};
