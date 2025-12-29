/**
 * @fileoverview Level Editor Scene for creating and editing levels.
 */

import * as Phaser from 'phaser';
import type { Level } from '@shared/types/Level';
import { getLevel, TOTAL_LEVELS } from '../levels/levels';
import {
  EditorStateManager,
  createDefaultEditorState,
  levelToEditorState,
  editorStateToLevel,
  generateEditorId,
} from '../editor/EditorState';
import { EntityFactory } from '../editor/EntityFactory';
import type {
  EditorEntity,
  EditorEntityType,
  EditorVisualEntity,
  PaletteItem,
  SelectionState,
  EditorMode,
  EditorHazard,
  EditorEnemy,
} from '../editor/types';

/**
 * Palette items for the toolbox.
 */
const PALETTE_ITEMS: PaletteItem[] = [
  { type: 'terrain', label: 'Terrain', icon: 'T', color: 0x4a4a5a, defaultWidth: 20, defaultHeight: 20 },
  { type: 'landingPad', label: 'Landing Pad', icon: 'P', color: 0x00ff44, defaultWidth: 100, defaultHeight: 20 },
  { type: 'patrolShip', label: 'Patrol Ship', icon: 'C', color: 0xff6600, defaultWidth: 40, defaultHeight: 40 },
  { type: 'laserField', label: 'Laser', icon: 'L', color: 0xff0000, defaultWidth: 200, defaultHeight: 6 },
  { type: 'bubbleGun', label: 'Bubble Gun', icon: 'B', color: 0x4488ff },
  { type: 'warpZone', label: 'Warp Zone', icon: 'W', color: 0x8844ff, defaultWidth: 50, defaultHeight: 60 },
  { type: 'gravityWell', label: 'Gravity Well', icon: 'G', color: 0x4444ff },
  { type: 'multiplierBubble', label: 'Multiplier', icon: 'x', color: 0xffd700 },
  { type: 'spawnPoint', label: 'Spawn', icon: 'S', color: 0x00ff88 },
];

/**
 * Layout constants.
 */
const LAYOUT = {
  canvasX: 120,
  canvasY: 20,
  canvasWidth: 640,
  canvasHeight: 356,
  paletteX: 55,
  paletteWidth: 100,
  propsX: 840,
  propsWidth: 120,
  metadataHeight: 40,
  actionBarHeight: 40,
};

/**
 * Level Editor Scene.
 */
export class LevelEditorScene extends Phaser.Scene {
  // State management
  private stateManager!: EditorStateManager;
  private entityFactory!: EntityFactory;

  // Visual entities
  private visualEntities: Map<string, EditorVisualEntity> = new Map();

  // Selection
  private selection: SelectionState = {
    selectedId: null,
    isDragging: false,
    isResizing: false,
    resizeHandle: null,
    dragStartX: 0,
    dragStartY: 0,
    entityStartX: 0,
    entityStartY: 0,
    entityStartWidth: 0,
    entityStartHeight: 0,
  };
  private selectionBox: Phaser.GameObjects.Rectangle | null = null;
  private resizeHandles: Phaser.GameObjects.Rectangle[] = [];

  // UI elements
  private gridGraphics!: Phaser.GameObjects.Graphics;
  private canvasBorder!: Phaser.GameObjects.Rectangle;
  private paletteItems: Phaser.GameObjects.Container[] = [];
  private uiContainer!: Phaser.GameObjects.Container;
  private levelContainer!: Phaser.GameObjects.Container;
  private canvasMask!: Phaser.Display.Masks.GeometryMask;

  // Scrolling for tall levels
  private editorScrollY: number = 0;

  // Settings
  private gridSize: number = 10;
  private snapToGrid: boolean = true;
  private mode: EditorMode = 'edit';

  // UI text elements
  private levelNameText!: Phaser.GameObjects.Text;
  private gravityText!: Phaser.GameObjects.Text;
  private fuelText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private propsText!: Phaser.GameObjects.Text;
  private tooltip!: Phaser.GameObjects.Container;
  private propsControls: Phaser.GameObjects.GameObject[] = [];

  // Dragging from palette
  private isDraggingFromPalette: boolean = false;
  private paletteGhost: Phaser.GameObjects.Container | null = null;
  private paletteItemType: EditorEntityType | null = null;

  constructor() {
    super({ key: 'LevelEditorScene' });
  }

  init(data?: { level?: Level; levelNumber?: number; editorState?: any }): void {
    // Initialize state - prefer editorState if returning from test mode
    if (data?.editorState) {
      this.stateManager = new EditorStateManager(data.editorState);
    } else if (data?.level) {
      this.stateManager = new EditorStateManager(levelToEditorState(data.level));
    } else if (data?.levelNumber) {
      const level = getLevel(data.levelNumber);
      if (level) {
        this.stateManager = new EditorStateManager(levelToEditorState(level));
      } else {
        this.stateManager = new EditorStateManager(createDefaultEditorState());
      }
    } else {
      this.stateManager = new EditorStateManager(createDefaultEditorState());
    }
  }

  create(): void {
    this.entityFactory = new EntityFactory(this);

    // Create UI
    this.createBackground();
    this.createGrid();
    this.createPalette();
    this.createMetadataBar();
    this.createActionBar();
    this.createPropertiesPanel();

    // Load entities from state
    this.loadEntitiesFromState();

    // Setup input
    this.setupInput();

    // Update UI
    this.updateUI();
  }

  /**
   * Create background.
   */
  private createBackground(): void {
    // Dark background for whole scene
    this.add.rectangle(600, 350, 1200, 700, 0x1a1a2e).setDepth(-10);

    // Canvas area background (matches level background)
    const state = this.stateManager.getState();
    const bgColor = Phaser.Display.Color.HexStringToColor(state.backgroundColor).color;
    this.add.rectangle(
      LAYOUT.canvasX + LAYOUT.canvasWidth / 2,
      LAYOUT.canvasY + LAYOUT.canvasHeight / 2,
      LAYOUT.canvasWidth,
      LAYOUT.canvasHeight,
      bgColor
    ).setDepth(-5);

    // Canvas border
    this.canvasBorder = this.add.rectangle(
      LAYOUT.canvasX + LAYOUT.canvasWidth / 2,
      LAYOUT.canvasY + LAYOUT.canvasHeight / 2,
      LAYOUT.canvasWidth + 4,
      LAYOUT.canvasHeight + 4
    );
    this.canvasBorder.setStrokeStyle(2, 0x4444ff);
    this.canvasBorder.setFillStyle(0x000000, 0);
    this.canvasBorder.setDepth(-4);

    // Create mask shape for clipping visuals to canvas area
    const maskShape = this.make.graphics({ x: 0, y: 0 });
    maskShape.fillStyle(0xffffff);
    maskShape.fillRect(LAYOUT.canvasX, LAYOUT.canvasY, LAYOUT.canvasWidth, LAYOUT.canvasHeight);
    this.canvasMask = maskShape.createGeometryMask();

    // Create container for all level entity visuals (will be masked)
    this.levelContainer = this.add.container(0, 0);
    this.levelContainer.setMask(this.canvasMask);
    this.levelContainer.setDepth(0);
  }

  /**
   * Create grid overlay.
   */
  private createGrid(): void {
    this.gridGraphics = this.add.graphics();
    this.gridGraphics.setDepth(-3);
    this.drawGrid();
  }

  /**
   * Draw grid lines.
   */
  private drawGrid(): void {
    this.gridGraphics.clear();

    if (!this.snapToGrid) return;

    this.gridGraphics.lineStyle(1, 0x333344, 0.3);

    // Vertical lines
    for (let x = LAYOUT.canvasX; x <= LAYOUT.canvasX + LAYOUT.canvasWidth; x += this.gridSize) {
      this.gridGraphics.lineBetween(x, LAYOUT.canvasY, x, LAYOUT.canvasY + LAYOUT.canvasHeight);
    }

    // Horizontal lines
    for (let y = LAYOUT.canvasY; y <= LAYOUT.canvasY + LAYOUT.canvasHeight; y += this.gridSize) {
      this.gridGraphics.lineBetween(LAYOUT.canvasX, y, LAYOUT.canvasX + LAYOUT.canvasWidth, y);
    }
  }

