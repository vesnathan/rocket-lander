/**
 * @fileoverview Shared entity rendering functions.
 * Used by both the level editor and game scene for consistent visuals.
 */

/**
 * Color constants for entity rendering.
 */
export const ENTITY_COLORS = {
  // Terrain
  metalDark: 0x2a2a3a,
  metalMid: 0x4a4a5a,
  metalLight: 0x6a6a7a,
  trussColor: 0x3a3a4a,

  // Landing pad
  padGlow: 0x00ff44,
  padFill: 0x004422,
  padStroke: 0x00ff44,

  // Patrol ship
  shipBody: 0x882222,
  shipNose: 0x222222,
  shipCockpit: 0xff2222,
  shipStripe: 0xffcc00,
  shipFins: 0x661111,
  shipEngine: 0xff6600,

  // Multiplier bubbles
  bronze: 0xcd7f32,
  silver: 0xc0c0c0,
  gold: 0xffd700,
  platinum: 0xe5e4e2,

  // Spawn bubble colors (affect gravity)
  spawnGreen: 0x44ff88,   // Standard gravity
  spawnWhite: 0xeeeeff,   // Reduced gravity
  spawnBlue: 0x4488ff,    // Anti-gravity
};

/**
 * Spawn bubble color configuration.
 */
export const SPAWN_BUBBLE_COLORS: Record<string, { fill: number; stroke: number }> = {
  green: { fill: 0x44ff88, stroke: 0x66ffaa },
  white: { fill: 0xeeeeff, stroke: 0xffffff },
  blue: { fill: 0x4488ff, stroke: 0x66aaff },
};

/**
 * Render a terrain block as a stage platform with steel top and truss.
 */
export function renderTerrain(
  scene: Phaser.Scene,
  x: number,
  y: number,
  width: number,
  height: number
): Phaser.GameObjects.Container {
  const container = scene.add.container(x + width / 2, y + height / 2);

  // Thin pieces (walls/floors) - just simple lines
  if (width < 10 || height < 10) {
    const line = scene.add.rectangle(0, 0, width, height, ENTITY_COLORS.metalMid);
    line.setStrokeStyle(1, ENTITY_COLORS.metalDark);
    container.add(line);
    container.setSize(width, height);
    return container;
  }

  // Stage platform design: flat steel top with triangle truss beneath
  const topHeight = Math.min(6, height * 0.3);
  const trussHeight = height - topHeight;

  // Steel top surface
  const topSurface = scene.add.rectangle(0, -height / 2 + topHeight / 2, width, topHeight, ENTITY_COLORS.metalLight);
  topSurface.setStrokeStyle(1, ENTITY_COLORS.metalDark);
  container.add(topSurface);

  // Top highlight line
  const highlight = scene.add.rectangle(0, -height / 2 + 1, width - 2, 2, 0x8a8a9a);
  container.add(highlight);

  // Truss section background
  if (trussHeight > 4) {
    const trussBackground = scene.add.rectangle(0, -height / 2 + topHeight + trussHeight / 2, width, trussHeight, ENTITY_COLORS.metalDark);
    container.add(trussBackground);

    // Draw triangle truss pattern using graphics
    const graphics = scene.add.graphics();
    container.add(graphics);

    const trussTop = -height / 2 + topHeight;
    const trussBottom = height / 2;

    // Truss frame
    graphics.lineStyle(2, ENTITY_COLORS.trussColor, 1);
    graphics.strokeRect(-width / 2, trussTop, width, trussHeight);

    // Triangle pattern
    const triangleWidth = Math.min(trussHeight, 20);
    const numTriangles = Math.max(1, Math.floor(width / triangleWidth));
    const actualTriangleWidth = width / numTriangles;

    graphics.lineStyle(1.5, ENTITY_COLORS.metalMid, 0.8);

    for (let i = 0; i < numTriangles; i++) {
      const leftX = -width / 2 + i * actualTriangleWidth;
      const rightX = -width / 2 + (i + 1) * actualTriangleWidth;
      const midX = leftX + actualTriangleWidth / 2;

      graphics.beginPath();
      graphics.moveTo(leftX, trussTop);
      graphics.lineTo(midX, trussBottom);
      graphics.lineTo(rightX, trussTop);
      graphics.strokePath();
    }
  }

  container.setSize(width, height);
  return container;
}

/**
 * Render a landing pad with glow, chevrons, and lights.
 */
