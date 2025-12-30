/**
 * @fileoverview Next.js component for mounting the Level Editor.
 * Uses dynamic import to ensure client-side only rendering.
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import type Phaser from 'phaser';
import type { Level } from '@shared/types/Level';
import type { EditorState } from '../editor/types';

/**
 * Props for the EditorCanvas component.
 */
interface EditorCanvasProps {
  /** Width of the editor canvas */
  width?: number;
  /** Height of the editor canvas */
  height?: number;
  /** Initial level to load for editing */
  initialLevel?: Level;
  /** Level number to load (1-12) */
  levelNumber?: number;
  /** Callback when editor is ready */
  onReady?: (game: Phaser.Game) => void;
  /** Callback when editor is destroyed */
  onDestroy?: () => void;
}

/**
 * Check for saved editor state in sessionStorage (returning from test mode).
 */
function getSavedEditorState(): EditorState | null {
  if (typeof window === 'undefined') return null;

  const data = sessionStorage.getItem('editorState');
  if (!data) return null;

  try {
    const parsed = JSON.parse(data);
    // Clear it after reading
    sessionStorage.removeItem('editorState');
    return parsed;
  } catch {
    return null;
  }
}

/**
 * React component that mounts the Level Editor scene.
 */
export function EditorCanvas({
  width = 800,
  height = 480,
  initialLevel,
  levelNumber,
  onReady,
  onDestroy,
}: EditorCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current || gameRef.current) {
      return;
    }

    let mounted = true;

    async function initEditor() {
      try {
        // Check for saved editor state (returning from test mode)
        const savedState = getSavedEditorState();

        // Dynamic import of Phaser and editor modules
        const [{ createGame }, { LevelEditorScene }, { GameScene }] = await Promise.all([
          import('../game/Game'),
          import('../scenes/LevelEditorScene'),
          import('../scenes/GameScene'),
        ]);

        if (!mounted || !containerRef.current) {
          return;
        }

        // Create game instance with both editor and game scenes
        const game = createGame(
          {
            parent: containerRef.current,
            width,
            height,
          },
          [LevelEditorScene, GameScene]
        );

        gameRef.current = game;

        // Wait for game to be ready
        game.events.once('ready', () => {
          if (mounted) {
            setIsLoading(false);

            // Start the editor scene with initial data
            // Prefer saved state from test mode, otherwise use props
            game.scene.start('LevelEditorScene', {
              editorState: savedState,
              level: savedState ? undefined : initialLevel,
              levelNumber: savedState ? undefined : levelNumber,
            });

            onReady?.(game);
          }
        });
      } catch (err) {
        if (mounted) {
          setError(
            err instanceof Error ? err.message : 'Failed to initialize editor'
          );
          setIsLoading(false);
        }
      }
    }

    initEditor();

    return () => {
      mounted = false;

      if (gameRef.current) {
        gameRef.current.destroy(true, false);
        gameRef.current = null;
        onDestroy?.();
      }
    };
  }, [width, height, initialLevel, levelNumber, onReady, onDestroy]);

  if (error) {
    return (
      <div
        style={{
          width,
          height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#1a1a2e',
          color: '#ff6b6b',
          fontFamily: 'monospace',
        }}
      >
        Error: {error}
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', width, height }}>
      <div
        ref={containerRef}
        style={{ width: '100%', height: '100%' }}
        data-testid="editor-canvas"
      />
      {isLoading && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#1a1a2e',
            color: '#ffffff',
            fontFamily: 'monospace',
          }}
        >
          Loading Editor...
        </div>
      )}
    </div>
  );
}

export default EditorCanvas;