  /**
   * Create palette panel.
   */
  private createPalette(): void {
    const startX = LAYOUT.paletteX;
    const startY = LAYOUT.canvasY + 40;
    const itemSize = 38;
    const padding = 6;

    // Panel background - constrained to fit within canvas + bars area
    const panelHeight = LAYOUT.canvasHeight + 72; // Align with action bar bottom
    this.add.rectangle(LAYOUT.paletteX, LAYOUT.canvasY + panelHeight / 2, LAYOUT.paletteWidth, panelHeight, 0x222233, 0.9)
      .setStrokeStyle(2, 0x4444ff);

    // Title
    this.add.text(LAYOUT.paletteX, LAYOUT.canvasY + 12, 'TOOLS', {
      fontSize: '14px',
      color: '#8888ff',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    // Create tooltip (shared across all palette items)
    this.tooltip = this.add.container(0, 0);
    this.tooltip.setDepth(5000);
    this.tooltip.setVisible(false);

    const tooltipBg = this.add.rectangle(0, 0, 120, 28, 0x222233, 0.95);
    tooltipBg.setStrokeStyle(2, 0x4488ff);
    this.tooltip.add(tooltipBg);

    const tooltipText = this.add.text(0, 0, '', {
      fontSize: '14px',
      color: '#ffffff',
      fontFamily: 'monospace',
    }).setOrigin(0.5);
    this.tooltip.add(tooltipText);
    this.tooltip.setData('text', tooltipText);
    this.tooltip.setData('bg', tooltipBg);

    // Create palette items
    PALETTE_ITEMS.forEach((item, index) => {
      const y = startY + index * (itemSize + padding);

      const container = this.add.container(startX, y);

      // Background
      const bg = this.add.rectangle(0, 0, itemSize + 4, itemSize + 4, 0x333344);
      bg.setStrokeStyle(2, item.color);
      bg.setInteractive({ useHandCursor: true });
      container.add(bg);

      // Create mini icon graphics based on type
      const icon = this.createPaletteIcon(item.type, itemSize);
      container.add(icon);

      // Store item data
      container.setData('paletteItem', item);

      // Make draggable
      this.input.setDraggable(bg);

      // Hover effect - show tooltip
      bg.on('pointerover', () => {
        bg.setFillStyle(0x444466);

        // Update and show tooltip
        const text = this.tooltip.getData('text') as Phaser.GameObjects.Text;
        const bgRect = this.tooltip.getData('bg') as Phaser.GameObjects.Rectangle;
        text.setText(item.label);

        // Resize background to fit text
        const textWidth = text.width + 16;
        bgRect.setSize(Math.max(textWidth, 60), 20);

        // Position tooltip to the right of the item
        this.tooltip.setPosition(startX + itemSize / 2 + textWidth / 2 + 8, y);
        this.tooltip.setVisible(true);
      });

      bg.on('pointerout', () => {
        bg.setFillStyle(0x333344);
        this.tooltip.setVisible(false);
      });

      this.paletteItems.push(container);
    });
  }

  /**
   * Create a mini icon for the palette based on entity type.
   */
  private createPaletteIcon(type: EditorEntityType, size: number): Phaser.GameObjects.Graphics | Phaser.GameObjects.Container {
    const g = this.add.graphics();
    const half = size / 2;

    switch (type) {
      case 'terrain': {
        // Metallic gray square block with rivets
        const blockSize = 20;
        const bh = blockSize / 2;
        g.fillStyle(0x4a4a5a);
        g.fillRect(-bh, -bh, blockSize, blockSize);
        g.lineStyle(1, 0x6a6a7a);
        g.strokeRect(-bh, -bh, blockSize, blockSize);
        // Top highlight
        g.lineStyle(1, 0x7a7a8a);
        g.lineBetween(-bh + 1, -bh + 1, bh - 1, -bh + 1);
        // Rivets in corners
        g.fillStyle(0x3a3a4a);
        g.fillCircle(-bh + 3, -bh + 3, 1.5);
        g.fillCircle(bh - 3, -bh + 3, 1.5);
        g.fillCircle(-bh + 3, bh - 3, 1.5);
        g.fillCircle(bh - 3, bh - 3, 1.5);
        break;
      }

      case 'landingPad': {
        // Green landing pad with stripes
        g.fillStyle(0x004422);
        g.fillRect(-half + 2, -4, size - 4, 8);
        g.lineStyle(1, 0x00ff44);
        g.strokeRect(-half + 2, -4, size - 4, 8);
        // Landing stripes (chevrons)
        g.lineStyle(1, 0x00ff44, 0.6);
        for (let i = 0; i < 3; i++) {
          const x = -half + 8 + i * 8;
          g.lineBetween(x, 2, x + 3, -2);
          g.lineBetween(x + 3, -2, x + 6, 2);
        }
        // Landing lights
        g.fillStyle(0x00ff44);
        g.fillCircle(-half + 4, 0, 2);
        g.fillCircle(half - 4, 0, 2);
        break;
      }

      case 'patrolShip': {
        // Patrol ship (simplified rocket shape)
        const shipScale = 0.45;
        // Main body
        g.fillStyle(0x882222);
        g.fillRect(-6 * shipScale, -10 * shipScale, 12 * shipScale, 20 * shipScale);
        // Nose cone
        g.fillStyle(0x222222);
        g.fillTriangle(
          0, -14 * shipScale,
          -6 * shipScale, -10 * shipScale,
          6 * shipScale, -10 * shipScale
        );
        // Cockpit (red menacing)
        g.fillStyle(0xff2222);
        g.fillCircle(0, -6 * shipScale, 3 * shipScale);
        // Yellow warning stripe
        g.fillStyle(0xffcc00);
        g.fillRect(-6 * shipScale, 4 * shipScale, 12 * shipScale, 2 * shipScale);
        // Fins
        g.fillStyle(0x661111);
        g.fillTriangle(
          -6 * shipScale, 10 * shipScale,
          -10 * shipScale, 14 * shipScale,
          -6 * shipScale, 4 * shipScale
        );
        g.fillTriangle(
          6 * shipScale, 10 * shipScale,
          10 * shipScale, 14 * shipScale,
          6 * shipScale, 4 * shipScale
        );
        break;
      }

      case 'laserField': {
        // Emitter boxes with laser beam
        const emitterSize = 6;
        // Left emitter
        g.fillStyle(0x445566);
        g.fillRect(-half + 2, -emitterSize / 2, emitterSize, emitterSize);
        g.lineStyle(1, 0x667788);
        g.strokeRect(-half + 2, -emitterSize / 2, emitterSize, emitterSize);
        // Right emitter
        g.fillRect(half - 2 - emitterSize, -emitterSize / 2, emitterSize, emitterSize);
        g.strokeRect(half - 2 - emitterSize, -emitterSize / 2, emitterSize, emitterSize);
        // Laser beam
        g.fillStyle(0xff0000, 0.9);
        g.fillRect(-half + 2 + emitterSize, -1, size - 4 - emitterSize * 2, 3);
        // Glow indicators
        g.fillStyle(0xff0000);
        g.fillCircle(-half + 5, 0, 2);
        g.fillCircle(half - 5, 0, 2);
        break;
      }

      case 'bubbleGun': {
        // Gun body with barrel
        const gunRadius = 8;
        g.fillStyle(0x2244aa);
        g.fillCircle(0, 0, gunRadius);
        g.lineStyle(2, 0x4488ff);
        g.strokeCircle(0, 0, gunRadius);
        // Barrel pointing right
        g.fillStyle(0x2244aa);
        g.fillRect(gunRadius - 2, -3, 8, 6);
        // Muzzle
        g.fillStyle(0x4488ff);
        g.fillCircle(gunRadius + 5, 0, 3);
        break;
      }

      case 'warpZone': {
        // Purple portal with swirl
        g.fillStyle(0x8844ff, 0.3);
        g.fillRect(-10, -12, 20, 24);
        g.lineStyle(2, 0x8844ff);
        g.strokeRect(-10, -12, 20, 24);
        // Inner swirl ellipses
        g.lineStyle(1, 0xaa66ff, 0.5);
        g.strokeEllipse(0, 0, 12, 6);
        g.strokeEllipse(0, 0, 8, 10);
        // Center light
        g.fillStyle(0xffffff, 0.8);
        g.fillCircle(0, 0, 3);
        break;
      }

      case 'gravityWell': {
        // Concentric circles
        g.lineStyle(1, 0x4444ff, 0.3);
        g.strokeCircle(0, 0, 12);
        g.lineStyle(1, 0x4444ff, 0.4);
        g.strokeCircle(0, 0, 8);
        g.lineStyle(1, 0x4444ff, 0.5);
        g.strokeCircle(0, 0, 4);
        // Core
        g.fillStyle(0x4444ff, 0.8);
        g.fillCircle(0, 0, 3);
        break;
      }

      case 'fuelPickup': {
        // Yellow fuel canister
        const canW = 10;
        const canH = 14;
        g.fillStyle(0xffcc00);
        g.fillRect(-canW / 2, -canH / 2, canW, canH);
        g.lineStyle(1, 0xffaa00);
        g.strokeRect(-canW / 2, -canH / 2, canW, canH);
        // Top cap
        g.fillStyle(0xccaa00);
        g.fillRect(-canW / 2 + 2, -canH / 2 - 2, canW - 4, 3);
        // Fuel level indicator
        g.fillStyle(0xff8800);
        g.fillRect(-canW / 2 + 2, -canH / 2 + 4, canW - 4, canH - 6);
        // "F" label
        g.fillStyle(0x000000);
        g.fillRect(-2, -3, 4, 1);
        g.fillRect(-2, -3, 1, 6);
        g.fillRect(-2, 0, 3, 1);
        break;
      }

      case 'collectible': {
        // Gold coin
        const coinRadius = 10;
        // Outer ring
        g.fillStyle(0xffd700);
        g.fillCircle(0, 0, coinRadius);
        g.lineStyle(2, 0xcc9900);
        g.strokeCircle(0, 0, coinRadius);
        // Inner ring
        g.lineStyle(1, 0xffaa00);
        g.strokeCircle(0, 0, coinRadius - 3);
        // Highlight
        g.fillStyle(0xffee88, 0.5);
        g.fillCircle(-3, -3, 3);
        break;
      }

      case 'multiplierBubble': {
        // Hexagon with value
        const hexRadius = 10;
        const hexPoints: { x: number; y: number }[] = [];
        for (let i = 0; i < 6; i++) {
          const angle = (Math.PI / 3) * i - Math.PI / 6;
          hexPoints.push({
            x: Math.cos(angle) * hexRadius,
            y: Math.sin(angle) * hexRadius,
          });
        }
        // Outer glow
        g.fillStyle(0xffd700, 0.3);
        g.beginPath();
        g.moveTo(hexPoints[0].x * 1.2, hexPoints[0].y * 1.2);
        for (let i = 1; i < 6; i++) {
          g.lineTo(hexPoints[i].x * 1.2, hexPoints[i].y * 1.2);
        }
        g.closePath();
        g.fillPath();
        // Main hexagon
        g.fillStyle(0xffd700, 0.85);
        g.beginPath();
        g.moveTo(hexPoints[0].x, hexPoints[0].y);
        for (let i = 1; i < 6; i++) {
          g.lineTo(hexPoints[i].x, hexPoints[i].y);
        }
        g.closePath();
        g.fillPath();
        g.lineStyle(1, 0xffffff, 0.6);
        g.strokePath();
        break;
      }

      case 'spawnPoint': {
        // Ship in start bubble
        const bubbleR = 14;
        // Outer bubble
        g.lineStyle(2, 0x00ff88, 0.8);
        g.strokeCircle(0, 0, bubbleR);
        g.fillStyle(0x00ff88, 0.15);
        g.fillCircle(0, 0, bubbleR);

        // Mini rocket inside
        const rs = 0.4;
        // Main body
        g.fillStyle(0xe8e8e8);
        g.fillRect(-5 * rs, -10 * rs, 10 * rs, 16 * rs);
        // Nose cone
        g.fillStyle(0xff4444);
        g.fillTriangle(0, -14 * rs, -5 * rs, -10 * rs, 5 * rs, -10 * rs);
        // Window
        g.fillStyle(0x66ccff);
        g.fillCircle(0, -5 * rs, 2.5 * rs);
        // Fins
        g.fillStyle(0x888888);
        g.fillTriangle(-5 * rs, 4 * rs, -8 * rs, 8 * rs, -5 * rs, 0);
        g.fillTriangle(5 * rs, 4 * rs, 8 * rs, 8 * rs, 5 * rs, 0);
        break;
      }
    }

    return g;
  }

  /**
   * Create metadata bar.
   */
  private createMetadataBar(): void {
    const centerX = LAYOUT.canvasX + LAYOUT.canvasWidth / 2;
    const y = LAYOUT.canvasY + LAYOUT.canvasHeight + 20;

    // Background
    this.add.rectangle(centerX, y, LAYOUT.canvasWidth, 30, 0x222233, 0.9)
      .setStrokeStyle(1, 0x333344);

    // Level name (clickable to edit)
    this.add.text(centerX - 220, y, 'Name:', {
      fontSize: '14px',
      color: '#888888',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    // Clickable background for level name
    const nameBox = this.add.rectangle(centerX - 80, y, 160, 24, 0x333344);
    nameBox.setStrokeStyle(1, 0x4488ff);
    nameBox.setInteractive({ useHandCursor: true });
    nameBox.on('pointerover', () => nameBox.setFillStyle(0x444466));
    nameBox.on('pointerout', () => nameBox.setFillStyle(0x333344));
    nameBox.on('pointerdown', () => this.showNameEditDialog());

    this.levelNameText = this.add.text(centerX - 80, y, '', {
      fontSize: '14px',
      color: '#44ddff',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    // Gravity
    this.add.text(centerX + 80, y, 'Gravity:', {
      fontSize: '14px',
      color: '#888888',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.gravityText = this.add.text(centerX + 140, y, '', {
      fontSize: '14px',
      color: '#ffffff',
      fontFamily: 'monospace',
    }).setOrigin(0, 0.5);

    // Placeholder for fuel (not displayed but kept for compatibility)
    this.fuelText = this.add.text(0, 0, '').setVisible(false);
  }

  /**
   * Create action bar.
   */
  private createActionBar(): void {
    const centerX = LAYOUT.canvasX + LAYOUT.canvasWidth / 2;
    const y = LAYOUT.canvasY + LAYOUT.canvasHeight + 55;

    // Background
    this.add.rectangle(centerX, y, LAYOUT.canvasWidth, 36, 0x222233, 0.9)
      .setStrokeStyle(1, 0x333344);

    const buttonY = y;
    const startX = LAYOUT.canvasX + 45;
    const spacing = 85;
    const buttons = [
      { x: startX, label: 'TEST', color: 0x44ff44, action: () => this.startTest() },
      { x: startX + spacing, label: 'EXPORT', color: 0x4488ff, action: () => this.exportLevel() },
      { x: startX + spacing * 2, label: 'CLEAR', color: 0xff4444, action: () => this.clearLevel() },
      { x: startX + spacing * 3, label: 'LEVELS', color: 0xffaa00, action: () => this.showLevelManager() },
      { x: startX + spacing * 4, label: this.snapToGrid ? 'GRID:ON' : 'GRID:OFF', color: 0x888888, action: () => this.toggleGrid() },
      { x: startX + spacing * 5, label: 'UNDO', color: 0x666688, action: () => this.undo() },
      { x: startX + spacing * 6, label: 'REDO', color: 0x666688, action: () => this.redo() },
    ];

    buttons.forEach(btn => {
      const bg = this.add.rectangle(btn.x, buttonY, 75, 26, 0x333344);
      bg.setStrokeStyle(2, btn.color);
      bg.setInteractive({ useHandCursor: true });

      const text = this.add.text(btn.x, buttonY, btn.label, {
        fontSize: '11px',
        color: '#ffffff',
        fontFamily: 'monospace',
      }).setOrigin(0.5);

      bg.on('pointerover', () => bg.setFillStyle(0x444466));
      bg.on('pointerout', () => bg.setFillStyle(0x333344));
      bg.on('pointerdown', btn.action);

      if (btn.label.startsWith('GRID')) {
        bg.setData('gridButton', true);
        text.setData('gridText', true);
      }
    });

    // Status text (hidden, not used)
    this.statusText = this.add.text(0, 0, '').setVisible(false);
  }

  /**
   * Create properties panel.
   */
  private createPropertiesPanel(): void {
    const x = LAYOUT.propsX;
    const panelHeight = LAYOUT.canvasHeight + 72; // Align with action bar bottom

    // Background
    this.add.rectangle(x, LAYOUT.canvasY + panelHeight / 2, LAYOUT.propsWidth, panelHeight, 0x222233, 0.9)
      .setStrokeStyle(2, 0x4444ff);

    // Title
    this.add.text(x, LAYOUT.canvasY + 12, 'PROPERTIES', {
      fontSize: '14px',
      color: '#8888ff',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    // Properties text (dynamic)
    this.propsText = this.add.text(x, LAYOUT.canvasY + 40, 'Select an\nobject', {
      fontSize: '12px',
      color: '#888888',
      align: 'center',
      fontFamily: 'monospace',
    }).setOrigin(0.5, 0);
  }

  /**
   * Load visual entities from state.
   */
  private loadEntitiesFromState(): void {
    // Clear existing visuals
    this.visualEntities.forEach(v => v.container.destroy());
    this.visualEntities.clear();

    const state = this.stateManager.getState();

    // Helper to add visual to masked container
    const addVisual = (visual: EditorVisualEntity) => {
      this.levelContainer.add(visual.container);
    };

    // Create spawn point visual
    const spawnVisual = this.entityFactory.createVisual({
      editorId: 'spawn-point',
      type: 'spawnPoint',
      x: state.spawnPoint.x,
      y: state.spawnPoint.y,
      bubbleColor: state.spawnPoint.bubbleColor ?? 'green',
    } as any);
    spawnVisual.container.x = state.spawnPoint.x + LAYOUT.canvasX;
    spawnVisual.container.y = state.spawnPoint.y + LAYOUT.canvasY;
    addVisual(spawnVisual);
    this.visualEntities.set('spawn-point', spawnVisual);

    // Create terrain visuals
    state.terrain.forEach(entity => {
      const visual = this.entityFactory.createVisual(entity);
      visual.container.x = entity.x + entity.width / 2 + LAYOUT.canvasX;
      visual.container.y = entity.y + entity.height / 2 + LAYOUT.canvasY;
      addVisual(visual);
      this.visualEntities.set(entity.editorId, visual);
    });

    // Create landing pad visuals
    state.landingPads.forEach(entity => {
      const visual = this.entityFactory.createVisual(entity);
      visual.container.x = entity.x + entity.width / 2 + LAYOUT.canvasX;
      visual.container.y = entity.y + entity.height / 2 + LAYOUT.canvasY;
      addVisual(visual);
      this.visualEntities.set(entity.editorId, visual);
    });

    // Create fuel pickup visuals
    state.fuelPickups.forEach(entity => {
      const visual = this.entityFactory.createVisual(entity);
      visual.container.x = entity.x + LAYOUT.canvasX;
      visual.container.y = entity.y + LAYOUT.canvasY;
      addVisual(visual);
      this.visualEntities.set(entity.editorId, visual);
    });

    // Create collectible visuals
    state.collectibles.forEach(entity => {
      const visual = this.entityFactory.createVisual(entity);
      visual.container.x = entity.x + LAYOUT.canvasX;
      visual.container.y = entity.y + LAYOUT.canvasY;
      addVisual(visual);
      this.visualEntities.set(entity.editorId, visual);
    });

    // Create multiplier bubble visuals
    state.multiplierBubbles.forEach(entity => {
      const visual = this.entityFactory.createVisual(entity);
      visual.container.x = entity.x + LAYOUT.canvasX;
      visual.container.y = entity.y + LAYOUT.canvasY;
      addVisual(visual);
      this.visualEntities.set(entity.editorId, visual);
    });

    // Create hazard visuals
    state.hazards.forEach(entity => {
      const visual = this.entityFactory.createVisual(entity);
      const data = entity.data as any;
      if (data.width && data.height) {
        visual.container.x = data.x + data.width / 2 + LAYOUT.canvasX;
        visual.container.y = data.y + data.height / 2 + LAYOUT.canvasY;
      } else {
        visual.container.x = data.x + LAYOUT.canvasX;
        visual.container.y = data.y + LAYOUT.canvasY;
      }
      addVisual(visual);
      this.visualEntities.set(entity.editorId, visual);
    });

    // Create enemy visuals
    state.enemies.forEach(entity => {
      const visual = this.entityFactory.createVisual(entity);
      visual.container.x = entity.data.x + LAYOUT.canvasX;
      visual.container.y = entity.data.y + LAYOUT.canvasY;
      addVisual(visual);
      this.visualEntities.set(entity.editorId, visual);
    });
  }

  /**
   * Setup input handling.
   */
  private setupInput(): void {
    // Click to select
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.isDraggingFromPalette) return;

      // Check if clicking on canvas
      if (this.isInCanvas(pointer.x, pointer.y)) {
        // Check if clicking on an entity
        const clicked = this.getEntityAtPoint(pointer.x, pointer.y);
        if (clicked) {
          this.selectEntity(clicked);
          this.selection.isDragging = true;
          this.selection.dragStartX = pointer.x;
          this.selection.dragStartY = pointer.y;

          // Handle spawn point specially
          if (clicked === 'spawn-point') {
            const state = this.stateManager.getState();
            this.selection.entityStartX = state.spawnPoint.x;
            this.selection.entityStartY = state.spawnPoint.y;
          } else {
            const entity = this.stateManager.getEntityById(clicked);
            if (entity && 'x' in entity) {
              this.selection.entityStartX = (entity as any).x;
              this.selection.entityStartY = (entity as any).y;
            }
          }
        } else {
          // Clicking empty canvas selects the stage
          this.selectStage();
        }
      }
    });

    // Dragging
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.isDraggingFromPalette && this.paletteGhost) {
        this.paletteGhost.x = pointer.x;
        this.paletteGhost.y = pointer.y;
        return;
      }

      if (this.selection.isDragging && this.selection.selectedId) {
        const dx = pointer.x - this.selection.dragStartX;
        const dy = pointer.y - this.selection.dragStartY;

        let newX = this.selection.entityStartX + dx;
        let newY = this.selection.entityStartY + dy;

        // Snap to grid
        if (this.snapToGrid) {
          newX = Math.round(newX / this.gridSize) * this.gridSize;
          newY = Math.round(newY / this.gridSize) * this.gridSize;
        }

        // Update visual position
        const visual = this.visualEntities.get(this.selection.selectedId);
        if (visual) {
          // Handle spawn point specially
          if (this.selection.selectedId === 'spawn-point') {
            visual.container.x = newX + LAYOUT.canvasX;
            visual.container.y = newY + LAYOUT.canvasY;

            // Update selection box
            if (this.selectionBox) {
              this.selectionBox.x = visual.container.x;
              this.selectionBox.y = visual.container.y;
            }

            // Update state quietly
            this.stateManager.updateSpawnPoint(newX, newY, true);
          } else {
            const entity = this.stateManager.getEntityById(this.selection.selectedId);
            if (entity) {
              if ('width' in entity && 'height' in entity) {
                visual.container.x = newX + (entity as any).width / 2 + LAYOUT.canvasX;
                visual.container.y = newY + (entity as any).height / 2 + LAYOUT.canvasY;
              } else {
                visual.container.x = newX + LAYOUT.canvasX;
                visual.container.y = newY + LAYOUT.canvasY;
              }

              // Update selection box
              if (this.selectionBox) {
                this.selectionBox.x = visual.container.x;
                this.selectionBox.y = visual.container.y;
              }
            }

            // Update state quietly (no history push)
            this.stateManager.updateEntityPosition(this.selection.selectedId, newX, newY, true);
          }
        }

        this.updatePropertiesPanel();
      }
    });

    // End drag
    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (this.isDraggingFromPalette && this.paletteItemType) {
        // Create new entity at drop location
        if (this.isInCanvas(pointer.x, pointer.y)) {
          const canvasX = pointer.x - LAYOUT.canvasX;
          // Account for scroll offset when creating entities
          const canvasY = pointer.y - LAYOUT.canvasY + this.editorScrollY;
          this.createEntityAt(this.paletteItemType, canvasX, canvasY);
        }

        // Clean up ghost
        if (this.paletteGhost) {
          this.paletteGhost.destroy();
          this.paletteGhost = null;
        }
        this.isDraggingFromPalette = false;
        this.paletteItemType = null;
        return;
      }

      if (this.selection.isDragging) {
        this.selection.isDragging = false;
        // Commit the position change to history
        this.stateManager.commitState();
      }
    });

    // Drag start from palette
    this.input.on('dragstart', (pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.GameObject) => {
      const parent = gameObject.parentContainer;
      if (parent && parent.getData('paletteItem')) {
        const item = parent.getData('paletteItem') as PaletteItem;
        this.isDraggingFromPalette = true;
        this.paletteItemType = item.type;

        // Create ghost
        this.paletteGhost = this.add.container(pointer.x, pointer.y);
        const ghost = this.add.rectangle(0, 0, item.defaultWidth ?? 30, item.defaultHeight ?? 30, item.color, 0.5);
        this.paletteGhost.add(ghost);
        this.paletteGhost.setDepth(2000);
      }
    });

    // Keyboard shortcuts
    this.input.keyboard?.on('keydown-DELETE', () => this.deleteSelected());
    this.input.keyboard?.on('keydown-BACKSPACE', () => this.deleteSelected());
    this.input.keyboard?.on('keydown-Z', (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey) this.undo();
    });
    this.input.keyboard?.on('keydown-Y', (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey) this.redo();
    });
    this.input.keyboard?.on('keydown-G', () => this.toggleGrid());
    this.input.keyboard?.on('keydown-ESC', () => this.deselectAll());

    // Mouse wheel scrolling for tall levels
    this.input.on('wheel', (pointer: Phaser.Input.Pointer, _gameObjects: any[], _deltaX: number, deltaY: number) => {
      if (this.isInCanvas(pointer.x, pointer.y)) {
        this.scrollEditor(deltaY);
      }
    });
  }

