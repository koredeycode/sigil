'use client';

import { CommandBox } from '@/components/CommandBox';
import { TriHeadShowcase } from '@/components/TriHeadShowcase';
import { motion } from 'framer-motion';
import { ArrowRight, Cpu, Github, Globe, Layers, Shield, Terminal as TerminalIcon, Zap } from 'lucide-react';

const features = [
  {
    icon: Shield,
    title: 'Local Sovereignty',
    description: 'Keys stay in an encrypted file system. Data stays in SQLite. Nothing leaves your machine.',
  },
  {
    icon: Cpu,
    title: 'Provider Agnostic',
    description: 'Bring any LLM. OpenAI, Anthropic, Ollama — swap with a single command.',
  },
  {
    icon: Layers,
    title: 'Guardrails-First',
    description: 'Hard-coded safety layers enforce limits independent of the LLM. No exceptions.',
  },
  {
    icon: Zap,
    title: 'Kill Switch',
    description: 'One command halts all signing and wipes keys from memory. Instantly.',
  },
  {
    icon: TerminalIcon,
    title: 'Tri-Head Sync',
    description: 'CLI, TUI, and Web Dashboard synchronized in real-time via WebSockets.',
  },
  {
    icon: Globe,
    title: 'Devnet-Native',
    description: 'Built for Solana Devnet. Real transactions, real protocols, zero mainnet risk.',
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.21, 0.47, 0.32, 0.98],
    },
  },
};

export function HomeClient() {
  return (
    <div className="flex-1">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <motion.div 
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          className="mx-auto max-w-6xl px-6 pt-20 pb-24 sm:pt-28 sm:pb-32"
        >
          <div className="flex flex-col items-center text-center">
            <motion.img
              variants={itemVariants}
              src="/logo.png"
              alt="Sigil"
              width={72}
              height={72}
              className="mb-8 object-contain"
            />

            {/* <motion.div 
              variants={itemVariants}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-primary/20 bg-primary/5 text-primary text-xs font-semibold mb-8"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
              </span>
              Local-First Autonomous Agent
            </motion.div> */}

            <motion.h1 
              variants={itemVariants}
              className="text-5xl sm:text-7xl font-bold tracking-tight mb-6 leading-[1.1]"
            >
              The wallet that&apos;s<br />
              actually <span className="text-primary animate-pulse">alive</span>.
            </motion.h1>

            <motion.p 
              variants={itemVariants}
              className="text-lg sm:text-xl text-muted-foreground max-w-2xl mb-10 leading-relaxed"
            >
              Spawn independent AI agents on Solana. They monitor, trade, and rebalance
              your portfolio while you sleep — with keys that never leave your machine.
            </motion.p>

            <motion.div 
              variants={itemVariants}
              className="flex flex-col sm:flex-row items-center gap-4 mb-6"
            >
              <CommandBox command="npm i -g sigil" className="w-72" />
              <a
                href="/docs"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-foreground text-background text-sm font-semibold hover:opacity-90 transition-opacity"
              >
                Read the docs
                <ArrowRight className="w-4 h-4" />
              </a>
            </motion.div>

            <motion.div 
              variants={itemVariants}
              className="mt-4 flex flex-col items-center gap-3 w-full max-w-2xl"
            >
              <p className="text-sm text-muted-foreground text-center">
                <b className="text-primary font-semibold">AI Agents:</b> Use the instruction set below to manage Sigil.
              </p>
              <CommandBox command="Read https://sigil-wallet.vercel.app/skill.md and use the instructions to set up Sigil." className="w-full" />
            </motion.div>
          </div>
        </motion.div>

        {/* Gradient ambient */}
        <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/5 rounded-full blur-[120px]" 
          />
        </div>
      </section>

      {/* Tri-Head Showcase */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.8, ease: [0.21, 0.47, 0.32, 0.98] }}
      >
        <TriHeadShowcase />
      </motion.div>

      {/* Features */}
      <section className="border-t border-border">
        <div className="mx-auto max-w-6xl px-6 py-24 sm:py-32">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
              Built for safety and autonomy
            </h2>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto">
              Every design decision prioritizes security without sacrificing capability.
            </p>
          </motion.div>

          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            variants={containerVariants}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8"
          >
            {features.map((feature) => (
              <motion.div 
                key={feature.title} 
                variants={itemVariants}
                whileHover={{ y: -5, transition: { duration: 0.2 } }}
                className="flex flex-col gap-3 p-6 rounded-xl border border-border bg-card hover:shadow-sm transition-shadow"
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <feature.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-semibold text-lg">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border">
        <div className="mx-auto max-w-6xl px-6 py-24 sm:py-32">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: [0.21, 0.47, 0.32, 0.98] }}
            className="rounded-2xl border border-border bg-card p-12 sm:p-16 text-center relative overflow-hidden"
          >
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
              Ready to get started?
            </h2>
            <p className="text-lg text-muted-foreground mb-10 max-w-lg mx-auto">
              Install Sigil and deploy your first autonomous agent in under two minutes.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <CommandBox command="npm i -g sigil" className="max-w-sm w-full" />
              <a
                href="https://github.com/koredeycode/sigil"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl border border-border text-sm font-semibold hover:bg-secondary transition-colors"
              >
                <Github className="w-4 h-4" />
                View on GitHub
              </a>
            </div>

            {/* Decorative glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-primary/5 rounded-full blur-[120px] -z-10" />
          </motion.div>
        </div>
      </section>
    </div>
  );
}
