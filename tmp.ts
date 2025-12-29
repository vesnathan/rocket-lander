/**
 * @fileoverview New Level
 * Created with Level Editor
 */

import type { Level } from '@shared/types/Level';

export const customLevel: Level = {
  id: 'custom-level',
  name: 'New Level',
  description: 'Created with Level Editor',
  difficulty: 2,
  levelNumber: 99,

  gravity: 200,
  startingFuel: 100,
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
    { x: 0, y: 0, width: 5, height: 356 },
    { x: 635, y: 0, width: 5, height: 356 },
    { x: 5, y: 0, width: 630, height: 5 },
    { x: 5, y: 351, width: 630, height: 5 },
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

  baseScore: 200,
  starThresholds: {
    oneStar: 100,
    twoStar: 160,
    threeStar: 250,
  },
  parTime: 45,

  visuals: {
    theme: 'asteroid',
    backgroundColor: '#0c0815',
    showStars: true,
  },
};