  /**
   * Scroll the editor canvas for tall levels.
   */
  private scrollEditor(deltaY: number): void {
    const state = this.stateManager.getState();
    const levelHeight = state.bounds.maxY - state.bounds.minY;
    const maxScroll = Math.max(0, levelHeight - LAYOUT.canvasHeight);

    // Update scroll position
    this.editorScrollY = Math.max(0, Math.min(maxScroll, this.editorScrollY + deltaY * 0.5));

    // Update level container position
    this.levelContainer.y = -this.editorScrollY;
  }

  /**
   * Check if point is within canvas bounds.
   */
  private isInCanvas(x: number, y: number): boolean {
    return x >= LAYOUT.canvasX &&
           x <= LAYOUT.canvasX + LAYOUT.canvasWidth &&
           y >= LAYOUT.canvasY &&
           y <= LAYOUT.canvasY + LAYOUT.canvasHeight;
  }

  /**
   * Get entity at screen point.
   */
  private getEntityAtPoint(x: number, y: number): string | null {
    // Account for scroll offset when checking entity positions
    const scrolledY = y + this.editorScrollY;

    for (const [editorId, visual] of this.visualEntities) {
      const container = visual.container;
      const halfW = container.width / 2;
      const halfH = container.height / 2;

      // Check if point is within container bounds (container.y is in level space)
      if (x >= container.x - halfW && x <= container.x + halfW &&
          scrolledY >= container.y - halfH && scrolledY <= container.y + halfH) {
        return editorId;
      }
    }
    return null;
  }

