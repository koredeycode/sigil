import { CommandBox } from '@/components/CommandBox';
import { ArrowLeft, ArrowRight } from 'lucide-react';

export default function DemoPage() {
  return (
    <main className="min-h-screen bg-background pt-24 pb-16 px-6">
      <div className="mx-auto max-w-4xl">
        <a 
          href="/" 
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8 group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back to home
        </a>
        
        <div className="space-y-6 mb-12">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">Sigil Wallet Demo</h1>
          <p className="text-lg text-muted-foreground max-w-2xl leading-relaxed">
            See Sigil in action. This demo covers the initial setup, creating an agent, 
            and watching it execute trades autonomously on the Solana Devnet.
          </p>
        </div>

        <div className="relative aspect-video rounded-2xl overflow-hidden border border-border shadow-2xl bg-card mb-16">
          <iframe
            src="https://www.youtube.com/embed/UmhQZ-eeWbk?autoplay=1"
            title="Sigil Wallet Demo"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            className="absolute inset-0 w-full h-full"
          ></iframe>
        </div>

        <div className="flex flex-col items-center text-center space-y-8 max-w-2xl mx-auto">
          <div className="space-y-3">
            <h2 className="text-2xl font-bold">Ready to deploy your first agent?</h2>
            <p className="text-muted-foreground">
              Install Sigil globally and start your autonomous journey on Solana today.
            </p>
          </div>

          <div className="w-full max-w-md">
            <CommandBox command="npm i -g sigil-wallet" className="w-full" />
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4">
            <a
              href="/docs"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-foreground text-background text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              Read the docs
              <ArrowRight className="w-4 h-4" />
            </a>
            <a
              href="https://github.com/koredeycode/sigil"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl border border-border text-sm font-semibold hover:bg-secondary transition-colors"
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.43.372.82 1.102.82 2.222 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>
              View on GitHub
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
