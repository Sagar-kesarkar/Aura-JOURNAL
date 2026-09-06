import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'Aura Journal — A little space for yourself',
  description:
    'A thoughtful journaling workspace. Frontend demo with journal entries, voice recording, recurring threads, and weekly review.',
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