  /**
   * Select an entity.
   */
  private selectEntity(editorId: string): void {
    this.deselectAll();

    this.selection.selectedId = editorId;

    const visual = this.visualEntities.get(editorId);
    if (visual) {
      // Create selection box
      this.selectionBox = this.entityFactory.createSelectionBox(visual);

      // Create resize handles
      this.resizeHandles = this.entityFactory.createResizeHandles(visual);
    }

    this.updatePropertiesPanel();
  }

  /**
   * Deselect all entities.
   */
  private deselectAll(): void {
    this.selection.selectedId = null;

    if (this.selectionBox) {
      this.selectionBox.destroy();
      this.selectionBox = null;
    }

    this.resizeHandles.forEach(h => h.destroy());
    this.resizeHandles = [];

    this.updatePropertiesPanel();
  }

  /**
   * Select the stage itself (for editing stage properties like height).
   */
  private selectStage(): void {
    this.deselectAll();
    this.selection.selectedId = 'stage';
    this.updatePropertiesPanel();
  }

  /**
   * Set the stage height and update bounds.
   */
  private setStageHeight(height: number): void {
    const state = this.stateManager.getState();
    const oldHeight = state.bounds.maxY - state.bounds.minY;

    // Update bounds
    state.bounds.maxY = state.bounds.minY + height;

    // Update side wall terrain to match new height
    for (const terrain of state.terrain) {
      // Left wall (x=0, full height)
      if (terrain.x === 0 && terrain.width === 5 && terrain.height === oldHeight) {
        terrain.height = height;
      }
      // Right wall (x=635, full height)
      if (terrain.x === 635 && terrain.width === 5 && terrain.height === oldHeight) {
        terrain.height = height;
      }
      // Bottom wall - move to new bottom
      if (terrain.y === oldHeight - 5 && terrain.height === 5 && terrain.x === 5) {
        terrain.y = height - 5;
      }
    }

    this.stateManager.setState(state);

    // Reset scroll if current scroll would be out of bounds
    const maxScroll = Math.max(0, height - LAYOUT.canvasHeight);
    if (this.editorScrollY > maxScroll) {
      this.editorScrollY = maxScroll;
      this.levelContainer.y = -this.editorScrollY;
    }

    // Refresh all visuals
    this.refreshAllVisuals();
    this.updatePropertiesPanel();
  }

  /**
   * Create a new entity at position.
   */
  private createEntityAt(type: EditorEntityType, x: number, y: number): void {
    const snappedX = this.snapToGrid ? Math.round(x / this.gridSize) * this.gridSize : x;
    const snappedY = this.snapToGrid ? Math.round(y / this.gridSize) * this.gridSize : y;

    const editorId = generateEditorId();
    let entity: EditorEntity;

    switch (type) {
      case 'terrain':
        entity = {
          editorId,
          type: 'terrain',
          x: snappedX - 10,
          y: snappedY - 10,
          width: 20,
          height: 20,
        };
        break;

      case 'landingPad':
        entity = {
          editorId,
          type: 'landingPad',
          id: `pad-${Date.now()}`,
          x: snappedX - 50,
          y: snappedY - 10,
          width: 100,
          height: 20,
          primary: false,
          pointMultiplier: 1,
        };
        break;

      case 'fuelPickup':
        entity = {
          editorId,
          type: 'fuelPickup',
          x: snappedX,
          y: snappedY,
          amount: 20,
          oneTime: true,
        };
        break;

      case 'collectible':
        entity = {
          editorId,
          type: 'collectible',
          x: snappedX,
          y: snappedY,
          type: 'coin',
          value: 50,
        } as any;
        break;

      case 'multiplierBubble':
        entity = {
          editorId,
          type: 'multiplierBubble',
          id: `mult-${Date.now()}`,
          x: snappedX,
          y: snappedY,
          value: 2,
          color: 'bronze',
        };
        break;

      case 'patrolShip':
        entity = {
          editorId,
          type: 'patrolShip',
          data: {
            type: 'patrolShip',
            x: snappedX - 20,
            y: snappedY - 20,
            width: 40,
            height: 40,
            speed: 50,
            startDirection: 1,
          },
        } as EditorHazard;
        break;

      case 'laserField':
        // Create laser with emitter/receiver endpoints (default horizontal)
        entity = {
          editorId,
          type: 'laserField',
          data: {
            type: 'laserField',
            x: snappedX,
            y: snappedY,
            emitterX: -50,  // Relative to center
            emitterY: 0,
            receiverX: 50,
            receiverY: 0,
            width: 6,
            onDuration: 2000,
            offDuration: 2000,
            warningDuration: 500,
          },
        } as EditorHazard;
        break;

      case 'bubbleGun':
        entity = {
          editorId,
          type: 'bubbleGun',
          data: {
            type: 'bubbleGun',
            x: snappedX,
            y: snappedY,
            direction: 'right',
            bubbleType: 'blue',
            fireRate: 3000,
            bubbleSpeed: 60,
            bubbleDuration: 4000,
          },
        } as EditorHazard;
        break;

      case 'warpZone':
        entity = {
          editorId,
          type: 'warpZone',
          data: {
            type: 'warpZone',
            id: `warp-${Date.now()}`,
            targetId: '',
            x: snappedX - 25,
            y: snappedY - 30,
            width: 50,
            height: 60,
            color: 0x8844ff,
          },
        } as EditorHazard;
        break;

      case 'gravityWell':
        entity = {
          editorId,
          type: 'gravityWell',
          data: {
            type: 'gravityWell',
            x: snappedX,
            y: snappedY,
            radius: 100,
            strength: 100,
            affectsRocket: true,
            affectsBubble: true,
          },
        } as EditorHazard;
        break;

      case 'spawnPoint':
        // Update spawn point position (preserve bubble color)
        const state = this.stateManager.getState();
        state.spawnPoint = {
          x: snappedX,
          y: snappedY,
          bubbleColor: state.spawnPoint.bubbleColor ?? 'green',
        };
        this.stateManager.setState(state);

        // Update visual
        const spawnVisual = this.visualEntities.get('spawn-point');
        if (spawnVisual) {
          spawnVisual.container.x = snappedX + LAYOUT.canvasX;
          spawnVisual.container.y = snappedY + LAYOUT.canvasY;
        }
        return;

      default:
        return;
    }

    // Add to state
    this.stateManager.addEntity(entity);

    // Create visual
    const visual = this.entityFactory.createVisual(entity);
    if ('width' in entity && 'height' in entity) {
      visual.container.x = (entity as any).x + (entity as any).width / 2 + LAYOUT.canvasX;
      visual.container.y = (entity as any).y + (entity as any).height / 2 + LAYOUT.canvasY;
    } else if (entity.type === 'patrolShip' || entity.type === 'warpZone' || entity.type === 'gravityWell' ||
               entity.type === 'laserField' || entity.type === 'bubbleGun') {
      // Hazard types have position in entity.data
      const data = (entity as EditorHazard).data as any;
      visual.container.x = data.x + LAYOUT.canvasX;
      visual.container.y = data.y + LAYOUT.canvasY;
    } else {
      visual.container.x = (entity as any).x + LAYOUT.canvasX;
      visual.container.y = (entity as any).y + LAYOUT.canvasY;
    }

    // Add to masked level container
    this.levelContainer.add(visual.container);
    this.visualEntities.set(editorId, visual);

    // Select the new entity
    this.selectEntity(editorId);
  }

  /**
   * Delete selected entity.
   */
  private deleteSelected(): void {
    if (!this.selection.selectedId) return;
    if (this.selection.selectedId === 'spawn-point') return; // Can't delete spawn

    // Remove visual
    const visual = this.visualEntities.get(this.selection.selectedId);
    if (visual) {
      visual.container.destroy();
      this.visualEntities.delete(this.selection.selectedId);
    }

    // Remove from state
    this.stateManager.removeEntity(this.selection.selectedId);

    // Deselect
    this.deselectAll();
  }

