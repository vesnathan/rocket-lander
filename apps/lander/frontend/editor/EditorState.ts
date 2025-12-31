/**
 * @fileoverview Editor state management with undo/redo support.
 */

import type { Level } from '@shared/types/Level';
import type {
  EditorState,
  EditorTerrainBlock,
  EditorLandingPad,
  EditorFuelPickup,
  EditorCollectible,
  EditorMultiplierBubble,
  EditorCheckpoint,
  EditorIceLayer,
  EditorHazard,
  EditorEnemy,
  EditorEntity,
} from './types';

/**
 * Generate a unique editor ID.
 */
export function generateEditorId(): string {
  return `editor-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create a default editor state for a new level.
 */
export function createDefaultEditorState(): EditorState {
  return {
    levelId: 'custom-level',
    levelName: 'New Level',
    description: 'Created with Level Editor',
    difficulty: 2,
    levelNumber: 99,

    gravity: 200,
    startingFuel: 100,
    safeLandingVelocity: 100,
    safeLandingAngle: 15,
    autoStabilization: 0.5,

    spawnPoint: { x: 100, y: 50, bubbleColor: 'green' },
    bounds: {
      minX: 0,
      maxX: 640,
      minY: 0,
      maxY: 356,
    },

    terrain: [
      // Default walls
      { editorId: generateEditorId(), entityType: 'terrain', x: 0, y: 0, width: 5, height: 356 },
      { editorId: generateEditorId(), entityType: 'terrain', x: 635, y: 0, width: 5, height: 356 },
      { editorId: generateEditorId(), entityType: 'terrain', x: 5, y: 0, width: 630, height: 5 },
      { editorId: generateEditorId(), entityType: 'terrain', x: 5, y: 351, width: 630, height: 5 },
    ],
    landingPads: [
      {
        editorId: generateEditorId(),
        entityType: 'landingPad',
        id: 'pad-1',
        x: 480,
        y: 321,
        width: 100,
        height: 20,
        primary: true,
        pointMultiplier: 1,
      },
    ],
    fuelPickups: [],
    collectibles: [],
    multiplierBubbles: [],
    checkpoints: [],
    iceLayers: [],
    hazards: [],
    enemies: [],

    theme: 'asteroid',
    backgroundColor: '#0c0815',
    showStars: true,
    ambientLight: '#1a1a2e',

    baseScore: 200,
    starThresholds: {
      oneStar: 100,
      twoStar: 160,
      threeStar: 250,
    },
    parTime: 45,
  };
}

/**
 * Convert an existing Level to EditorState.
 */
export function levelToEditorState(level: Level): EditorState {
  return {
    levelId: level.id,
    levelName: level.name,
    description: level.description,
    difficulty: level.difficulty,
    levelNumber: level.levelNumber,

    gravity: level.gravity,
    startingFuel: level.startingFuel,
    safeLandingVelocity: level.safeLandingVelocity ?? 100,
    safeLandingAngle: level.safeLandingAngle ?? 15,
    autoStabilization: level.autoStabilization ?? 0.5,

    spawnPoint: {
      x: level.spawnPoint.x,
      y: level.spawnPoint.y,
      bubbleColor: level.spawnPoint.bubbleColor ?? 'green',
    },
    bounds: { ...level.bounds },

    terrain: level.terrain.map((t) => ({
      ...t,
      editorId: generateEditorId(),
      entityType: 'terrain' as const,
    })),

    landingPads: level.landingPads.map((p) => ({
      ...p,
      editorId: generateEditorId(),
      entityType: 'landingPad' as const,
    })),

    fuelPickups: (level.fuelPickups ?? []).map((f) => ({
      ...f,
      editorId: generateEditorId(),
      entityType: 'fuelPickup' as const,
    })),

    collectibles: (level.collectibles ?? []).map((c) => ({
      ...c,
      editorId: generateEditorId(),
      entityType: 'collectible' as const,
    })),

    multiplierBubbles: (level.multiplierBubbles ?? []).map((m) => ({
      ...m,
      editorId: generateEditorId(),
      entityType: 'multiplierBubble' as const,
    })),

    checkpoints: (level.checkpoints ?? []).map((c) => ({
      ...c,
      editorId: generateEditorId(),
      entityType: 'checkpoint' as const,
    })),

    iceLayers: (level.iceLayers ?? []).map((i) => ({
      ...i,
      editorId: generateEditorId(),
      entityType: 'iceLayer' as const,
    })),

    hazards: (level.hazards ?? []).map((h) => ({
      editorId: generateEditorId(),
      entityType: h.type as EditorHazard['entityType'],
      data: h,
    })),

    enemies: (level.enemies ?? []).map((e) => ({
      editorId: generateEditorId(),
      entityType: 'enemy' as const,
      data: e,
    })),

    theme: level.visuals.theme,
    backgroundColor: level.visuals.backgroundColor,
    showStars: level.visuals.showStars ?? true,
    ambientLight: level.visuals.ambientLight ?? '#1a1a2e',

    baseScore: level.baseScore,
    starThresholds: { ...level.starThresholds },
    parTime: level.parTime ?? 60,
  };
}

/**
 * Convert EditorState back to a Level.
 */
export function editorStateToLevel(state: EditorState): Level {
  const level: Level = {
    id: state.levelId,
    name: state.levelName,
    description: state.description,
    difficulty: state.difficulty,
    levelNumber: state.levelNumber,

    gravity: state.gravity,
    startingFuel: state.startingFuel,
    safeLandingVelocity: state.safeLandingVelocity,
    safeLandingAngle: state.safeLandingAngle,
    autoStabilization: state.autoStabilization,

    spawnPoint: { ...state.spawnPoint },
    bounds: { ...state.bounds },

    terrain: state.terrain.map(({ editorId, entityType, ...rest }) => rest),

    landingPads: state.landingPads.map(({ editorId, entityType, ...rest }) => rest),

    baseScore: state.baseScore,
    starThresholds: { ...state.starThresholds },
    parTime: state.parTime,

    visuals: {
      theme: state.theme,
      backgroundColor: state.backgroundColor,
      showStars: state.showStars,
      ambientLight: state.ambientLight,
    },
  };

  // Add optional arrays only when non-empty
  if (state.fuelPickups.length > 0) {
    level.fuelPickups = state.fuelPickups.map(({ editorId, entityType, ...rest }) => rest);
  }
  if (state.collectibles.length > 0) {
    level.collectibles = state.collectibles.map(({ editorId, entityType, ...rest }) => rest);
  }
  if (state.multiplierBubbles.length > 0) {
    level.multiplierBubbles = state.multiplierBubbles.map(({ editorId, entityType, ...rest }) => rest);
  }
  if (state.checkpoints.length > 0) {
    level.checkpoints = state.checkpoints.map(({ editorId, entityType, ...rest }) => rest);
  }
  if (state.iceLayers.length > 0) {
    level.iceLayers = state.iceLayers.map(({ editorId, entityType, ...rest }) => rest);
  }
  if (state.hazards.length > 0) {
    level.hazards = state.hazards.map((h) => h.data);
  }
  if (state.enemies.length > 0) {
    level.enemies = state.enemies.map((e) => e.data);
  }

  return level;
}

/**
 * Deep clone an editor state.
 */
export function cloneEditorState(state: EditorState): EditorState {
  return JSON.parse(JSON.stringify(state));
}

/**
 * Editor state manager with undo/redo support.
 */
export class EditorStateManager {
  private history: EditorState[] = [];
  private historyIndex: number = -1;
  private maxHistory: number = 50;
  private currentState: EditorState;

  constructor(initialState?: EditorState) {
    this.currentState = initialState ?? createDefaultEditorState();
    this.pushState(this.currentState);
  }

  /**
   * Get the current state.
   */
  getState(): EditorState {
    return this.currentState;
  }

  /**
   * Update the current state and push to history.
   */
  setState(state: EditorState): void {
    this.currentState = state;
    this.pushState(state);
  }

  /**
   * Update the current state without pushing to history.
   * Use for continuous updates like dragging.
   */
  updateStateQuiet(state: EditorState): void {
    this.currentState = state;
  }

  /**
   * Commit current state to history.
   * Call after continuous updates like drag end.
   */
  commitState(): void {
    this.pushState(this.currentState);
  }

  /**
   * Push a state to history.
   */
  private pushState(state: EditorState): void {
    // Remove any redo history
    this.history = this.history.slice(0, this.historyIndex + 1);

    // Add new state
    this.history.push(cloneEditorState(state));
    this.historyIndex = this.history.length - 1;

    // Trim history if too long
    if (this.history.length > this.maxHistory) {
      this.history.shift();
      this.historyIndex--;
    }
  }

  /**
   * Undo to previous state.
   */
  undo(): EditorState | null {
    if (!this.canUndo()) return null;

    this.historyIndex--;
    const historyState = this.history[this.historyIndex];
    if (!historyState) return null;
    this.currentState = cloneEditorState(historyState);
    return this.currentState;
  }

  /**
   * Redo to next state.
   */
  redo(): EditorState | null {
    if (!this.canRedo()) return null;

    this.historyIndex++;
    const historyState = this.history[this.historyIndex];
    if (!historyState) return null;
    this.currentState = cloneEditorState(historyState);
    return this.currentState;
  }

  /**
   * Check if undo is available.
   */
  canUndo(): boolean {
    return this.historyIndex > 0;
  }

  /**
   * Check if redo is available.
   */
  canRedo(): boolean {
    return this.historyIndex < this.history.length - 1;
  }

  /**
   * Get an entity by ID from current state.
   */
  getEntityById(editorId: string): EditorEntity | null {
    const state = this.currentState;

    // Search all entity arrays
    const allEntities: EditorEntity[] = [
      ...state.terrain,
      ...state.landingPads,
      ...state.fuelPickups,
      ...state.collectibles,
      ...state.multiplierBubbles,
      ...state.checkpoints,
      ...state.iceLayers,
      ...state.hazards,
      ...state.enemies,
    ];

    return allEntities.find((e) => e.editorId === editorId) ?? null;
  }

  /**
   * Remove an entity by ID.
   */
  removeEntity(editorId: string): void {
    const state = cloneEditorState(this.currentState);

    state.terrain = state.terrain.filter((e) => e.editorId !== editorId);
    state.landingPads = state.landingPads.filter((e) => e.editorId !== editorId);
    state.fuelPickups = state.fuelPickups.filter((e) => e.editorId !== editorId);
    state.collectibles = state.collectibles.filter((e) => e.editorId !== editorId);
    state.multiplierBubbles = state.multiplierBubbles.filter((e) => e.editorId !== editorId);
    state.checkpoints = state.checkpoints.filter((e) => e.editorId !== editorId);
    state.iceLayers = state.iceLayers.filter((e) => e.editorId !== editorId);
    state.hazards = state.hazards.filter((e) => e.editorId !== editorId);
    state.enemies = state.enemies.filter((e) => e.editorId !== editorId);

    this.setState(state);
  }

  /**
   * Add a new entity.
   */
  addEntity(entity: EditorEntity): void {
    const state = cloneEditorState(this.currentState);

    switch (entity.entityType) {
      case 'terrain':
        state.terrain.push(entity as EditorTerrainBlock);
        break;
      case 'landingPad':
        state.landingPads.push(entity as EditorLandingPad);
        break;
      case 'fuelPickup':
        state.fuelPickups.push(entity as EditorFuelPickup);
        break;
      case 'collectible':
        state.collectibles.push(entity as EditorCollectible);
        break;
      case 'multiplierBubble':
        state.multiplierBubbles.push(entity as EditorMultiplierBubble);
        break;
      case 'checkpoint':
        state.checkpoints.push(entity as EditorCheckpoint);
        break;
      case 'iceLayer':
        state.iceLayers.push(entity as EditorIceLayer);
        break;
      case 'patrolShip':
      case 'laserField':
      case 'bubbleGun':
      case 'warpZone':
      case 'gravityWell':
        state.hazards.push(entity as EditorHazard);
        break;
      case 'enemy':
        state.enemies.push(entity as EditorEnemy);
        break;
      case 'spawnPoint':
        state.spawnPoint = {
          x: (entity as any).x,
          y: (entity as any).y,
          bubbleColor: (entity as any).bubbleColor ?? 'green',
        };
        break;
    }

    this.setState(state);
  }

  /**
   * Update an entity's position.
   */
  updateEntityPosition(editorId: string, x: number, y: number, quiet = false): void {
    const state = quiet ? this.currentState : cloneEditorState(this.currentState);
    const entity = this.findEntityInState(state, editorId);

    if (entity) {
      if ('x' in entity) entity.x = x;
      if ('y' in entity) entity.y = y;
      if (entity.entityType === 'patrolShip' || entity.entityType === 'laserField' ||
          entity.entityType === 'bubbleGun' || entity.entityType === 'warpZone' ||
          entity.entityType === 'gravityWell' || entity.entityType === 'enemy') {
        const hazardEntity = entity as EditorHazard | EditorEnemy;
        if ('data' in hazardEntity && hazardEntity.data) {
          hazardEntity.data.x = x;
          hazardEntity.data.y = y;
        }
      }
    }

    if (quiet) {
      this.updateStateQuiet(state);
    } else {
      this.setState(state);
    }
  }

  /**
   * Update an entity's size.
   */
  updateEntitySize(editorId: string, width: number, height: number, quiet = false): void {
    const state = quiet ? this.currentState : cloneEditorState(this.currentState);
    const entity = this.findEntityInState(state, editorId);

    if (entity) {
      if ('width' in entity) (entity as any).width = width;
      if ('height' in entity) (entity as any).height = height;
      if (entity.entityType === 'patrolShip' || entity.entityType === 'warpZone') {
        const hazardEntity = entity as EditorHazard;
        if (hazardEntity.data && 'width' in hazardEntity.data) {
          hazardEntity.data.width = width;
        }
        if (hazardEntity.data && 'height' in hazardEntity.data) {
          hazardEntity.data.height = height;
        }
      }
    }

    if (quiet) {
      this.updateStateQuiet(state);
    } else {
      this.setState(state);
    }
  }

  /**
   * Update an entity with new properties.
   */
  updateEntity(entity: EditorEntity): void {
    const state = cloneEditorState(this.currentState);
    const existing = this.findEntityInState(state, entity.editorId);

    if (existing) {
      // Copy all properties from the updated entity
      Object.assign(existing, entity);
    }

    this.setState(state);
  }

  /**
   * Update spawn point position.
   */
  updateSpawnPoint(x: number, y: number, quiet = false): void {
    const state = quiet ? this.currentState : cloneEditorState(this.currentState);
    state.spawnPoint = {
      x,
      y,
      bubbleColor: state.spawnPoint.bubbleColor ?? 'green',
    };

    if (quiet) {
      this.updateStateQuiet(state);
    } else {
      this.setState(state);
    }
  }

  /**
   * Find entity reference in state.
   */
  private findEntityInState(state: EditorState, editorId: string): EditorEntity | null {
    const allArrays = [
      state.terrain,
      state.landingPads,
      state.fuelPickups,
      state.collectibles,
      state.multiplierBubbles,
      state.checkpoints,
      state.iceLayers,
      state.hazards,
      state.enemies,
    ];

    for (const arr of allArrays) {
      const found = arr.find((e: EditorEntity) => e.editorId === editorId);
      if (found) return found;
    }

    return null;
  }
}
