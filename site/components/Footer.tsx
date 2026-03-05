'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const footerLinks = {
  Product: [
    { href: '/docs', label: 'Documentation' },
    { href: '/docs/getting-started/quick-start', label: 'Quick Start' },
    { href: '/docs/cli', label: 'CLI Reference' },
  ],
  Resources: [
    { href: '/blog', label: 'Blog' },
    { href: 'https://github.com/koredeycode/sigil', label: 'GitHub', external: true },
    { href: 'https://github.com/koredeycode/sigil/issues', label: 'Issues', external: true },
  ],
};

export function Footer() {
  const pathname = usePathname();

  if (pathname.startsWith('/docs')) {
    return null;
  }

  return (
    <footer className="border-t border-border">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-12">
          {/* Brand */}
          <div className="col-span-2 sm:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <img src="/logo.png" alt="Sigil" className="w-6 h-6 object-contain" />
              <span className="font-bold text-lg">Sigil Wallet</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
              Local-first autonomous AI agents for Solana. Your keys, your data, your agents.
            </p>
          </div>

          {/* Link Columns */}
          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
                {title}
              </h4>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      {...('external' in link ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-16 pt-8 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground flex items-center flex-wrap gap-1">
            © {new Date().getFullYear()} Sigil Wallet — Built by <a href="https://korecodes.is-a.dev" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors underline underline-offset-2">Yusuf Akorede</a>
          </p>
          <div className="text-xs text-muted-foreground flex items-center gap-1.5 opacity-80 hover:opacity-100 transition-opacity">
            Built for Solana Devnet 
            <svg className="w-3.5 h-3.5" viewBox="0 0 397 311" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M64.6 237.9c2.4-2.4 5.7-3.8 9.2-3.8h317.4c5.8 0 8.7 7 4.6 11.1l-62.7 62.7c-2.4 2.4-5.7 3.8-9.2 3.8H6.5c-5.8 0-8.7-7-4.6-11.1l62.7-62.7z" fill="currentColor"/><path d="M64.6 3.8C67.1 1.4 70.4 0 73.8 0h317.4c5.8 0 8.7 7 4.6 11.1l-62.7 62.7c-2.4 2.4-5.7 3.8-9.2 3.8H6.5c-5.8 0-8.7-7-4.6-11.1L64.6 3.8z" fill="currentColor"/><path d="M333.1 120.1c-2.4-2.4-5.7-3.8-9.2-3.8H6.5c-5.8 0-8.7 7-4.6 11.1l62.7 62.7c2.4 2.4 5.7 3.8 9.2 3.8h317.4c5.8 0 8.7-7 4.6-11.1l-62.7-62.7z" fill="currentColor"/></svg>
          </div>
        </div>
      </div>
    </footer>
  );
}