  /**
   * Update properties panel.
   */
  private updatePropertiesPanel(): void {
    // Clear previous controls
    this.propsControls.forEach(c => c.destroy());
    this.propsControls = [];

    const x = LAYOUT.propsX;

    if (!this.selection.selectedId) {
      this.propsText.setText('Select an\nobject');
      return;
    }

    // Handle spawn point specially
    if (this.selection.selectedId === 'spawn-point') {
      const state = this.stateManager.getState();
      const currentColor = state.spawnPoint.bubbleColor ?? 'green';
      this.propsText.setText(`Type:\nSpawn Point\n\nX: ${Math.round(state.spawnPoint.x)}\nY: ${Math.round(state.spawnPoint.y)}\n\nBubble:`);

      // Add bubble color buttons
      const x = LAYOUT.propsX;
      const btnStartY = LAYOUT.canvasY + 180;
      const colors: Array<{ name: 'green' | 'white' | 'blue'; label: string; color: number }> = [
        { name: 'green', label: 'GREEN', color: 0x44ff88 },
        { name: 'white', label: 'WHITE', color: 0xeeeeff },
        { name: 'blue', label: 'BLUE', color: 0x4488ff },
      ];

      colors.forEach((c, i) => {
        const btnY = btnStartY + i * 36;
        const isSelected = currentColor === c.name;

        const btn = this.add.rectangle(x, btnY, 90, 28, isSelected ? 0x444466 : 0x333344);
        btn.setStrokeStyle(2, c.color);
        btn.setInteractive({ useHandCursor: true });

        const btnText = this.add.text(x, btnY, c.label, {
          fontSize: '12px',
          color: isSelected ? '#ffffff' : '#aaaaaa',
          fontFamily: 'monospace',
        }).setOrigin(0.5);

        btn.on('pointerover', () => { if (!isSelected) btn.setFillStyle(0x444455); });
        btn.on('pointerout', () => { if (!isSelected) btn.setFillStyle(0x333344); });
        btn.on('pointerdown', () => {
          state.spawnPoint.bubbleColor = c.name;
          this.stateManager.setState(state);
          this.refreshSpawnPointVisual();
          this.updatePropertiesPanel();
        });

        this.propsControls.push(btn, btnText);
      });
      return;
    }

    // Handle stage selection - show stage properties
    if (this.selection.selectedId === 'stage') {
      const state = this.stateManager.getState();
      const currentHeight = state.bounds.maxY - state.bounds.minY;
      this.propsText.setText(`Type:\nStage\n\nWidth: 640\nHeight: ${currentHeight}`);

      // Add height preset buttons
      const btnStartY = LAYOUT.canvasY + 160;
      const heights = [
        { value: 356, label: '1x (356)' },
        { value: 712, label: '2x (712)' },
        { value: 1068, label: '3x (1068)' },
        { value: 1424, label: '4x (1424)' },
      ];

      heights.forEach((h, i) => {
        const btnY = btnStartY + i * 32;
        const isSelected = currentHeight === h.value;

        const btn = this.add.rectangle(x, btnY, 90, 26, isSelected ? 0x446644 : 0x333344);
        btn.setStrokeStyle(2, isSelected ? 0x88ff88 : 0x666666);
        btn.setInteractive({ useHandCursor: true });

        const btnText = this.add.text(x, btnY, h.label, {
          fontSize: '11px',
          color: isSelected ? '#88ff88' : '#aaaaaa',
          fontFamily: 'monospace',
        }).setOrigin(0.5);

        btn.on('pointerover', () => { if (!isSelected) btn.setFillStyle(0x444455); });
        btn.on('pointerout', () => { if (!isSelected) btn.setFillStyle(0x333344); });
        btn.on('pointerdown', () => {
          this.setStageHeight(h.value);
        });

        this.propsControls.push(btn, btnText);
      });
      return;
    }

    const entity = this.stateManager.getEntityById(this.selection.selectedId);
    if (!entity) {
      this.propsText.setText('Select an\nobject');
      return;
    }

    let props = `Type:\n${entity.type}\n\n`;

    if ('x' in entity) props += `X: ${Math.round((entity as any).x)}\n`;
    if ('y' in entity) props += `Y: ${Math.round((entity as any).y)}\n`;
    if ('width' in entity) props += `W: ${(entity as any).width}\n`;
    if ('height' in entity) props += `H: ${(entity as any).height}\n`;

    if (entity.type === 'patrolShip' || entity.type === 'laserField' ||
        entity.type === 'bubbleGun' || entity.type === 'warpZone' ||
        entity.type === 'gravityWell') {
      const data = (entity as EditorHazard).data as any;
      props += `X: ${Math.round(data.x)}\n`;
      props += `Y: ${Math.round(data.y)}\n`;
      if (data.width) props += `W: ${data.width}\n`;
      if (data.height) props += `H: ${data.height}\n`;
      if (data.speed) props += `Spd: ${data.speed}\n`;
    }

    // Add type-specific controls
    const btnStartY = LAYOUT.canvasY + 180;

    if (entity.type === 'multiplierBubble') {
      const mult = entity as any;
      props += `\nValue: ${mult.value}x\nGroup: ${mult.group ?? 'None'}`;
      this.propsText.setText(props);

      // Add multiplier value buttons
      const values = [2, 5, 10];
      const colors: Record<number, string> = { 2: 'bronze', 5: 'silver', 10: 'gold' };
      const btnColors: Record<number, number> = { 2: 0xcd7f32, 5: 0xc0c0c0, 10: 0xffd700 };

      values.forEach((val, i) => {
        const btnY = btnStartY + i * 28;
        const isSelected = mult.value === val;

        const btn = this.add.rectangle(x, btnY, 90, 22, isSelected ? 0x444466 : 0x333344);
        btn.setStrokeStyle(2, btnColors[val]);
        btn.setInteractive({ useHandCursor: true });

        const btnText = this.add.text(x, btnY, `${val}x`, {
          fontSize: '12px',
          color: isSelected ? '#ffffff' : '#aaaaaa',
          fontFamily: 'monospace',
        }).setOrigin(0.5);

        btn.on('pointerover', () => { if (!isSelected) btn.setFillStyle(0x444455); });
        btn.on('pointerout', () => { if (!isSelected) btn.setFillStyle(0x333344); });
        btn.on('pointerdown', () => {
          mult.value = val;
          mult.color = colors[val];
          this.stateManager.updateEntity(mult);
          this.refreshEntityVisual(mult.editorId);
          this.updatePropertiesPanel();
        });

        this.propsControls.push(btn, btnText);
      });

      // Group label
      const groupLabelY = btnStartY + 95;
      const groupLabel = this.add.text(x, groupLabelY, 'GROUP', {
        fontSize: '10px',
        color: '#888888',
        fontFamily: 'monospace',
      }).setOrigin(0.5);
      this.propsControls.push(groupLabel);

      // Add group buttons (None, A, B, C, D)
      const groups = [null, 'A', 'B', 'C', 'D'];
      const groupColors: Record<string, number> = { A: 0xff6666, B: 0x66ff66, C: 0x6666ff, D: 0xffff66 };

      groups.forEach((grp, i) => {
        const btnX = x - 40 + i * 20;
        const btnY = groupLabelY + 20;
        const isSelected = (mult.group ?? null) === grp;
        const label = grp ?? '-';
        const color = grp ? groupColors[grp] : 0x888888;

        const btn = this.add.rectangle(btnX, btnY, 18, 18, isSelected ? 0x444466 : 0x333344);
        btn.setStrokeStyle(1, color);
        btn.setInteractive({ useHandCursor: true });

        const btnText = this.add.text(btnX, btnY, label, {
          fontSize: '10px',
          color: isSelected ? '#ffffff' : '#888888',
          fontFamily: 'monospace',
        }).setOrigin(0.5);

        btn.on('pointerover', () => { if (!isSelected) btn.setFillStyle(0x444455); });
        btn.on('pointerout', () => { if (!isSelected) btn.setFillStyle(0x333344); });
        btn.on('pointerdown', () => {
          mult.group = grp;
          this.stateManager.updateEntity(mult);
          this.updatePropertiesPanel();
        });

        this.propsControls.push(btn, btnText);
      });
    } else if (entity.type === 'landingPad') {
      const pad = entity as any;
      props += `\nPrimary:\n${pad.primary ? 'Yes' : 'No'}`;
      this.propsText.setText(props);

      // Primary toggle button
      const btnY = btnStartY;
      const btn = this.add.rectangle(x, btnY, 90, 28, pad.primary ? 0x004422 : 0x333344);
      btn.setStrokeStyle(2, 0x00ff44);
      btn.setInteractive({ useHandCursor: true });

      const btnText = this.add.text(x, btnY, pad.primary ? 'PRIMARY' : 'SECONDARY', {
        fontSize: '11px',
        color: pad.primary ? '#00ff44' : '#888888',
        fontFamily: 'monospace',
      }).setOrigin(0.5);

      btn.on('pointerover', () => btn.setFillStyle(0x444455));
      btn.on('pointerout', () => btn.setFillStyle(pad.primary ? 0x004422 : 0x333344));
      btn.on('pointerdown', () => {
        pad.primary = !pad.primary;
        this.stateManager.updateEntity(pad);
        this.updatePropertiesPanel();
      });

      this.propsControls.push(btn, btnText);
    } else if (entity.type === 'patrolShip') {
      const hazard = entity as EditorHazard;
      const data = hazard.data as any;
      this.propsText.setText('Patrol Ship');

      // Helper to create editable number row with +/- buttons
      const createNumberRow = (label: string, value: number, yPos: number, step: number, onChange: (newVal: number) => void) => {
        const rowX = x;

        // Label on top
        const lbl = this.add.text(rowX, yPos - 10, label, {
          fontSize: '10px',
          color: '#888888',
          fontFamily: 'monospace',
        }).setOrigin(0.5);
        this.propsControls.push(lbl);

        // Minus button (left)
        const minusBtn = this.add.rectangle(rowX - 32, yPos + 8, 22, 22, 0x333344);
        minusBtn.setStrokeStyle(1, 0xff6600);
        minusBtn.setInteractive({ useHandCursor: true });
        const minusText = this.add.text(rowX - 32, yPos + 8, '-', {
          fontSize: '16px',
          color: '#ff6600',
        }).setOrigin(0.5);
        minusBtn.on('pointerover', () => minusBtn.setFillStyle(0x444455));
        minusBtn.on('pointerout', () => minusBtn.setFillStyle(0x333344));
        minusBtn.on('pointerdown', () => {
          onChange(value - step);
        });
        this.propsControls.push(minusBtn, minusText);

        // Value display (center)
        const valBg = this.add.rectangle(rowX, yPos + 8, 36, 22, 0x222233);
        valBg.setStrokeStyle(1, 0x444466);
        this.propsControls.push(valBg);

        const valText = this.add.text(rowX, yPos + 8, `${Math.round(value)}`, {
          fontSize: '12px',
          color: '#ffffff',
          fontFamily: 'monospace',
        }).setOrigin(0.5);
        this.propsControls.push(valText);

        // Plus button (right)
        const plusBtn = this.add.rectangle(rowX + 32, yPos + 8, 22, 22, 0x333344);
        plusBtn.setStrokeStyle(1, 0xff6600);
        plusBtn.setInteractive({ useHandCursor: true });
        const plusText = this.add.text(rowX + 32, yPos + 8, '+', {
          fontSize: '16px',
          color: '#ff6600',
        }).setOrigin(0.5);
        plusBtn.on('pointerover', () => plusBtn.setFillStyle(0x444455));
        plusBtn.on('pointerout', () => plusBtn.setFillStyle(0x333344));
        plusBtn.on('pointerdown', () => {
          onChange(value + step);
        });
        this.propsControls.push(plusBtn, plusText);
      };

      // X position
      createNumberRow('X:', data.x, btnStartY, 10, (newVal) => {
        data.x = Math.max(0, Math.min(640 - data.width, newVal));
        this.stateManager.updateEntity(hazard);
        this.refreshEntityVisual(hazard.editorId);
        this.updatePropertiesPanel();
      });

      // Y position
      createNumberRow('Y:', data.y, btnStartY + 40, 10, (newVal) => {
        data.y = Math.max(0, Math.min(356 - data.height, newVal));
        this.stateManager.updateEntity(hazard);
        this.refreshEntityVisual(hazard.editorId);
        this.updatePropertiesPanel();
      });

      // Speed
      createNumberRow('Speed:', data.speed, btnStartY + 80, 5, (newVal) => {
        data.speed = Math.max(10, Math.min(200, newVal));
        this.stateManager.updateEntity(hazard);
        this.updatePropertiesPanel();
      });
    } else if (entity.type === 'laserField') {
      const hazard = entity as EditorHazard;
      const data = hazard.data as any;
      this.propsText.setText('Laser Field');

      // Helper to create compact X/Y row
      const createXYRow = (label: string, xVal: number, yVal: number, yPos: number, step: number,
        onChangeX: (v: number) => void, onChangeY: (v: number) => void) => {
        // Section label
        const lbl = this.add.text(x, yPos, label, {
          fontSize: '11px', color: '#ff6666', fontFamily: 'monospace',
        }).setOrigin(0.5);
        this.propsControls.push(lbl);

        // X row
        const xLabel = this.add.text(x - 40, yPos + 20, 'X', {
          fontSize: '10px', color: '#888888', fontFamily: 'monospace',
        }).setOrigin(0.5);
        this.propsControls.push(xLabel);

        const xMinus = this.add.rectangle(x - 18, yPos + 20, 18, 16, 0x333344);
        xMinus.setStrokeStyle(1, 0xff0000);
        xMinus.setInteractive({ useHandCursor: true });
        const xMinusT = this.add.text(x - 18, yPos + 20, '-', { fontSize: '12px', color: '#ff0000' }).setOrigin(0.5);
        xMinus.on('pointerdown', () => onChangeX(xVal - step));
        this.propsControls.push(xMinus, xMinusT);

        const xValText = this.add.text(x + 8, yPos + 20, `${Math.round(xVal)}`, {
          fontSize: '10px', color: '#ffffff', fontFamily: 'monospace',
        }).setOrigin(0.5);
        this.propsControls.push(xValText);

        const xPlus = this.add.rectangle(x + 34, yPos + 20, 18, 16, 0x333344);
        xPlus.setStrokeStyle(1, 0xff0000);
        xPlus.setInteractive({ useHandCursor: true });
        const xPlusT = this.add.text(x + 34, yPos + 20, '+', { fontSize: '12px', color: '#ff0000' }).setOrigin(0.5);
        xPlus.on('pointerdown', () => onChangeX(xVal + step));
        this.propsControls.push(xPlus, xPlusT);

        // Y row
        const yLabel = this.add.text(x - 40, yPos + 40, 'Y', {
          fontSize: '10px', color: '#888888', fontFamily: 'monospace',
        }).setOrigin(0.5);
        this.propsControls.push(yLabel);

        const yMinus = this.add.rectangle(x - 18, yPos + 40, 18, 16, 0x333344);
        yMinus.setStrokeStyle(1, 0xff0000);
        yMinus.setInteractive({ useHandCursor: true });
        const yMinusT = this.add.text(x - 18, yPos + 40, '-', { fontSize: '12px', color: '#ff0000' }).setOrigin(0.5);
        yMinus.on('pointerdown', () => onChangeY(yVal - step));
        this.propsControls.push(yMinus, yMinusT);

        const yValText = this.add.text(x + 8, yPos + 40, `${Math.round(yVal)}`, {
          fontSize: '10px', color: '#ffffff', fontFamily: 'monospace',
        }).setOrigin(0.5);
        this.propsControls.push(yValText);

        const yPlus = this.add.rectangle(x + 34, yPos + 40, 18, 16, 0x333344);
        yPlus.setStrokeStyle(1, 0xff0000);
        yPlus.setInteractive({ useHandCursor: true });
        const yPlusT = this.add.text(x + 34, yPos + 40, '+', { fontSize: '12px', color: '#ff0000' }).setOrigin(0.5);
        yPlus.on('pointerdown', () => onChangeY(yVal + step));
        this.propsControls.push(yPlus, yPlusT);
      };

      const updateLaser = () => {
        this.stateManager.updateEntity(hazard);
        this.refreshEntityVisual(hazard.editorId);
        this.updatePropertiesPanel();
      };

      // Emitter controls
      createXYRow('Emitter', data.emitterX ?? -50, data.emitterY ?? 0, btnStartY,
        10,
        (v) => { data.emitterX = v; updateLaser(); },
        (v) => { data.emitterY = v; updateLaser(); }
      );

      // Receiver controls
      createXYRow('Receiver', data.receiverX ?? 50, data.receiverY ?? 0, btnStartY + 70,
        10,
        (v) => { data.receiverX = v; updateLaser(); },
        (v) => { data.receiverY = v; updateLaser(); }
      );
    } else if (entity.type === 'terrain') {
      const terrain = entity as any;
      this.propsText.setText(`Type:\nTerrain\n\nW: ${terrain.width}\nH: ${terrain.height}`);

      // Helper to create number row with +/- buttons
      const createNumberRow = (label: string, value: number, yPos: number, step: number, onChange: (newVal: number) => void) => {
        const rowX = x;

        // Label
        const lbl = this.add.text(rowX - 35, yPos, label, {
          fontSize: '11px',
          color: '#888888',
          fontFamily: 'monospace',
        }).setOrigin(0, 0.5);
        this.propsControls.push(lbl);

        // Minus button
        const minusBtn = this.add.rectangle(rowX - 5, yPos, 20, 20, 0x333344);
        minusBtn.setStrokeStyle(1, 0x888888);
        minusBtn.setInteractive({ useHandCursor: true });
        const minusText = this.add.text(rowX - 5, yPos, '-', {
          fontSize: '14px',
          color: '#cccccc',
        }).setOrigin(0.5);
        minusBtn.on('pointerover', () => minusBtn.setFillStyle(0x444455));
        minusBtn.on('pointerout', () => minusBtn.setFillStyle(0x333344));
        minusBtn.on('pointerdown', () => onChange(value - step));
        this.propsControls.push(minusBtn, minusText);

        // Value display
        const valBg = this.add.rectangle(rowX + 22, yPos, 32, 20, 0x222233);
        valBg.setStrokeStyle(1, 0x444466);
        const valText = this.add.text(rowX + 22, yPos, `${Math.round(value)}`, {
          fontSize: '11px',
          color: '#ffffff',
          fontFamily: 'monospace',
        }).setOrigin(0.5);
        this.propsControls.push(valBg, valText);

        // Plus button
        const plusBtn = this.add.rectangle(rowX + 49, yPos, 20, 20, 0x333344);
        plusBtn.setStrokeStyle(1, 0x888888);
        plusBtn.setInteractive({ useHandCursor: true });
        const plusText = this.add.text(rowX + 49, yPos, '+', {
          fontSize: '14px',
          color: '#cccccc',
        }).setOrigin(0.5);
        plusBtn.on('pointerover', () => plusBtn.setFillStyle(0x444455));
        plusBtn.on('pointerout', () => plusBtn.setFillStyle(0x333344));
        plusBtn.on('pointerdown', () => onChange(value + step));
        this.propsControls.push(plusBtn, plusText);
      };

      const state = this.stateManager.getState();
      const maxY = state.bounds.maxY - state.bounds.minY;

      // X position
      createNumberRow('X:', terrain.x, btnStartY, 1, (newVal) => {
        terrain.x = Math.max(0, Math.min(640 - terrain.width, newVal));
        this.stateManager.updateEntity(terrain);
        this.refreshEntityVisual(terrain.editorId);
        this.updatePropertiesPanel();
      });

      // Y position
      createNumberRow('Y:', terrain.y, btnStartY + 28, 1, (newVal) => {
        terrain.y = Math.max(0, Math.min(maxY - terrain.height, newVal));
        this.stateManager.updateEntity(terrain);
        this.refreshEntityVisual(terrain.editorId);
        this.updatePropertiesPanel();
      });

      // W (width)
      createNumberRow('W:', terrain.width, btnStartY + 56, 1, (newVal) => {
        terrain.width = Math.max(5, Math.min(640 - terrain.x, newVal));
        this.stateManager.updateEntity(terrain);
        this.refreshEntityVisual(terrain.editorId);
        this.updatePropertiesPanel();
      });

      // H (height)
      createNumberRow('H:', terrain.height, btnStartY + 84, 1, (newVal) => {
        terrain.height = Math.max(5, Math.min(maxY - terrain.y, newVal));
        this.stateManager.updateEntity(terrain);
        this.refreshEntityVisual(terrain.editorId);
        this.updatePropertiesPanel();
      });
    } else {
      this.propsText.setText(props);
    }
  }

