/**
 * @fileoverview Next.js component for mounting the Phaser game.
 * Uses dynamic import to ensure client-side only rendering.
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import type Phaser from 'phaser';

/**
 * Props for the GameCanvas component.
 */
interface GameCanvasProps {
  /** Width of the game canvas */
  width?: number;
  /** Height of the game canvas */
  height?: number;
  /** Starting level number (1-based) */
  startLevel?: number;
  /** Callback when game is ready */
  onReady?: (game: Phaser.Game) => void;
  /** Callback when game is destroyed */
  onDestroy?: () => void;
}

/**
 * Check if test level exists in sessionStorage (without removing it).
 * GameScene will read and remove the data itself.
 */
function hasTestLevelData(): boolean {
  if (typeof window === 'undefined') return false;
  return sessionStorage.getItem('testLevel') !== null;
}

/**
 * React component that mounts the Phaser game using dynamic import.
 *
 * This component handles:
 * - Client-side only rendering (no SSR)
 * - Dynamic Phaser import to avoid window reference errors
 * - Proper cleanup on unmount
 *
 * @example
 * ```tsx
 * // In a Next.js page
 * import dynamic from 'next/dynamic';
 *
 * const GameCanvas = dynamic(
 *   () => import('@/components/GameCanvas').then(mod => mod.GameCanvas),
 *   { ssr: false }
 * );
 *
 * export default function GamePage() {
 *   return <GameCanvas width={800} height={600} startLevel={1} />;
 * }
 * ```
 */
export function GameCanvas({
  width = 800,
  height = 600,
  startLevel = 1,
  onReady,
  onDestroy,
}: GameCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Early return if no container or game already exists
    if (!containerRef.current || gameRef.current) {
      return;
    }

    let mounted = true;

    async function initGame() {
      try {
        // Check if test level data exists (GameScene will read it itself)
        const isTestMode = hasTestLevelData();

        // Dynamic import of Phaser and game modules
        const [{ createGame }, { GameScene }] = await Promise.all([
          import('../game/Game'),
          import('../scenes/GameScene'),
        ]);

        // Check if component is still mounted
        if (!mounted || !containerRef.current) {
          return;
        }

        // Create the game instance
        const game = createGame(
          {
            parent: containerRef.current,
            width,
            height,
          },
          [GameScene]
        );

        gameRef.current = game;

        // Wait for game to be ready
        game.events.once('ready', () => {
          if (mounted) {
            setIsLoading(false);

            // If not in test mode, set the start level
            // (test mode is handled by GameScene reading sessionStorage)
            if (!isTestMode) {
              const scene = game.scene.getScene('GameScene') as any;
              if (scene) {
                scene.data.set('startLevel', startLevel);
              }
            }

            onReady?.(game);
          }
        });
      } catch (err) {
        if (mounted) {
          setError(
            err instanceof Error ? err.message : 'Failed to initialize game'
          );
          setIsLoading(false);
        }
      }
    }

    initGame();

    // Cleanup function
    return () => {
      mounted = false;

      if (gameRef.current) {
        gameRef.current.destroy(true, false);
        gameRef.current = null;
        onDestroy?.();
      }
    };
  }, [width, height, startLevel, onReady, onDestroy]);

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
        data-testid="game-canvas"
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
          Loading...
        </div>
      )}
    </div>
  );
}

export default GameCanvas;
