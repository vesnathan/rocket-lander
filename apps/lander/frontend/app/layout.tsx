import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Rocket Puzzle Lander',
  description: 'A physics-based rocket landing puzzle game',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, backgroundColor: '#0a0a15' }}>
        {children}
      </body>
    </html>
  );
}
