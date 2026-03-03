'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const footerLinks = {
  Product: [
    { href: '/docs', label: 'Documentation' },
    { href: '/docs/getting-started/quick-start', label: 'Quick Start' },
    { href: '/docs/cli/reference', label: 'CLI Reference' },
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
              <span className="font-bold text-lg">Sigil</span>
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
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Sigil — Built by Yusuf Akorede
          </p>
          <p className="text-xs text-muted-foreground">
            Built for Solana Devnet
          </p>
        </div>
      </div>
    </footer>
  );
}
