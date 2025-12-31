/**
 * @fileoverview Patrol Ships
 * Created with Level Editor
 */

import type { Level } from '@shared/types/Level';

export const levelPatrolShips: Level = {
  id: 'patrol-ships',
  name: 'Patrol Ships',
  description: 'Time your descent past the moving obstacle.',
  difficulty: 2,
  levelNumber: 3,

  gravity: 200,
  startingFuel: 85,
  safeLandingVelocity: 100,
  safeLandingAngle: 15,
  autoStabilization: 0.4,

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
    { x: 280, y: 160, width: 20, height: 20 },
    { x: 300, y: 160, width: 20, height: 20 },
    { x: 320, y: 160, width: 20, height: 20 },
    { x: 340, y: 160, width: 20, height: 20 },
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
    {"type":"patrolShip","x":300,"y":200,"width":50,"height":50,"minY":175,"maxY":351,"speed":50,"startDirection":1},
  ],

  multiplierBubbles: [
    { id: 'mult-2', x: 330, y: 290, value: 5, color: 'silver' },
  ],

  baseScore: 200,
  starThresholds: {
    oneStar: 100,
    twoStar: 160,
    threeStar: 250,
  },
  parTime: 40,

  visuals: {
    theme: 'asteroid',
    backgroundColor: '#0c0815',
    showStars: true,
  },
};