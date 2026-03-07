import { CommandBox } from '@/components/CommandBox';
import { ArrowLeft, ArrowRight, Github } from 'lucide-react';

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
              <Github className="w-4 h-4" />
              View on GitHub
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
