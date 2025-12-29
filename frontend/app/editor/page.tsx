'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

const EditorCanvas = dynamic(
  () => import('../../components/EditorCanvas').then((mod) => mod.EditorCanvas),
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
          backgroundColor: '#1a1a2e',
          color: '#ffffff',
          fontFamily: 'monospace',
          fontSize: '14px',
        }}
      >
        Loading Level Editor...
      </div>
    ),
  }
);

function EditorContent() {
  const searchParams = useSearchParams();
  const levelParam = searchParams.get('level');
  const levelNumber = levelParam ? parseInt(levelParam, 10) : undefined;
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
        gap: '12px',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '20px',
        }}
      >
        <Link
          href="/"
          style={{
            color: '#666',
            fontFamily: 'monospace',
            fontSize: '12px',
            textDecoration: 'none',
          }}
        >
          ← Back to Game
        </Link>

        <h1
          style={{
            color: '#fff',
            fontFamily: 'monospace',
            fontSize: '20px',
            fontWeight: 'normal',
            margin: 0,
            letterSpacing: '2px',
            textTransform: 'uppercase',
          }}
        >
          Level Editor
        </h1>
      </div>

      {/* Editor Canvas */}
      <div
        style={{
          backgroundColor: '#1a1a2e',
          borderRadius: '8px',
          padding: '4px',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)',
        }}
      >
        <EditorCanvas width={1200} height={700} levelNumber={levelNumber} />
      </div>

      {/* Instructions */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '4px',
        }}
      >
        <p
          style={{
            color: '#666',
            fontFamily: 'monospace',
            fontSize: '11px',
            margin: 0,
          }}
        >
          Drag items from palette to canvas • Click to select • DEL to delete • G for grid toggle
        </p>
        <p
          style={{
            color: '#666',
            fontFamily: 'monospace',
            fontSize: '11px',
            margin: 0,
          }}
        >
          Ctrl+Z/Y for undo/redo • TEST to play • EXPORT to copy TypeScript code
        </p>
      </div>
    </main>
  );
}

export default function EditorPage() {
  return (
    <Suspense fallback={<div style={{ backgroundColor: '#0d0d12', width: '100vw', height: '100vh' }} />}>
      <EditorContent />
    </Suspense>
  );
}
