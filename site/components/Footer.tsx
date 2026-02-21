'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function Footer() {
  const pathname = usePathname();
  
  // Hide footer on documentation pages
  if (pathname.startsWith('/docs')) {
    return null;
  }

  return (
    <footer className="py-16 mt-auto flex flex-col items-center gap-6 border-t border-white/5 overflow-hidden">
      <div className="flex flex-wrap justify-center items-center gap-x-4 gap-y-2 text-xs font-bold uppercase tracking-widest text-muted-foreground/50">
        <Link href="/" className="hover:text-primary transition-colors">Home</Link>
        <span className="opacity-20">•</span>
        <Link href="/blog" className="hover:text-primary transition-colors">Blog</Link>
        <span className="opacity-20">•</span>
        <Link href="/docs" className="hover:text-primary transition-colors">Docs</Link>
        <span className="opacity-20">•</span>
        <Link href="https://github.com/koredeycode/sigil" className="hover:text-primary transition-colors">GitHub</Link>
      </div>
      
      <div className="text-[10px] text-muted-foreground/30 font-mono tracking-widest flex items-center gap-2">
        Built by Yusuf Akorede <span className="text-primary animate-pulse">⚡</span>
      </div>
    </footer>
  );
}
