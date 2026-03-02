import { CommandBox } from '@/components/CommandBox';
import { Terminal } from '@/components/Terminal';
import { BookOpen, ChevronRight, Github } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="flex flex-col items-center min-h-screen pt-16 pb-24 px-4 overflow-hidden selection:bg-primary selection:text-primary-foreground">
      {/* Background Ambience */}
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_50%_0%,rgba(var(--primary-rgb),0.08),transparent_50%)] pointer-events-none" />
      {/* The following line was removed: <div className="fixed inset-0 -z-20 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-10 pointer-events-none" /> */}

      {/* Hero Section */}
      <div className="flex flex-col items-center max-w-4xl w-full text-center mb-20 relative">
        <div className="relative mb-8 animate-in fade-in zoom-in duration-1000">
           <Image 
             src="/logo.png" 
             alt="Sigil Logo" 
             width={180} 
             height={180} 
             className="drop-shadow-xl hover:scale-105 transition-transform duration-700 object-contain"
             priority
           />
        </div>

        <h1 className="text-8xl sm:text-[13rem] font-black tracking-tighter mb-6 leading-none bg-clip-text text-transparent bg-gradient-to-b from-foreground via-foreground/90 to-foreground/20 select-none drop-shadow-2xl">
          SIGIL
        </h1>
        
        <div className="flex flex-col items-center gap-6 mb-12">
          <div className="px-4 py-1.5 rounded-full border border-primary/20 bg-primary/5 text-primary text-[10px] font-black uppercase tracking-[0.4em] flex items-center gap-2 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            Local-First Autonomous Agent
          </div>
          
          <p className="max-w-2xl text-xl sm:text-2xl text-muted-foreground/50 leading-tight font-medium tracking-tight animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-150">
            The wallet that's actually <span className="text-foreground">alive</span>. 
            Spawn independent agents to monitor, trade, and <br className="hidden sm:block" /> rebalance while you sleep.
          </p>
        </div>

        <div className="flex flex-col items-center gap-6 w-full mb-12">
          <CommandBox command="npm i -g sigil" className="max-w-sm w-full" />
        </div>
      </div>

      {/* Main Content Flow */}
      <div className="flex flex-col items-center gap-12 max-w-4xl w-full">
        <Terminal />

        <div className="flex flex-wrap justify-center gap-4 w-full px-4">
           <SimpleCard 
             href="/docs"
             icon={<BookOpen className="w-5 h-5 text-primary" />}
             title="Documentation"
             description="Master the Tri-Head architecture."
           />
           <SimpleCard 
             href="https://github.com/koredeycode/sigil"
             icon={<Github className="w-5 h-5 text-primary" />}
             title="GitHub"
             description="Source, issues, and discussions."
           />
        </div>

        {/* Core Value Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full px-4 mt-12">
          <PillarCard 
            title="Provider Agnostic" 
            description="Bring Your Own Brain. Support for 10+ LLM providers including OpenAI, Anthropic, and local Ollama." 
          />
          <PillarCard 
            title="Local Sovereignty" 
            description="Your keys, your data. SQLite and OS Keychain storage ensure no sensitive data ever leaves your device." 
          />
          <PillarCard 
            title="Guardrails-First" 
            description="Independent safety layers enforce transaction limits and slippage caps regardless of model output." 
          />
          <PillarCard 
            title="Tri-Head Sync" 
            description="Seamless real-time state synchronization across TUI, CLI, and Web Dashboard via WebSockets." 
          />
          <PillarCard 
            title="Kill Switch" 
            description="A hard-coded safety override instantly halts all signing capabilities across all running agents." 
          />
          <PillarCard 
            title="Devnet-Native" 
            description="Built for Solana Devnet. Real transactions, real protocols, zero mainnet risk during development." 
          />
        </div>

        {/* Tri-Head Architecture Section */}
        <div className="w-full px-4 mt-24">
          <h2 className="text-4xl font-bold tracking-tighter mb-12 text-center uppercase">The Tri-Head Architecture</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <ArchCard 
              title="Interactive TUI" 
              subtitle="Built with Ink" 
              description="A full-screen terminal dashboard for live portfolio monitoring and agent interaction." 
            />
            <ArchCard 
              title="Headless CLI" 
              subtitle="Automation First" 
              description="Powerful command-line interface for scripting, onboarding, and background operations." 
            />
            <ArchCard 
              title="Web Dashboard" 
              subtitle="Modern Visuals" 
              description="A local visual interface for chat, analytics, and complex directive management." 
            />
          </div>
        </div>

        <div className="mt-24 text-center">
          <p className="text-xs text-muted-foreground uppercase tracking-widest opacity-50">
            Built for the decentralized web • 2026
          </p>
        </div>
      </div>
    </div>
  );
}

function PillarCard({ title, description }: { title: string, description: string }) {
  return (
    <div className="p-8 rounded-3xl border border-border bg-card shadow-sm hover:shadow-md transition-all flex flex-col gap-3 text-left">
      <h3 className="text-primary font-bold text-sm uppercase tracking-widest">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}

function ArchCard({ title, subtitle, description }: { title: string, subtitle: string, description: string }) {
  return (
    <div className="p-10 rounded-[2.5rem] border border-border bg-gradient-to-b from-secondary/50 to-transparent flex flex-col gap-4 text-center">
      <div>
        <h3 className="text-2xl font-bold tracking-tight">{title}</h3>
        <p className="text-[10px] text-primary font-mono uppercase tracking-[0.2em] mt-1">{subtitle}</p>
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}

function SimpleCard({ href, icon, title, description }: { href: string, icon: React.ReactNode, title: string, description: string }) {
  return (
    <Link 
      href={href}
      className="p-6 rounded-2xl border border-border bg-card hover:border-primary/50 transition-all group flex flex-col gap-4 text-left shadow-sm hover:shadow-md"
    >
      <div className="p-2 rounded-lg bg-secondary w-fit group-hover:bg-primary/10 transition-colors">
        {icon}
      </div>
      <div>
        <h3 className="font-bold text-lg flex items-center gap-2 group-hover:text-primary transition-colors">
          {title}
          <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
        </h3>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
          {description}
        </p>
      </div>
    </Link>
  );
}