  /**
   * Refresh the visual for an entity after property change.
   */
  private refreshEntityVisual(editorId: string): void {
    const entity = this.stateManager.getEntityById(editorId);
    if (!entity) return;

    // Remove old visual
    const oldVisual = this.visualEntities.get(editorId);
    if (oldVisual) {
      oldVisual.container.destroy();
      this.visualEntities.delete(editorId);
    }

    // Create new visual
    const visual = this.entityFactory.createVisual(entity);

    // Position based on entity type
    if (entity.type === 'patrolShip' || entity.type === 'laserField' ||
        entity.type === 'bubbleGun' || entity.type === 'warpZone' ||
        entity.type === 'gravityWell') {
      // Hazard types have position in entity.data
      const data = (entity as EditorHazard).data as any;
      if (data.width && data.height) {
        visual.container.x = data.x + data.width / 2 + LAYOUT.canvasX;
        visual.container.y = data.y + data.height / 2 + LAYOUT.canvasY;
      } else {
        visual.container.x = data.x + LAYOUT.canvasX;
        visual.container.y = data.y + LAYOUT.canvasY;
      }
    } else if ('x' in entity && 'y' in entity) {
      if ('width' in entity && 'height' in entity) {
        visual.container.x = (entity as any).x + (entity as any).width / 2 + LAYOUT.canvasX;
        visual.container.y = (entity as any).y + (entity as any).height / 2 + LAYOUT.canvasY;
      } else {
        visual.container.x = (entity as any).x + LAYOUT.canvasX;
        visual.container.y = (entity as any).y + LAYOUT.canvasY;
      }
    }
    // Add to masked level container
    this.levelContainer.add(visual.container);
    this.visualEntities.set(editorId, visual);

    // Re-select to update selection box
    if (this.selection.selectedId === editorId) {
      this.selectEntity(editorId);
    }
  }

  /**
   * Refresh all entity visuals (e.g., after stage height change).
   */
  private refreshAllVisuals(): void {
    // Get all entity IDs
    const entityIds = Array.from(this.visualEntities.keys());

    // Refresh all entities
    for (const editorId of entityIds) {
      if (editorId !== 'spawn-point') {
        this.refreshEntityVisual(editorId);
      }
    }
    // Refresh spawn point
    this.refreshSpawnPointVisual();
  }

  /**
   * Refresh spawn point visual (when bubble color changes).
   */
  private refreshSpawnPointVisual(): void {
    const state = this.stateManager.getState();
    const oldVisual = this.visualEntities.get('spawn-point');
    if (oldVisual) {
      oldVisual.container.destroy();
      this.visualEntities.delete('spawn-point');
    }

    // Create entity-like object for the factory
    const spawnEntity = {
      editorId: 'spawn-point',
      type: 'spawnPoint' as const,
      x: state.spawnPoint.x,
      y: state.spawnPoint.y,
      bubbleColor: state.spawnPoint.bubbleColor ?? 'green',
    };

    const visual = this.entityFactory.createVisual(spawnEntity);
    visual.container.x = state.spawnPoint.x + LAYOUT.canvasX;
    visual.container.y = state.spawnPoint.y + LAYOUT.canvasY;
    // Add to masked level container
    this.levelContainer.add(visual.container);
    this.visualEntities.set('spawn-point', visual);

    // Re-select to update selection box
    if (this.selection.selectedId === 'spawn-point') {
      this.selectEntity('spawn-point');
    }
  }

  /**
   * Update UI elements.
   */
  private updateUI(): void {
    const state = this.stateManager.getState();
    this.levelNameText.setText(state.levelName);
    this.gravityText.setText(String(state.gravity));
    this.fuelText.setText(String(state.startingFuel));
  }

  /**
   * Show dialog to edit level name.
   */
  private showNameEditDialog(): void {
    const state = this.stateManager.getState();
    const currentName = state.levelName;

    // Use browser prompt for simplicity
    const newName = window.prompt('Enter level name:', currentName);
    if (newName && newName.trim() && newName !== currentName) {
      state.levelName = newName.trim();
      // Also update levelId to match
      state.levelId = newName.trim().toLowerCase().replace(/\s+/g, '-');
      this.stateManager.setState(state);
      this.updateUI();
      this.showMessage(`Level renamed to "${newName.trim()}"`);
    }
  }

  /**
   * Toggle grid snap.
   */
  private toggleGrid(): void {
    this.snapToGrid = !this.snapToGrid;
    this.drawGrid();

    // Update button text
    this.children.each((child: any) => {
      if (child.getData && child.getData('gridText')) {
        child.setText(this.snapToGrid ? 'GRID:ON' : 'GRID:OFF');
      }
    });
  }

  /**
   * Undo last action.
   */
  private undo(): void {
    const state = this.stateManager.undo();
    if (state) {
      this.loadEntitiesFromState();
      this.deselectAll();
      this.updateUI();
    }
  }

  /**
   * Redo last undone action.
   */
  private redo(): void {
    const state = this.stateManager.redo();
    if (state) {
      this.loadEntitiesFromState();
      this.deselectAll();
      this.updateUI();
    }
  }

  /**
   * Clear level.
   */
  private clearLevel(): void {
    this.stateManager = new EditorStateManager(createDefaultEditorState());
    this.loadEntitiesFromState();
    this.deselectAll();
    this.updateUI();
  }

