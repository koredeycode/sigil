'use client';

import { ExternalLink, Menu, Monitor, Moon, Sun, X } from 'lucide-react';
import { useTheme } from 'next-themes';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

const links = [
  { href: '/blog', label: 'Blog' },
  { href: '/docs', label: 'Docs', external: true },
  { href: 'https://github.com/koredeycode/sigil', label: 'GitHub', external: true },
];

export function Navbar() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => setMounted(true), []);

  const handleThemeToggle = () => {
    if (theme === 'light') return setTheme('dark');
    if (theme === 'dark') return setTheme('system');
    return setTheme('light');
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <Image src="/logo.png" alt="Sigil Wallet" width={28} height={28} className="object-contain" />
          <span className="text-lg font-bold tracking-tight">Sigil Wallet</span>
        </Link>

        {/* Desktop Links */}
        <div className="hidden md:flex items-center gap-1">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              {...(link.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                pathname.startsWith(link.href) && !link.external
                  ? 'text-primary bg-primary/10'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
              }`}
            >
              {link.label}
              {link.external && <ExternalLink className="w-3.5 h-3.5 opacity-70" />}
            </Link>
          ))}

          {/* Theme Toggle */}
          {mounted && (
            <button
              onClick={handleThemeToggle}
              className="ml-2 p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
              aria-label="Toggle theme"
            >
              {theme === 'system' ? <Monitor className="w-4 h-4" /> : theme === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border/50 bg-background/95 backdrop-blur-xl">
          <div className="flex flex-col p-4 gap-1">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                {...(link.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                className={`flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  pathname.startsWith(link.href) && !link.external
                    ? 'text-primary bg-primary/10'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                }`}
              >
                {link.label}
                {link.external && <ExternalLink className="w-4 h-4 opacity-70" />}
              </Link>
            ))}
            {mounted && (
              <button
                onClick={() => {
                  handleThemeToggle();
                  setMobileOpen(false);
                }}
                className="flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
              >
                {theme === 'system' ? <Monitor className="w-4 h-4" /> : theme === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                {theme === 'system' ? 'System Theme' : theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
              </button>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