export function renderLandingPad(
  scene: Phaser.Scene,
  x: number,
  y: number,
  width: number,
  height: number,
  primary: boolean = true
): { container: Phaser.GameObjects.Container; lights: Phaser.GameObjects.Arc[] } {
  const container = scene.add.container(x + width / 2, y + height / 2);

  // Glow effect
  const glow = scene.add.rectangle(0, 0, width + 8, height + 4, ENTITY_COLORS.padGlow, 0.15);
  container.add(glow);

  // Main pad surface
  const rect = scene.add.rectangle(0, 0, width, height, ENTITY_COLORS.padFill);
  rect.setStrokeStyle(2, ENTITY_COLORS.padStroke);
  container.add(rect);

  // Chevron landing stripes
  const chevronGraphics = scene.add.graphics();
  chevronGraphics.lineStyle(2, ENTITY_COLORS.padStroke, 0.7);
  const chevronSpacing = 16;
  const chevronCount = Math.floor((width - 20) / chevronSpacing);
  const chevronStartX = -(chevronCount - 1) * chevronSpacing / 2;

  for (let i = 0; i < chevronCount; i++) {
    const chevronX = chevronStartX + i * chevronSpacing;
    const chevronSize = 5;
    chevronGraphics.beginPath();
    chevronGraphics.moveTo(chevronX - chevronSize, -chevronSize);
    chevronGraphics.lineTo(chevronX, chevronSize);
    chevronGraphics.lineTo(chevronX + chevronSize, -chevronSize);
    chevronGraphics.strokePath();
  }
  container.add(chevronGraphics);

  // Landing lights on edges
  const lightSize = 4;
  const leftLight = scene.add.circle(-width / 2 + 8, 0, lightSize, ENTITY_COLORS.padStroke);
  const rightLight = scene.add.circle(width / 2 - 8, 0, lightSize, ENTITY_COLORS.padStroke);
  container.add(leftLight);
  container.add(rightLight);

  container.setSize(width, height);
  return { container, lights: [leftLight, rightLight] };
}

/**
 * Render a patrol ship.
 */
export function renderPatrolShip(
  scene: Phaser.Scene,
  width: number,
  height: number
): Phaser.GameObjects.Container {
  const container = scene.add.container(0, 0);

  // Draw patrol ship graphics (scaled to fit the entity bounds)
  const graphics = scene.add.graphics();
  const scale = Math.min(width / 24, height / 32) * 0.8;

  // Main body (dark red)
  graphics.fillStyle(ENTITY_COLORS.shipBody);
  graphics.fillRect(-6 * scale, -10 * scale, 12 * scale, 20 * scale);

  // Nose cone (dark gray)
  graphics.fillStyle(ENTITY_COLORS.shipNose);
  graphics.fillTriangle(
    0, -14 * scale,
    -6 * scale, -10 * scale,
    6 * scale, -10 * scale
  );

  // Cockpit (red menacing eye)
  graphics.fillStyle(ENTITY_COLORS.shipCockpit);
  graphics.fillCircle(0, -6 * scale, 3 * scale);

  // Yellow warning stripe
  graphics.fillStyle(ENTITY_COLORS.shipStripe);
  graphics.fillRect(-6 * scale, 4 * scale, 12 * scale, 2 * scale);

  // Fins (darker red)
  graphics.fillStyle(ENTITY_COLORS.shipFins);
  graphics.fillTriangle(
    -6 * scale, 10 * scale,
    -10 * scale, 14 * scale,
    -6 * scale, 4 * scale
  );
  graphics.fillTriangle(
    6 * scale, 10 * scale,
    10 * scale, 14 * scale,
    6 * scale, 4 * scale
  );

  // Engine glow
  graphics.fillStyle(ENTITY_COLORS.shipEngine, 0.6);
  graphics.fillRect(-3 * scale, 10 * scale, 6 * scale, 4 * scale);

  container.add(graphics);

  // Hitbox outline (semi-transparent)
  const hitbox = scene.add.rectangle(0, 0, width, height, ENTITY_COLORS.shipEngine, 0.1);
  hitbox.setStrokeStyle(1, ENTITY_COLORS.shipEngine, 0.5);
  container.add(hitbox);

  container.setSize(width, height);
  return container;
}

/**
 * Render a multiplier bubble (hexagon).
 */