  /**
   * Show Level Manager UI.
   */
  private showLevelManager(): void {
    console.log('Level Manager: TOTAL_LEVELS =', TOTAL_LEVELS);
    const overlay = this.add.container(500, 300);
    overlay.setDepth(3000);

    // Background
    const bg = this.add.rectangle(0, 0, 550, 520, 0x1a1a2e, 0.98);
    bg.setStrokeStyle(2, 0xffaa00);
    overlay.add(bg);

    // Title (show level count for debugging)
    const title = this.add.text(0, -235, `LEVEL MANAGER (${TOTAL_LEVELS} levels)`, {
      fontSize: '18px',
      color: '#ffaa00',
      fontFamily: 'monospace',
    }).setOrigin(0.5);
    overlay.add(title);

    // Level list area
    const listBg = this.add.rectangle(-80, 0, 320, 400, 0x111122);
    listBg.setStrokeStyle(1, 0x333366);
    overlay.add(listBg);

    // Build reorderable level list from current levels
    const levelOrder: { name: string; exportName: string }[] = [];
    for (let i = 1; i <= TOTAL_LEVELS; i++) {
      const level = getLevel(i);
      if (level) {
        levelOrder.push({
          name: level.name,
          exportName: this.getLevelExportName(level.name),
        });
      }
    }

    // Scrollable level list with drag reordering
    let selectedIndex = -1;
    let dragIndex = -1;
    let dragStartY = 0;
    let dragGhost: Phaser.GameObjects.Container | null = null;
    let dropIndicator: Phaser.GameObjects.Rectangle | null = null;
    let hoverDropIndex = -1;
    const levelItems: { bg: Phaser.GameObjects.Rectangle; text: Phaser.GameObjects.Text; index: number }[] = [];
    let scrollOffset = 0;
    const maxVisible = 14;
    const itemHeight = 28;
    const listStartY = -180;

    // Create drop indicator (hidden initially)
    dropIndicator = this.add.rectangle(-80, 0, 300, 4, 0x88ff88);
    dropIndicator.setVisible(false);
    overlay.add(dropIndicator);

    const updateLevelList = () => {
      // Clear old items
      levelItems.forEach(item => {
        item.bg.destroy();
        item.text.destroy();
      });
      levelItems.length = 0;

      // Create level items
      for (let i = 0; i < Math.min(levelOrder.length, maxVisible); i++) {
        const levelIndex = i + scrollOffset;
        if (levelIndex >= levelOrder.length) break;

        const y = listStartY + i * itemHeight;
        const levelData = levelOrder[levelIndex];
        const isSelected = levelIndex === selectedIndex;
        const isDragging = levelIndex === dragIndex;

        const itemBg = this.add.rectangle(-80, y, 300, 24, isSelected ? 0x446644 : 0x222244);
        itemBg.setStrokeStyle(1, isSelected ? 0x88ff88 : 0x444466);
        itemBg.setInteractive({ useHandCursor: true, draggable: true });
        itemBg.setData('levelIndex', levelIndex);
        if (isDragging) itemBg.setAlpha(0.3);
        overlay.add(itemBg);

        const itemText = this.add.text(-220, y, `${levelIndex + 1}. ${levelData.name}`, {
          fontSize: '13px',
          color: isSelected ? '#88ff88' : '#cccccc',
          fontFamily: 'monospace',
        }).setOrigin(0, 0.5);
        if (isDragging) itemText.setAlpha(0.3);
        overlay.add(itemText);

        itemBg.on('pointerover', () => { if (!isSelected && dragIndex < 0) itemBg.setFillStyle(0x333355); });
        itemBg.on('pointerout', () => { if (!isSelected) itemBg.setFillStyle(0x222244); });
        itemBg.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
          selectedIndex = levelIndex;
          dragIndex = levelIndex;
          dragStartY = pointer.y;

          // Create drag ghost
          dragGhost = this.add.container(overlay.x - 80, pointer.y);
          dragGhost.setDepth(3001);
          const ghostBg = this.add.rectangle(0, 0, 300, 24, 0x446688, 0.9);
          ghostBg.setStrokeStyle(2, 0x88aaff);
          const ghostText = this.add.text(-140, 0, levelData.name, {
            fontSize: '13px',
            color: '#ffffff',
            fontFamily: 'monospace',
          }).setOrigin(0, 0.5);
          dragGhost.add([ghostBg, ghostText]);

          updateLevelList();
        });

        levelItems.push({ bg: itemBg, text: itemText, index: levelIndex });
      }
    };

    // Handle drag movement
    const onPointerMove = (pointer: Phaser.Input.Pointer) => {
      if (dragIndex >= 0 && dragGhost && dropIndicator) {
        dragGhost.y = pointer.y;

        // Calculate which position we're hovering over
        const relativeY = pointer.y - overlay.y - listStartY;
        let newHoverIndex = Math.floor((relativeY + itemHeight / 2) / itemHeight) + scrollOffset;
        newHoverIndex = Math.max(0, Math.min(levelOrder.length, newHoverIndex));

        // Show drop indicator
        if (newHoverIndex !== hoverDropIndex) {
          hoverDropIndex = newHoverIndex;

          // Position indicator between items
          const indicatorY = listStartY + (hoverDropIndex - scrollOffset) * itemHeight - itemHeight / 2 + 2;

          // Only show if within visible area
          if (hoverDropIndex >= scrollOffset && hoverDropIndex <= scrollOffset + maxVisible) {
            dropIndicator.setPosition(-80, indicatorY);
            dropIndicator.setVisible(true);
          } else {
            dropIndicator.setVisible(false);
          }
        }
      }
    };
    this.input.on('pointermove', onPointerMove);

    // Handle drag end
    const onPointerUp = (pointer: Phaser.Input.Pointer) => {
      if (dragIndex >= 0 && dragGhost) {
        // Only reorder if there was actual dragging (hoverDropIndex was set by pointer move)
        if (hoverDropIndex >= 0) {
          let dropIndex = hoverDropIndex;
          dropIndex = Math.max(0, Math.min(levelOrder.length - 1, dropIndex));

          // Adjust for dragging down (need to account for removal shifting indices)
          if (dropIndex > dragIndex) {
            dropIndex--;
          }
          dropIndex = Math.max(0, Math.min(levelOrder.length - 1, dropIndex));

          // Reorder if different position
          if (dropIndex !== dragIndex) {
            const [removed] = levelOrder.splice(dragIndex, 1);
            levelOrder.splice(dropIndex, 0, removed);
            selectedIndex = dropIndex;
          }
        }

        // Cleanup
        dragGhost.destroy();
        dragGhost = null;
        dragIndex = -1;
        hoverDropIndex = -1;
        if (dropIndicator) {
          dropIndicator.setVisible(false);
        }
        updateLevelList();
      }
    };
    this.input.on('pointerup', onPointerUp);

    updateLevelList();

    // Scroll buttons
    const scrollUpBtn = this.add.triangle(-80, -210, 0, 10, -10, -5, 10, -5, 0x666688);
    scrollUpBtn.setInteractive({ useHandCursor: true });
    overlay.add(scrollUpBtn);
    scrollUpBtn.on('pointerdown', () => {
      if (scrollOffset > 0) {
        scrollOffset--;
        updateLevelList();
      }
    });

    const scrollDownBtn = this.add.triangle(-80, 210, 0, -10, -10, 5, 10, 5, 0x666688);
    scrollDownBtn.setInteractive({ useHandCursor: true });
    overlay.add(scrollDownBtn);
    scrollDownBtn.on('pointerdown', () => {
      if (scrollOffset < TOTAL_LEVELS - maxVisible) {
        scrollOffset++;
        updateLevelList();
      }
    });

    // Action buttons (right side)
    const btnX = 170;
    const actionButtons = [
      { y: -170, label: 'EDIT', color: 0x44ff44, action: () => {
        if (selectedIndex >= 0) {
          const level = getLevel(selectedIndex + 1);
          if (level) {
            this.stateManager = new EditorStateManager(levelToEditorState(level));
            this.loadEntitiesFromState();
            this.deselectAll();
            this.editorScrollY = 0;
            this.levelContainer.y = 0;
            this.updateUI();
            (overlay.getData('cleanup') as () => void)();
          }
        } else {
          this.showMessage('Select a level first');
        }
      }},
      { y: -130, label: 'COPY', color: 0x44dddd, action: () => {
        if (selectedIndex >= 0) {
          const level = getLevel(selectedIndex + 1);
          if (level) {
            this.stateManager = new EditorStateManager(levelToEditorState(level));
            const state = this.stateManager.getState();
            state.levelName = `${level.name} Copy`;
            state.levelId = `${level.id}-copy`;
            state.levelNumber = TOTAL_LEVELS + 1;
            this.stateManager.setState(state);
            this.loadEntitiesFromState();
            this.deselectAll();
            this.editorScrollY = 0;
            this.levelContainer.y = 0;
            this.updateUI();
            (overlay.getData('cleanup') as () => void)();
            this.showMessage(`Copied "${level.name}" - EXPORT to save`);
          }
        } else {
          this.showMessage('Select a level first');
        }
      }},
      { y: -90, label: 'NEW', color: 0x4488ff, action: () => {
        // Create new level with default state (at end)
        this.stateManager = new EditorStateManager(createDefaultEditorState());
        const state = this.stateManager.getState();
        state.levelName = 'New Level';
        state.levelNumber = TOTAL_LEVELS + 1;
        this.stateManager.setState(state);
        this.loadEntitiesFromState();
        this.deselectAll();
        this.editorScrollY = 0;
        this.levelContainer.y = 0;
        this.updateUI();
        (overlay.getData('cleanup') as () => void)();
        this.showMessage('New level created - EXPORT to save');
      }},
      { y: -45, label: 'INSERT\nBELOW', color: 0x44aaff, action: () => {
        if (selectedIndex >= 0) {
          // Create new level to insert after selected
          const selectedLevel = getLevel(selectedIndex + 1);
          this.stateManager = new EditorStateManager(createDefaultEditorState());
          const state = this.stateManager.getState();
          state.levelName = 'New Level';
          state.levelNumber = selectedIndex + 2; // Position after selected
          this.stateManager.setState(state);
          this.loadEntitiesFromState();
          this.deselectAll();
          this.editorScrollY = 0;
          this.levelContainer.y = 0;
          this.updateUI();
          (overlay.getData('cleanup') as () => void)();
          const afterName = selectedLevel?.name ?? `Level ${selectedIndex + 1}`;
          this.showMessage(`Insert after "${afterName}" in levels.ts`);
        } else {
          this.showMessage('Select a level first');
        }
      }},
      { y: 15, label: 'DELETE', color: 0xff4444, action: () => {
        if (selectedIndex >= 0) {
          const level = getLevel(selectedIndex + 1);
          const levelName = level?.name ?? `Level ${selectedIndex + 1}`;
          const exportName = this.getLevelExportName(levelName);
          this.showMessage(`Delete ${exportName}.ts and remove from levels.ts`);
        } else {
          this.showMessage('Select a level first');
        }
      }},
      { y: 65, label: 'EXPORT\nlevels.ts', color: 0xff8844, action: () => {
        // Export with current reordered list
        this.exportLevelRegistryWithOrder(levelOrder);
      }},
    ];

    actionButtons.forEach(btn => {
      const btnBg = this.add.rectangle(btnX, btn.y, 120, btn.label.includes('\n') ? 40 : 30, 0x333344);
      btnBg.setStrokeStyle(2, btn.color);
      btnBg.setInteractive({ useHandCursor: true });
      overlay.add(btnBg);

      const btnText = this.add.text(btnX, btn.y, btn.label, {
        fontSize: '12px',
        color: '#ffffff',
        fontFamily: 'monospace',
        align: 'center',
      }).setOrigin(0.5);
      overlay.add(btnText);

      btnBg.on('pointerover', () => btnBg.setFillStyle(0x444466));
      btnBg.on('pointerout', () => btnBg.setFillStyle(0x333344));
      btnBg.on('pointerdown', btn.action);
    });

    // Instructions
    const instructions = this.add.text(0, 160, 'Drag levels to reorder.\nClick to select, EDIT to load.\nExport levels.ts to update order.', {
      fontSize: '10px',
      color: '#888888',
      fontFamily: 'monospace',
      align: 'center',
    }).setOrigin(0.5);
    overlay.add(instructions);

    // Cleanup function to remove event listeners
    const cleanupOverlay = () => {
      this.input.off('pointermove', onPointerMove);
      this.input.off('pointerup', onPointerUp);
      if (dragGhost) {
        dragGhost.destroy();
        dragGhost = null;
      }
      overlay.destroy();
    };

    // Close button
    const closeBtn = this.add.rectangle(0, 220, 100, 30, 0x444466);
    closeBtn.setStrokeStyle(2, 0xff4444);
    closeBtn.setInteractive({ useHandCursor: true });
    overlay.add(closeBtn);

    const closeText = this.add.text(0, 220, 'CLOSE', {
      fontSize: '14px',
      color: '#ffffff',
      fontFamily: 'monospace',
    }).setOrigin(0.5);
    overlay.add(closeText);

    closeBtn.on('pointerdown', cleanupOverlay);

    // Store cleanup for action buttons to use
    overlay.setData('cleanup', cleanupOverlay);
  }

  /**
   * Export the level registry (levels.ts) code with custom order.
   */
  private exportLevelRegistryWithOrder(levelOrder: { name: string; exportName: string }[]): void {
    const lines: string[] = [];

    lines.push(`/**`);
    lines.push(` * @fileoverview Level registry and loading utilities.`);
    lines.push(` * This module provides centralized access to all game levels.`);
    lines.push(` */`);
    lines.push(``);
    lines.push(`import type { Level } from '@shared/types/Level';`);
    lines.push(``);

    // Generate imports in new order
    for (const level of levelOrder) {
      lines.push(`import { ${level.exportName} } from './${level.exportName}';`);
    }
    lines.push(``);

    lines.push(`/**`);
    lines.push(` * Complete registry of all game levels.`);
    lines.push(` */`);
    lines.push(`export const LEVELS: readonly Level[] = [`);

    for (const level of levelOrder) {
      lines.push(`  ${level.exportName},`);
    }

    lines.push(`] as const;`);
    lines.push(``);
    lines.push(`export const TOTAL_LEVELS = LEVELS.length;`);
    lines.push(``);
    lines.push(`export function getLevel(levelNumber: number): Level | undefined {`);
    lines.push(`  if (levelNumber < 1 || levelNumber > TOTAL_LEVELS) return undefined;`);
    lines.push(`  return LEVELS[levelNumber - 1];`);
    lines.push(`}`);

    const code = lines.join('\n');
    navigator.clipboard.writeText(code).then(() => {
      this.showMessage('levels.ts code copied! Paste into frontend/levels/levels.ts');
    }).catch(() => {
      console.log('=== LEVELS.TS EXPORT ===');
      console.log(code);
      this.showMessage('Check console for code');
    });
  }

  /**
   * Get export name from level name.
   */
  private getLevelExportName(levelName: string): string {
    const sanitized = levelName
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .split(/\s+/)
      .map((word, i) => i === 0 ? word.toLowerCase() : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');
    return `level${sanitized.charAt(0).toUpperCase() + sanitized.slice(1)}`;
  }

  /**
   * Export level as TypeScript.
   */
  private exportLevel(): void {
    const state = this.stateManager.getState();
    const code = this.generateTypeScript(state);
    const exportName = this.getLevelExportName(state.levelName);
    const filename = `${exportName}.ts`;

    // Copy to clipboard
    navigator.clipboard.writeText(code).then(() => {
      this.showExportDialog(exportName, filename);
    }).catch(() => {
      // Fallback: show in console
      console.log('=== LEVEL EXPORT ===');
      console.log(code);
      this.showExportDialog(exportName, filename);
    });
  }

  /**
   * Show export success dialog with save instructions.
   */
  private showExportDialog(exportName: string, filename: string): void {
    const overlay = this.add.container(500, 280);
    overlay.setDepth(3000);

    // Background
    const bg = this.add.rectangle(0, 0, 420, 280, 0x1a1a2e, 0.98);
    bg.setStrokeStyle(2, 0x44ff44);
    overlay.add(bg);

    // Title
    const title = this.add.text(0, -110, 'LEVEL EXPORTED', {
      fontSize: '18px',
      color: '#44ff44',
      fontFamily: 'monospace',
    }).setOrigin(0.5);
    overlay.add(title);

    // Copied message
    const copied = this.add.text(0, -75, 'Code copied to clipboard!', {
      fontSize: '14px',
      color: '#88ff88',
      fontFamily: 'monospace',
    }).setOrigin(0.5);
    overlay.add(copied);

    // File info
    const fileLabel = this.add.text(-180, -40, 'Save as:', {
      fontSize: '12px',
      color: '#888888',
      fontFamily: 'monospace',
    }).setOrigin(0, 0.5);
    overlay.add(fileLabel);

    const fileBox = this.add.rectangle(40, -40, 280, 28, 0x222244);
    fileBox.setStrokeStyle(1, 0x4488ff);
    overlay.add(fileBox);

    const fileText = this.add.text(40, -40, `frontend/levels/${filename}`, {
      fontSize: '12px',
      color: '#ffaa00',
      fontFamily: 'monospace',
    }).setOrigin(0.5);
    overlay.add(fileText);

    // Export name info
    const exportLabel = this.add.text(-180, 0, 'Export:', {
      fontSize: '12px',
      color: '#888888',
      fontFamily: 'monospace',
    }).setOrigin(0, 0.5);
    overlay.add(exportLabel);

    const exportBox = this.add.rectangle(40, 0, 280, 28, 0x222244);
    exportBox.setStrokeStyle(1, 0x4488ff);
    overlay.add(exportBox);

    const exportText = this.add.text(40, 0, exportName, {
      fontSize: '12px',
      color: '#44ddff',
      fontFamily: 'monospace',
    }).setOrigin(0.5);
    overlay.add(exportText);

    // Instructions
    const instructions = this.add.text(0, 55, 'Then add to levels.ts:', {
      fontSize: '11px',
      color: '#888888',
      fontFamily: 'monospace',
    }).setOrigin(0.5);
    overlay.add(instructions);

    const importLine = this.add.text(0, 80, `import { ${exportName} } from './${exportName}';`, {
      fontSize: '10px',
      color: '#aaaaaa',
      fontFamily: 'monospace',
    }).setOrigin(0.5);
    overlay.add(importLine);

    // Close button
    const closeBtn = this.add.rectangle(0, 120, 100, 30, 0x333344);
    closeBtn.setStrokeStyle(2, 0x44ff44);
    closeBtn.setInteractive({ useHandCursor: true });
    overlay.add(closeBtn);

    const closeText = this.add.text(0, 120, 'OK', {
      fontSize: '14px',
      color: '#ffffff',
      fontFamily: 'monospace',
    }).setOrigin(0.5);
    overlay.add(closeText);

    closeBtn.on('pointerover', () => closeBtn.setFillStyle(0x444466));
    closeBtn.on('pointerout', () => closeBtn.setFillStyle(0x333344));
    closeBtn.on('pointerdown', () => overlay.destroy());
  }

  /**
   * Generate TypeScript code from state.
   */
  private generateTypeScript(state: typeof this.stateManager extends EditorStateManager ? ReturnType<EditorStateManager['getState']> : never): string {
    const lines: string[] = [];

    lines.push(`/**`);
    lines.push(` * @fileoverview ${state.levelName}`);
    lines.push(` * Created with Level Editor`);
    lines.push(` */`);
    lines.push(``);
    lines.push(`import type { Level } from '@shared/types/Level';`);
    lines.push(``);
    // Convert level name to camelCase export name (e.g., "Warp Zone" -> "levelWarpZone")
    const sanitizedName = state.levelName
      .replace(/[^a-zA-Z0-9\s]/g, '') // Remove special chars
      .split(/\s+/) // Split on whitespace
      .map((word, i) => i === 0 ? word.toLowerCase() : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');
    const exportName = `level${sanitizedName.charAt(0).toUpperCase() + sanitizedName.slice(1)}`;
    lines.push(`export const ${exportName}: Level = {`);
    lines.push(`  id: '${state.levelId}',`);
    lines.push(`  name: '${state.levelName}',`);
    lines.push(`  description: '${state.description}',`);
    lines.push(`  difficulty: ${state.difficulty},`);
    lines.push(`  levelNumber: ${state.levelNumber},`);
    lines.push(``);
    lines.push(`  gravity: ${state.gravity},`);
    lines.push(`  startingFuel: ${state.startingFuel},`);
    lines.push(`  safeLandingVelocity: ${state.safeLandingVelocity},`);
    lines.push(`  safeLandingAngle: ${state.safeLandingAngle},`);
    if (state.autoStabilization !== 0.5) {
      lines.push(`  autoStabilization: ${state.autoStabilization},`);
    }
    lines.push(``);
    lines.push(`  spawnPoint: { x: ${state.spawnPoint.x}, y: ${state.spawnPoint.y} },`);
    lines.push(``);
    lines.push(`  bounds: {`);
    lines.push(`    minX: ${state.bounds.minX},`);
    lines.push(`    maxX: ${state.bounds.maxX},`);
    lines.push(`    minY: ${state.bounds.minY},`);
    lines.push(`    maxY: ${state.bounds.maxY},`);
    lines.push(`  },`);
    lines.push(``);

    // Terrain
    lines.push(`  terrain: [`);
    state.terrain.forEach(t => {
      lines.push(`    { x: ${t.x}, y: ${t.y}, width: ${t.width}, height: ${t.height} },`);
    });
    lines.push(`  ],`);
    lines.push(``);

    // Landing pads
    lines.push(`  landingPads: [`);
    state.landingPads.forEach(p => {
      lines.push(`    {`);
      lines.push(`      id: '${p.id}',`);
      lines.push(`      x: ${p.x},`);
      lines.push(`      y: ${p.y},`);
      lines.push(`      width: ${p.width},`);
      lines.push(`      height: ${p.height},`);
      lines.push(`      primary: ${p.primary ?? false},`);
      lines.push(`      pointMultiplier: ${p.pointMultiplier ?? 1},`);
      lines.push(`    },`);
    });
    lines.push(`  ],`);

    // Hazards
    if (state.hazards.length > 0) {
      lines.push(``);
      lines.push(`  hazards: [`);
      state.hazards.forEach(h => {
        lines.push(`    ${JSON.stringify(h.data)},`);
      });
      lines.push(`  ],`);
    }

    // Fuel pickups
    if (state.fuelPickups.length > 0) {
      lines.push(``);
      lines.push(`  fuelPickups: [`);
      state.fuelPickups.forEach(f => {
        lines.push(`    { x: ${f.x}, y: ${f.y}, amount: ${f.amount}, oneTime: ${f.oneTime ?? true} },`);
      });
      lines.push(`  ],`);
    }

    // Collectibles
    if (state.collectibles.length > 0) {
      lines.push(``);
      lines.push(`  collectibles: [`);
      state.collectibles.forEach(c => {
        lines.push(`    { x: ${c.x}, y: ${c.y}, type: '${c.type}', value: ${c.value} },`);
      });
      lines.push(`  ],`);
    }

    // Multiplier bubbles
    if (state.multiplierBubbles.length > 0) {
      lines.push(``);
      lines.push(`  multiplierBubbles: [`);
      state.multiplierBubbles.forEach(m => {
        const groupPart = m.group ? `, group: '${m.group}'` : '';
        lines.push(`    { id: '${m.id}', x: ${m.x}, y: ${m.y}, value: ${m.value}, color: '${m.color ?? 'gold'}'${groupPart} },`);
      });
      lines.push(`  ],`);
    }

    lines.push(``);
    lines.push(`  baseScore: ${state.baseScore},`);
    lines.push(`  starThresholds: {`);
    lines.push(`    oneStar: ${state.starThresholds.oneStar},`);
    lines.push(`    twoStar: ${state.starThresholds.twoStar},`);
    lines.push(`    threeStar: ${state.starThresholds.threeStar},`);
    lines.push(`  },`);
    lines.push(`  parTime: ${state.parTime},`);
    lines.push(``);
    lines.push(`  visuals: {`);
    lines.push(`    theme: '${state.theme}',`);
    lines.push(`    backgroundColor: '${state.backgroundColor}',`);
    lines.push(`    showStars: ${state.showStars},`);
    lines.push(`  },`);
    lines.push(`};`);

    return lines.join('\n');
  }

  /**
   * Show a temporary message.
   */
  private showMessage(text: string): void {
    const msg = this.add.text(600, 350, text, {
      fontSize: '20px',
      color: '#ffffff',
      backgroundColor: '#222233',
      padding: { x: 24, y: 12 },
      fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(5000);

    this.time.delayedCall(2000, () => msg.destroy());
  }

  /**
   * Start play test.
   */
  private startTest(): void {
    const level = editorStateToLevel(this.stateManager.getState());
    const editorState = this.stateManager.getState();

    // Store level data in sessionStorage for the game page to pick up
    sessionStorage.setItem('testLevel', JSON.stringify({
      level,
      editorState,
    }));

    // Navigate to the actual game page
    window.location.href = '/';
  }
}
