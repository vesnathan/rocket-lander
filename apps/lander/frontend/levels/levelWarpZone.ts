/**
 * @fileoverview Warp Zone 1
 * Created with Level Editor
 */

import type { Level } from '@shared/types/Level';

export const levelWarpZone: Level = {
  id: 'warp-zone',
  name: 'Warp Zone',
  description: 'Navigate past columns that warp through portals.',
  difficulty: 2,
  levelNumber: 13,

  gravity: 200,
  startingFuel: 80,
  safeLandingVelocity: 100,
  safeLandingAngle: 15,
  autoStabilization: 0.2,

  spawnPoint: { x: 80, y: 180 },

  bounds: {
    minX: 0,
    maxX: 640,
    minY: 0,
    maxY: 356,
  },

  terrain: [
    { x: 0, y: 0, width: 5, height: 356 },
    { x: 635, y: 0, width: 5, height: 356 },
    { x: 5, y: 0, width: 275, height: 5 },
    { x: 360, y: 0, width: 275, height: 5 },
    { x: 5, y: 351, width: 275, height: 5 },
    { x: 360, y: 351, width: 275, height: 5 },
    { x: 280, y: 175, width: 20, height: 20 },
    { x: 300, y: 175, width: 20, height: 20 },
    { x: 320, y: 175, width: 20, height: 20 },
    { x: 340, y: 175, width: 20, height: 20 },
    { x: 100, y: 120, width: 20, height: 20 },
    { x: 120, y: 120, width: 20, height: 20 },
    { x: 140, y: 120, width: 20, height: 20 },
    { x: 160, y: 120, width: 20, height: 20 },
    { x: 500, y: 120, width: 20, height: 20 },
    { x: 520, y: 120, width: 20, height: 20 },
    { x: 540, y: 120, width: 20, height: 20 },
    { x: 560, y: 120, width: 20, height: 20 },
  ],

  landingPads: [
    {
      id: 'pad-1',
      x: 500,
      y: 300,
      width: 100,
      height: 20,
      primary: true,
      pointMultiplier: 1,
    },
  ],

  hazards: [
    {"type":"gravityWell","x":40,"y":40,"radius":180,"strength":120,"affectsRocket":false,"affectsBubble":true,"color":1118481},
  ],

  multiplierBubbles: [
    { id: 'mult-1', x: 320, y: 100, value: 2, color: 'bronze', group: 'B' },
    { id: 'mult-2', x: 320, y: 280, value: 5, color: 'silver', group: 'B' },
    { id: 'mult-1765783893450', x: 610, y: 130, value: 10, color: 'gold', group: 'A' },
  ],

  baseScore: 250,
  starThresholds: {
    oneStar: 125,
    twoStar: 200,
    threeStar: 300,
  },
  parTime: 45,

  visuals: {
    theme: 'asteroid',
    backgroundColor: '#0a0612',
    showStars: true,
  },
};