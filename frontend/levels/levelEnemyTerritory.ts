/**
 * @fileoverview Level 8 - Enemy Territory
 *
 * DESIGN INTENT:
 * - First introduction of enemies
 * - Single patrol enemy with predictable path
 * - More open level design for maneuvering
 * - Player learns: enemy patterns, evasion, stealth approach
 */

import type { Level } from '@shared/types/Level';

export const levelEnemyTerritory: Level = {
  id: 'level-08',
  name: 'Enemy Territory',
  description: 'Avoid the patrolling guardian to reach the landing pad.',
  difficulty: 4,
  levelNumber: 8,

  gravity: 200,
  startingFuel: 90,
  safeLandingVelocity: 95,
  safeLandingAngle: 14,

  spawnPoint: { x: 80, y: 47 },

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

    // Central obstacle - enemy patrols around this (top 8 blocks)
    { x: 240, y: 119, width: 20, height: 20 },
    { x: 260, y: 119, width: 20, height: 20 },
    { x: 280, y: 119, width: 20, height: 20 },
    { x: 300, y: 119, width: 20, height: 20 },
    { x: 320, y: 119, width: 20, height: 20 },
    { x: 340, y: 119, width: 20, height: 20 },
    { x: 360, y: 119, width: 20, height: 20 },
    { x: 380, y: 119, width: 20, height: 20 },
    // Central obstacle left wall (6 blocks)
    { x: 240, y: 139, width: 20, height: 20 },
    { x: 240, y: 159, width: 20, height: 20 },
    { x: 240, y: 179, width: 20, height: 20 },
    { x: 240, y: 199, width: 20, height: 20 },
    { x: 240, y: 219, width: 20, height: 20 },
    // Central obstacle right wall (6 blocks)
    { x: 380, y: 139, width: 20, height: 20 },
    { x: 380, y: 159, width: 20, height: 20 },
    { x: 380, y: 179, width: 20, height: 20 },
    { x: 380, y: 199, width: 20, height: 20 },
    { x: 380, y: 219, width: 20, height: 20 },
    // Central obstacle bottom (8 blocks)
    { x: 240, y: 220, width: 20, height: 20 },
    { x: 260, y: 220, width: 20, height: 20 },
    { x: 280, y: 220, width: 20, height: 20 },
    { x: 300, y: 220, width: 20, height: 20 },
    { x: 320, y: 220, width: 20, height: 20 },
    { x: 340, y: 220, width: 20, height: 20 },
    { x: 360, y: 220, width: 20, height: 20 },
    { x: 380, y: 220, width: 20, height: 20 },

    // Landing platforms in safe zones (6x3 blocks each)
    { x: 5, y: 267, width: 20, height: 20 },
    { x: 25, y: 267, width: 20, height: 20 },
    { x: 45, y: 267, width: 20, height: 20 },
    { x: 65, y: 267, width: 20, height: 20 },
    { x: 85, y: 267, width: 20, height: 20 },
    { x: 105, y: 267, width: 20, height: 20 },
    { x: 5, y: 287, width: 20, height: 20 },
    { x: 25, y: 287, width: 20, height: 20 },
    { x: 45, y: 287, width: 20, height: 20 },
    { x: 65, y: 287, width: 20, height: 20 },
    { x: 85, y: 287, width: 20, height: 20 },
    { x: 105, y: 287, width: 20, height: 20 },
    { x: 5, y: 307, width: 20, height: 20 },
    { x: 25, y: 307, width: 20, height: 20 },
    { x: 45, y: 307, width: 20, height: 20 },
    { x: 65, y: 307, width: 20, height: 20 },
    { x: 85, y: 307, width: 20, height: 20 },
    { x: 105, y: 307, width: 20, height: 20 },

    { x: 515, y: 267, width: 20, height: 20 },
    { x: 535, y: 267, width: 20, height: 20 },
    { x: 555, y: 267, width: 20, height: 20 },
    { x: 575, y: 267, width: 20, height: 20 },
    { x: 595, y: 267, width: 20, height: 20 },
    { x: 615, y: 267, width: 20, height: 20 },
    { x: 515, y: 287, width: 20, height: 20 },
    { x: 535, y: 287, width: 20, height: 20 },
    { x: 555, y: 287, width: 20, height: 20 },
    { x: 575, y: 287, width: 20, height: 20 },
    { x: 595, y: 287, width: 20, height: 20 },
    { x: 615, y: 287, width: 20, height: 20 },
    { x: 515, y: 307, width: 20, height: 20 },
    { x: 535, y: 307, width: 20, height: 20 },
    { x: 555, y: 307, width: 20, height: 20 },
    { x: 575, y: 307, width: 20, height: 20 },
    { x: 595, y: 307, width: 20, height: 20 },
    { x: 615, y: 307, width: 20, height: 20 },
  ],

  landingPads: [
    {
      id: 'pad-1',
      x: 272,
      y: 267,
      width: 96,
      height: 20,
      primary: true,
      pointMultiplier: 1.3,
    },
  ],

  // Moving column as additional hazard
  hazards: [
    {
      type: 'patrolShip',
      x: 160,
      y: 178,
      width: 32,
      height: 48,
      minY: 119,
      maxY: 237,
      speed: 55,
      startDirection: 1,
    },
    {
      type: 'patrolShip',
      x: 448,
      y: 190,
      width: 32,
      height: 48,
      minY: 130,
      maxY: 249,
      speed: 55,
      startDirection: -1,
    },
  ],

  // First enemy!
  enemies: [
    {
      id: 'guardian-1',
      type: 'patrol',
      x: 200,
      y: 166,
      patrolPath: [
        { position: { x: 200, y: 166 }, waitTime: 1 },
        { position: { x: 200, y: 89 }, waitTime: 0.5 },
        { position: { x: 440, y: 89 }, waitTime: 1 },
        { position: { x: 440, y: 166 }, waitTime: 0.5 },
        { position: { x: 440, y: 249 }, waitTime: 1 },
        { position: { x: 200, y: 249 }, waitTime: 0.5 },
      ],
      loopPatrol: true,
      patrolSpeed: 65,
      chaseSpeed: 100,
      visionRange: 144,
      visionAngle: 75,
      chasePersistence: 2.5,
      active: true,
    },
  ],

  fuelPickups: [],
  collectibles: [],

  // Multipliers in patrol zones - enemy avoidance required
  multiplierBubbles: [
    { id: 'mult-1', x: 320, y: 130, value: 5, color: 'silver' },  // Inside patrol box - risky
    { id: 'mult-2', x: 180, y: 200, value: 2, color: 'bronze' }, // Near left column
    { id: 'mult-3', x: 460, y: 200, value: 2, color: 'bronze' }, // Near right column
    { id: 'mult-4', x: 320, y: 200, value: 10, color: 'gold' }, // Dead center - very risky
  ],

  baseScore: 450,
  starThresholds: {
    oneStar: 225,
    twoStar: 360,
    threeStar: 540,
  },
  parTime: 60,

  visuals: {
    theme: 'mars',
    backgroundColor: '#100808',
    showStars: true,
    ambientLight: '#2a1515',
  },

  tutorialMessages: [
    'An enemy patrols here!',
    'Stay out of its vision cone.',
  ],
  hint: 'DEV (L8): First enemy. Patrol AI with vision cone. Chases if spotted.',
};
