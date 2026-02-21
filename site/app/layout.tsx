import { Footer } from '@/components/Footer';
import { ThemeToggle } from '@/components/ThemeToggle';
import { RootProvider } from 'fumadocs-ui/provider/next';
import { ThemeProvider } from 'next-themes';
import { JetBrains_Mono, Outfit } from 'next/font/google';
import type { ReactNode } from 'react';
import './global.css';

const sans = Outfit({
  subsets: ['latin'],
  variable: '--font-sans',
});

const mono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
});

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`} suppressHydrationWarning>
      <body className="flex flex-col min-h-screen font-sans">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <RootProvider>
            <ThemeToggle />
            {children}
            <Footer />
          </RootProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
