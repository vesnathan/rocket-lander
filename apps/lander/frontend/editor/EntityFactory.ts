/**
 * @fileoverview Factory for creating visual representations of editor entities.
 * Uses the SAME rendering functions as the game for consistency.
 */

import type {
  EditorEntity,
  EditorTerrainBlock,
  EditorLandingPad,
  EditorFuelPickup,
  EditorCollectible,
  EditorMultiplierBubble,
  EditorHazard,
  EditorEnemy,
  EditorVisualEntity,
  EditorSpawnPoint,
} from './types';
import {
  renderTerrain,
  renderLandingPad,
  renderPatrolShip,
  renderMultiplierBubble,
  renderSpawnBubble,
  renderLaserField,
  renderBubbleGun,
  renderWarpZone,
  renderGravityWell,
  renderFuelPickup,
  renderCollectible,
} from '../rendering/EntityRenderer';

/**
 * Color constants for selection UI.
 */
const SELECTION_COLORS = {
  selection: 0x00ff00,
  resizeHandle: 0xffffff,
};

/**
 * Factory for creating visual representations of entities.
 * All visuals use the exact same rendering as the game.
 */
export class EntityFactory {
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * Create a visual entity from editor entity data.
   */
  createVisual(entity: EditorEntity): EditorVisualEntity {
    let container: Phaser.GameObjects.Container;

    switch (entity.entityType) {
      case 'terrain':
        container = this.createTerrainVisual(entity);
        break;
      case 'landingPad':
        container = this.createLandingPadVisual(entity);
        break;
      case 'fuelPickup':
        container = this.createFuelPickupVisual(entity);
        break;
      case 'collectible':
        container = this.createCollectibleVisual(entity);
        break;
      case 'multiplierBubble':
        container = this.createMultiplierBubbleVisual(entity);
        break;
      case 'patrolShip':
        container = this.createPatrolShipVisual(entity);
        break;
      case 'laserField':
        container = this.createLaserFieldVisual(entity);
        break;
      case 'bubbleGun':
        container = this.createBubbleGunVisual(entity);
        break;
      case 'warpZone':
        container = this.createWarpZoneVisual(entity);
        break;
      case 'gravityWell':
        container = this.createGravityWellVisual(entity);
        break;
      case 'enemy':
        container = this.createEnemyVisual(entity);
        break;
      case 'spawnPoint':
        container = this.createSpawnPointVisual(entity);
        break;
      default:
        container = this.createDefaultVisual(entity);
    }

    // Make container interactive
    container.setInteractive(
      new Phaser.Geom.Rectangle(
        -container.width / 2,
        -container.height / 2,
        container.width,
        container.height
      ),
      Phaser.Geom.Rectangle.Contains
    );

    // Store editor ID
    container.setData('editorId', entity.editorId);
    container.setData('entityType', entity.entityType);

    return {
      editorId: entity.editorId,
      entityType: entity.entityType,
      container,
    };
  }

  /**
   * Create terrain block visual using shared renderer.
   */
  private createTerrainVisual(entity: EditorTerrainBlock): Phaser.GameObjects.Container {
    const { width, height } = entity;
    // renderTerrain creates container centered at (x + width/2, y + height/2)
    // We need to reset position since LevelEditorScene handles positioning
    const container = renderTerrain(this.scene, 0, 0, width, height);
    container.setPosition(0, 0);
    return container;
  }

  /**
   * Create landing pad visual using shared renderer.
   */
  private createLandingPadVisual(entity: EditorLandingPad): Phaser.GameObjects.Container {
    const { width, height, primary } = entity;
    // renderLandingPad creates container centered at (x + width/2, y + height/2)
    const { container } = renderLandingPad(this.scene, 0, 0, width, height, primary);
    container.setPosition(0, 0);
    return container;
  }

  /**
   * Create fuel pickup visual using shared renderer.
   */
  private createFuelPickupVisual(entity: EditorFuelPickup): Phaser.GameObjects.Container {
    return renderFuelPickup(this.scene, entity.amount);
  }

  /**
   * Create collectible visual using shared renderer.
   */
  private createCollectibleVisual(entity: EditorCollectible): Phaser.GameObjects.Container {
    return renderCollectible(this.scene, entity.type, entity.value);
  }

  /**
   * Create multiplier bubble visual using shared renderer.
   */
  private createMultiplierBubbleVisual(entity: EditorMultiplierBubble): Phaser.GameObjects.Container {
    return renderMultiplierBubble(this.scene, entity.value, entity.color);
  }

  /**
   * Create patrol ship visual using shared renderer.
   */
  private createPatrolShipVisual(entity: EditorHazard): Phaser.GameObjects.Container {
    const data = entity.data as any;
    const { width, height } = data;
    return renderPatrolShip(this.scene, width, height);
  }

  /**
   * Create laser field visual using shared renderer.
   */
  private createLaserFieldVisual(entity: EditorHazard): Phaser.GameObjects.Container {
    const data = entity.data as any;
    return renderLaserField(this.scene, {
      emitterX: data.emitterX,
      emitterY: data.emitterY,
      receiverX: data.receiverX,
      receiverY: data.receiverY,
      length: data.length,
      angle: data.angle,
      width: data.width,
    });
  }

  /**
   * Create bubble gun visual using shared renderer.
   */
  private createBubbleGunVisual(entity: EditorHazard): Phaser.GameObjects.Container {
    const data = entity.data as any;
    return renderBubbleGun(this.scene, data.direction, data.bubbleType);
  }

  /**
   * Create warp zone visual using shared renderer.
   */
  private createWarpZoneVisual(entity: EditorHazard): Phaser.GameObjects.Container {
    const data = entity.data as any;
    return renderWarpZone(this.scene, data.width, data.height, data.color);
  }