export function renderMultiplierBubble(
  scene: Phaser.Scene,
  value: number,
  color: 'bronze' | 'silver' | 'gold' | 'platinum' = 'gold'
): Phaser.GameObjects.Container {
  const container = scene.add.container(0, 0);
  const radius = 18;

  const colorMap: Record<string, number> = {
    bronze: ENTITY_COLORS.bronze,
    silver: ENTITY_COLORS.silver,
    gold: ENTITY_COLORS.gold,
    platinum: ENTITY_COLORS.platinum,
  };
  const fillColor = colorMap[color] ?? ENTITY_COLORS.gold;

  // Outer glow
  const glowGraphics = scene.add.graphics();
  glowGraphics.fillStyle(fillColor, 0.3);
  drawHexagon(glowGraphics, 0, 0, radius + 4);
  container.add(glowGraphics);

  // Main hexagon
  const hexGraphics = scene.add.graphics();
  hexGraphics.fillStyle(fillColor, 0.85);
  drawHexagon(hexGraphics, 0, 0, radius);
  hexGraphics.lineStyle(2, 0xffffff, 0.6);
  drawHexagonStroke(hexGraphics, 0, 0, radius);
  container.add(hexGraphics);

  // Value text - white, just the number
  const text = scene.add.text(0, 0, `${value}`, {
    fontFamily: 'monospace',
    fontSize: '12px',
    color: '#ffffff',
    fontStyle: 'bold',
  }).setOrigin(0.5);
  container.add(text);

  container.setSize(radius * 2, radius * 2);
  container.setData('glow', glowGraphics);
  return container;
}

/**
 * Render a spawn/encapsulating bubble.
 * Used by both spawn bubbles and bubble gun encapsulation.
 * @param color - Bubble color: 'green' (anti-gravity up), 'blue' (gravity down), 'white' (neutral)
 */
export function renderSpawnBubble(
  scene: Phaser.Scene,
  color: 'green' | 'white' | 'blue' = 'green'
): { bubble: Phaser.GameObjects.Arc; glow: Phaser.GameObjects.Arc } {
  const colors = SPAWN_BUBBLE_COLORS[color] ?? SPAWN_BUBBLE_COLORS.green;

  const glow = scene.add.circle(0, 0, 32, colors.fill, 0.2);
  const bubble = scene.add.circle(0, 0, 28, colors.fill, 0.3);
  bubble.setStrokeStyle(1, colors.stroke);

  return { bubble, glow };
}

/**
 * Draw a filled hexagon.
 */
export function drawHexagon(graphics: Phaser.GameObjects.Graphics, x: number, y: number, radius: number): void {
  const points: { x: number; y: number }[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 2;
    points.push({
      x: x + radius * Math.cos(angle),
      y: y + radius * Math.sin(angle),
    });
  }
  graphics.fillPoints(points, true);
}

/**
 * Draw a hexagon stroke.
 */
export function drawHexagonStroke(graphics: Phaser.GameObjects.Graphics, x: number, y: number, radius: number): void {
  const points: { x: number; y: number }[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 2;
    points.push({
      x: x + radius * Math.cos(angle),
      y: y + radius * Math.sin(angle),
    });
  }
  graphics.strokePoints(points, true);
}

/**
 * Laser field color constants.
 */
export const LASER_COLORS = {
  box: 0x445566,
  boxStroke: 0x667788,
  beam: 0xff0000,
  glow: 0xff0000,
};

/**
 * Render a laser field with emitter and receiver boxes.
 * Supports both old format (length, angle) and new format (emitterX/Y, receiverX/Y).
 */
