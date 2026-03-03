import { Navbar } from '@/components/Navbar';
import type { ReactNode } from 'react';

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="flex-1 flex flex-col">
      <Navbar />
      {children}
    </div>
  );
}
