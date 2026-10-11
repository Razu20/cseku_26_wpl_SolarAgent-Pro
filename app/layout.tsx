import type { Metadata } from 'next';
import '../src/styles.css';

export const metadata: Metadata = {
  title: 'SolarAgent Pro',
  description: 'Solar energy operations and marketplace platform.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