export function renderLaserField(
  scene: Phaser.Scene,
  config: {
    // New endpoint format (relative to center)
    emitterX?: number;
    emitterY?: number;
    receiverX?: number;
    receiverY?: number;
    // Old format
    length?: number;
    angle?: number;
    width?: number;
  }
): Phaser.GameObjects.Container {
  const container = scene.add.container(0, 0);

  // Calculate emitter and receiver positions
  let emitterX: number, emitterY: number, receiverX: number, receiverY: number;

  if (config.emitterX !== undefined && config.receiverX !== undefined) {
    emitterX = config.emitterX;
    emitterY = config.emitterY ?? 0;
    receiverX = config.receiverX;
    receiverY = config.receiverY ?? 0;
  } else if (config.length !== undefined) {
    const angle = ((config.angle ?? 0) * Math.PI) / 180;
    const halfLen = config.length / 2;
    emitterX = -halfLen * Math.cos(angle);
    emitterY = -halfLen * Math.sin(angle);
    receiverX = halfLen * Math.cos(angle);
    receiverY = halfLen * Math.sin(angle);
  } else {
    // Legacy: horizontal laser
    const width = config.width ?? 100;
    emitterX = -width / 2;
    emitterY = 0;
    receiverX = width / 2;
    receiverY = 0;
  }

  // Calculate beam properties
  const dx = receiverX - emitterX;
  const dy = receiverY - emitterY;
  const beamLength = Math.sqrt(dx * dx + dy * dy);
  const beamAngle = Math.atan2(dy, dx) * (180 / Math.PI);
  const midX = (emitterX + receiverX) / 2;
  const midY = (emitterY + receiverY) / 2;

  const boxSize = 16;

  // Emitter box
  const emitter = scene.add.rectangle(emitterX, emitterY, boxSize, boxSize, LASER_COLORS.box);
  emitter.setStrokeStyle(2, LASER_COLORS.boxStroke);
  emitter.setAngle(beamAngle);
  container.add(emitter);

  // Emitter glow indicator
  const emitterGlow = scene.add.circle(emitterX, emitterY, 4, LASER_COLORS.glow);
  container.add(emitterGlow);

  // Receiver box
  const receiver = scene.add.rectangle(receiverX, receiverY, boxSize, boxSize, LASER_COLORS.box);
  receiver.setStrokeStyle(2, LASER_COLORS.boxStroke);
  receiver.setAngle(beamAngle);
  container.add(receiver);

  // Receiver glow indicator
  const receiverGlow = scene.add.circle(receiverX, receiverY, 4, LASER_COLORS.glow);
  container.add(receiverGlow);

  // Laser beam
  const beamHeight = 4;
  const beam = scene.add.rectangle(midX, midY, beamLength - boxSize, beamHeight, LASER_COLORS.beam, 0.9);
  beam.setAngle(beamAngle);
  container.add(beam);

  // Calculate proper bounds
  const minX = Math.min(emitterX, receiverX) - boxSize / 2;
  const maxX = Math.max(emitterX, receiverX) + boxSize / 2;
  const minY = Math.min(emitterY, receiverY) - boxSize / 2;
  const maxY = Math.max(emitterY, receiverY) + boxSize / 2;

  // The bounds center may not be at (0,0) - store the offset for selection box positioning
  const boundsCenterX = (minX + maxX) / 2;
  const boundsCenterY = (minY + maxY) / 2;

  container.setSize(maxX - minX, maxY - minY);
  container.setData('emitterGlow', emitterGlow);
  container.setData('receiverGlow', receiverGlow);
  container.setData('beam', beam);
  container.setData('boundsOffsetX', boundsCenterX);
  container.setData('boundsOffsetY', boundsCenterY);

  return container;
}

/**
 * Bubble gun color constants.
 */
export const BUBBLE_GUN_COLORS = {
  blue: { body: 0x2244aa, accent: 0x4488ff },
  green: { body: 0x228822, accent: 0x44ff44 },
  white: { body: 0x888888, accent: 0xffffff },
  random: { body: 0x444444, accent: 0x888888 },
};

/**
 * Render a bubble gun.
 */
export function renderBubbleGun(
  scene: Phaser.Scene,
  direction: 'left' | 'right' | 'up' | 'down',
  bubbleType: 'blue' | 'green' | 'white' | 'random'
): Phaser.GameObjects.Container {
  const container = scene.add.container(0, 0);

  const color = BUBBLE_GUN_COLORS[bubbleType] ?? BUBBLE_GUN_COLORS.random;

  // Gun body (circular base)
  const gunBody = scene.add.circle(0, 0, 12, color.body);
  gunBody.setStrokeStyle(2, color.accent);
  container.add(gunBody);

  // Barrel (positioned to extend from center)
  const barrel = scene.add.rectangle(10, 0, 14, 6, color.body);
  barrel.setStrokeStyle(1, color.accent);
  barrel.setOrigin(0, 0.5);
  container.add(barrel);

  // Set barrel rotation based on direction
  let barrelAngle = 0;
  if (direction === 'right') barrelAngle = 0;
  else if (direction === 'left') barrelAngle = Math.PI;
  else if (direction === 'up') barrelAngle = -Math.PI / 2;
  else barrelAngle = Math.PI / 2;
  barrel.setRotation(barrelAngle);

  // Indicator light
  const light = scene.add.circle(0, 0, 6, 0xffffff);
  light.setScale(0.5);
  container.add(light);

  container.setSize(36, 36);
  container.setData('barrel', barrel);
  container.setData('light', light);

  return container;
}

/**
 * Render a warp zone portal.
 */
