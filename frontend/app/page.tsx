'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useEffect, useState } from 'react';

const GameCanvas = dynamic(
  () => import('../components/GameCanvas').then((mod) => mod.GameCanvas),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0a0a15',
          color: '#ffffff',
          fontFamily: 'monospace',
          fontSize: '14px',
        }}
      >
        Loading...
      </div>
    ),
  }
);

/**
 * Phone frame component that wraps the game canvas
 * to simulate a mobile device in landscape orientation.
 */
function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        // Phone outer shell
        width: '740px',
        height: '380px',
        backgroundColor: '#1a1a1a',
        borderRadius: '40px',
        padding: '12px 50px',
        boxShadow: `
          0 0 0 3px #333,
          0 0 0 6px #1a1a1a,
          0 25px 50px rgba(0, 0, 0, 0.5),
          inset 0 0 20px rgba(0, 0, 0, 0.3)
        `,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
      }}
    >
      {/* Left side buttons (volume) */}
      <div
        style={{
          position: 'absolute',
          left: '-3px',
          top: '80px',
          width: '3px',
          height: '40px',
          backgroundColor: '#333',
          borderRadius: '2px 0 0 2px',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: '-3px',
          top: '130px',
          width: '3px',
          height: '40px',
          backgroundColor: '#333',
          borderRadius: '2px 0 0 2px',
        }}
      />
      {/* Right side button (power) */}
      <div
        style={{
          position: 'absolute',
          right: '-3px',
          top: '100px',
          width: '3px',
          height: '50px',
          backgroundColor: '#333',
          borderRadius: '0 2px 2px 0',
        }}
      />
      {/* Screen bezel */}
      <div
        style={{
          width: '640px',
          height: '356px',
          backgroundColor: '#000',
          borderRadius: '8px',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* Notch/camera (landscape = on the side) */}
        <div
          style={{
            position: 'absolute',
            left: '10px',
            top: '50%',
            transform: 'translateY(-50%)',
            width: '8px',
            height: '8px',
            backgroundColor: '#1a1a1a',
            borderRadius: '50%',
            zIndex: 10,
            boxShadow: 'inset 0 0 2px rgba(50, 50, 80, 0.5)',
          }}
        />
        {/* Game screen */}
        <div style={{ width: '100%', height: '100%' }}>
          {children}
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const [levelHint, setLevelHint] = useState<string>('');
  const [currentLevel, setCurrentLevel] = useState<number>(1);

  useEffect(() => {
    const handleLevelChange = (e: CustomEvent<{ level: number; hint: string }>) => {
      setLevelHint(e.detail.hint || '');
      setCurrentLevel(e.detail.level || 1);
    };
    window.addEventListener('levelChange', handleLevelChange as EventListener);
    return () => {
      window.removeEventListener('levelChange', handleLevelChange as EventListener);
    };
  }, []);

  return (
    <main
      style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0d0d12',
        gap: '16px',
      }}
    >
      {/* Title */}
      <h1
        style={{
          color: '#fff',
          fontFamily: 'monospace',
          fontSize: '24px',
          fontWeight: 'normal',
          margin: 0,
          letterSpacing: '4px',
          textTransform: 'uppercase',
        }}
      >
        🚀 Rocket Lander
      </h1>

      {/* Phone frame with game */}
      <PhoneFrame>
        <GameCanvas width={640} height={356} startLevel={1} />
      </PhoneFrame>

      {/* Controls hint */}
      <p
        style={{
          color: '#666',
          fontFamily: 'monospace',
          fontSize: '12px',
          margin: 0,
        }}
      >
        A/D or ←/→ to rotate • SPACE for thrust • Land gently on the green pad
      </p>

      {/* Dev: Level strategy hint */}
      {levelHint && (
        <p
          style={{
            color: '#fff',
            fontFamily: 'monospace',
            fontSize: '12px',
            margin: 0,
          }}
        >
          💡 {levelHint}
        </p>
      )}

      {/* Dev: Level shortcuts */}
      <p
        style={{
          color: '#444',
          fontFamily: 'monospace',
          fontSize: '10px',
          margin: 0,
        }}
      >
        DEV: Press 1-9 for levels, 0 for level 10
      </p>

      {/* Level Editor link */}
      <Link
        href={`/editor?level=${currentLevel}`}
        style={{
          color: '#4488ff',
          fontFamily: 'monospace',
          fontSize: '12px',
          textDecoration: 'none',
          padding: '8px 16px',
          border: '1px solid #4488ff',
          borderRadius: '4px',
          marginTop: '8px',
        }}
      >
        Open Level Editor
      </Link>
    </main>
  );
}
