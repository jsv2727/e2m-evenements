import type { Metadata } from 'next';
import './globals.css';
import Sidebar from '@/components/Sidebar';

export const metadata: Metadata = {
  title: 'E2M — Gestion d\'Événements',
  description: 'Plateforme professionnelle de gestion d\'événements avec IA Anthropic',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="bg-slate-950 text-slate-100 min-h-screen">
        <Sidebar />
        <main className="ml-[260px] min-h-screen flex flex-col">
          {children}
        </main>
      </body>
    </html>
  );
}