  /**
   * Create gravity well visual using shared renderer.
   */
  private createGravityWellVisual(entity: EditorHazard): Phaser.GameObjects.Container {
    const data = entity.data as any;
    return renderGravityWell(this.scene, data.radius, data.strength, data.color);
  }

  /**
   * Create enemy visual.
   */
  private createEnemyVisual(entity: EditorEnemy): Phaser.GameObjects.Container {
    const container = this.scene.add.container(0, 0);
    const size = 24;

    // Enemy body (triangle pointing in facing direction)
    const triangle = this.scene.add.triangle(0, 0, 0, -size/2, -size/2, size/2, size/2, size/2, 0xff4444);
    triangle.setStrokeStyle(2, 0xff6666);
    container.add(triangle);

    // Eye
    const eye = this.scene.add.circle(0, -2, 4, 0xffffff);
    container.add(eye);
    const pupil = this.scene.add.circle(0, -2, 2, 0x000000);
    container.add(pupil);

    // Type label
    const typeLabel = entity.data.type.charAt(0).toUpperCase();
    const label = this.scene.add.text(0, size/2 + 8, typeLabel, {
      fontSize: '8px',
      color: '#ff6666',
    }).setOrigin(0.5);
    container.add(label);

    container.setSize(size, size);
    return container;
  }

  /**
   * Create spawn point visual using shared renderer.
   */
  private createSpawnPointVisual(entity: EditorSpawnPoint): Phaser.GameObjects.Container {
    const container = this.scene.add.container(0, 0);

    // Get bubble color from entity (default to green)
    const bubbleColor = entity.bubbleColor ?? 'green';
    const { bubble, glow } = renderSpawnBubble(this.scene, bubbleColor);

    // Add to container
    container.add(glow);
    container.add(bubble);

    // Draw rocket inside the bubble (same as game but static)
    const graphics = this.scene.add.graphics();
    const scale = 0.7;

    // Main body (white/gray)
    graphics.fillStyle(0xe8e8e8);
    graphics.fillRect(-5 * scale, -10 * scale, 10 * scale, 18 * scale);

    // Nose cone (red)
    graphics.fillStyle(0xff4444);
    graphics.fillTriangle(
      0, -16 * scale,
      -5 * scale, -10 * scale,
      5 * scale, -10 * scale
    );

    // Window (blue)
    graphics.fillStyle(0x66ccff);
    graphics.fillCircle(0, -5 * scale, 3 * scale);

    // Red stripe
    graphics.fillStyle(0xff4444);
    graphics.fillRect(-5 * scale, 2 * scale, 10 * scale, 2 * scale);

    // Fins (gray)
    graphics.fillStyle(0x888888);
    graphics.fillTriangle(
      -5 * scale, 6 * scale,
      -9 * scale, 10 * scale,
      -5 * scale, 0
    );
    graphics.fillTriangle(
      5 * scale, 6 * scale,
      9 * scale, 10 * scale,
      5 * scale, 0
    );

    // Engine (dark)
    graphics.fillStyle(0x444444);
    graphics.fillRect(-3 * scale, 8 * scale, 6 * scale, 3 * scale);

    container.add(graphics);

    container.setSize(48, 48);
    return container;
  }

  /**
   * Create default visual for unknown types.
   */
  private createDefaultVisual(_entity: EditorEntity): Phaser.GameObjects.Container {
    const container = this.scene.add.container(0, 0);
    const size = 30;

    const rect = this.scene.add.rectangle(0, 0, size, size, 0x888888);
    rect.setStrokeStyle(2, 0xffffff);
    container.add(rect);

    const label = this.scene.add.text(0, 0, '?', {
      fontSize: '16px',
      color: '#ffffff',
    }).setOrigin(0.5);
    container.add(label);

    container.setSize(size, size);
    return container;
  }

  /**
   * Create selection box for an entity.
   */
  createSelectionBox(visual: EditorVisualEntity): Phaser.GameObjects.Rectangle {
    const { container } = visual;

    // Check for bounds offset (used by laser fields and other asymmetric entities)
    const boundsOffsetX = container.getData('boundsOffsetX') ?? 0;
    const boundsOffsetY = container.getData('boundsOffsetY') ?? 0;

    const box = this.scene.add.rectangle(
      container.x + boundsOffsetX,
      container.y + boundsOffsetY,
      container.width + 8,
      container.height + 8
    );
    box.setStrokeStyle(2, SELECTION_COLORS.selection);
    box.setFillStyle(0x000000, 0);
    box.setDepth(1000);
    return box;
  }

  /**
   * Create resize handles for an entity.
   */
  createResizeHandles(visual: EditorVisualEntity): Phaser.GameObjects.Rectangle[] {
    const { container } = visual;
    const handles: Phaser.GameObjects.Rectangle[] = [];
    const handleSize = 8;
    const halfW = container.width / 2;
    const halfH = container.height / 2;

    const positions = [
      { x: -halfW, y: -halfH, name: 'nw' },
      { x: halfW, y: -halfH, name: 'ne' },
      { x: -halfW, y: halfH, name: 'sw' },
      { x: halfW, y: halfH, name: 'se' },
    ];

    for (const pos of positions) {
      const handle = this.scene.add.rectangle(
        container.x + pos.x,
        container.y + pos.y,
        handleSize,
        handleSize,
        SELECTION_COLORS.resizeHandle
      );
      handle.setStrokeStyle(1, SELECTION_COLORS.selection);
      handle.setInteractive({ useHandCursor: true });
      handle.setData('handleType', pos.name);
      handle.setDepth(1001);
      handles.push(handle);
    }

    return handles;
  }
}