export function renderWarpZone(
  scene: Phaser.Scene,
  width: number,
  height: number,
  color: number = 0x8844ff
): Phaser.GameObjects.Container {
  const container = scene.add.container(0, 0);

  // Outer glow
  const glow = scene.add.rectangle(0, 0, width + 10, height + 10, color, 0.2);
  container.add(glow);

  // Main portal body
  const body = scene.add.rectangle(0, 0, width, height, color, 0.4);
  body.setStrokeStyle(3, color);
  container.add(body);

  // Inner swirl effect (3 rotating ellipses)
  for (let i = 0; i < 3; i++) {
    const ellipse = scene.add.ellipse(0, 0, width * 0.6, height * 0.3, color, 0.3 + i * 0.1);
    ellipse.setAngle(i * 60);
    container.add(ellipse);
  }

  // Center light
  const light = scene.add.circle(0, 0, 8, 0xffffff, 0.8);
  container.add(light);

  container.setSize(width, height);
  container.setData('glow', glow);
  container.setData('light', light);

  return container;
}

/**
 * Render a gravity well.
 */
export function renderGravityWell(
  scene: Phaser.Scene,
  radius: number,
  strength: number,
  color: number = 0x6644aa
): Phaser.GameObjects.Container {
  const container = scene.add.container(0, 0);
  const isBlackHole = (color & 0xffffff) < 0x333333;

  if (isBlackHole) {
    // Black hole style
    const outerGlow = scene.add.circle(0, 0, radius, 0x331100, 0.15);
    outerGlow.setStrokeStyle(2, 0x662200, 0.2);
    container.add(outerGlow);

    // Asymmetric bright spot
    const brightSpot = scene.add.ellipse(0, 8, 30, 10, 0xffcc44, 0.6);
    container.add(brightSpot);

    // Event horizon (pure black center)
    const eventHorizon = scene.add.circle(0, 0, 12, 0x000000, 1);
    container.add(eventHorizon);
  } else {
    // Regular gravity well style
    const outerGlow = scene.add.circle(0, 0, radius, color, 0.1);
    outerGlow.setStrokeStyle(1, color, 0.3);
    container.add(outerGlow);

    // Concentric rings
    for (let i = 3; i > 0; i--) {
      const ring = scene.add.circle(0, 0, radius * (i / 4), color, 0.05 * i);
      ring.setStrokeStyle(1, color, 0.2);
      container.add(ring);
    }

    // Core
    const core = scene.add.circle(0, 0, 10, color, 0.8);
    container.add(core);
  }

  container.setSize(radius * 2, radius * 2);
  return container;
}

/**
 * Render a fuel pickup canister.
 */
export function renderFuelPickup(
  scene: Phaser.Scene,
  amount: number = 20
): Phaser.GameObjects.Container {
  const container = scene.add.container(0, 0);
  const canWidth = 16;
  const canHeight = 20;

  // Canister body
  const body = scene.add.rectangle(0, 0, canWidth, canHeight, 0xffcc00);
  body.setStrokeStyle(2, 0xcc9900);
  container.add(body);

  // Top cap
  const cap = scene.add.rectangle(0, -canHeight / 2 - 2, canWidth * 0.6, 4, 0x888888);
  container.add(cap);

  // Fuel level indicator
  const fuelLevel = scene.add.rectangle(0, 2, canWidth - 4, canHeight - 8, 0xff8800);
  container.add(fuelLevel);

  // "F" label
  const label = scene.add.text(0, 0, 'F', {
    fontFamily: 'monospace',
    fontSize: '10px',
    color: '#000000',
    fontStyle: 'bold',
  }).setOrigin(0.5);
  container.add(label);

  container.setSize(canWidth, canHeight + 4);
  return container;
}

/**
 * Collectible color constants.
 */
export const COLLECTIBLE_COLORS = {
  coin: { fill: 0xffd700, stroke: 0xcc9900 },
  star: { fill: 0xffff00, stroke: 0xcccc00 },
  gem: { fill: 0x00ffff, stroke: 0x00cccc },
};

/**
 * Render a collectible (coin, star, gem).
 */
export function renderCollectible(
  scene: Phaser.Scene,
  type: 'coin' | 'star' | 'gem',
  value: number = 50
): Phaser.GameObjects.Container {
  const container = scene.add.container(0, 0);
  const size = 16;
  const colors = COLLECTIBLE_COLORS[type] ?? COLLECTIBLE_COLORS.coin;

  // Circle base
  const circle = scene.add.circle(0, 0, size / 2, colors.fill);
  circle.setStrokeStyle(2, colors.stroke);
  container.add(circle);

  // Type indicator
  let label = 'C';
  if (type === 'star') label = '*';
  else if (type === 'gem') label = 'G';

  const text = scene.add.text(0, 0, label, {
    fontFamily: 'monospace',
    fontSize: '10px',
    color: '#000000',
    fontStyle: 'bold',
  }).setOrigin(0.5);
  container.add(text);

  container.setSize(size, size);
  return container;
}
