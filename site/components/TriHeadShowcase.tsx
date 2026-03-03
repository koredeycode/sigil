'use client';

import { ChevronLeft, ChevronRight, Globe, Monitor, TerminalSquare } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Terminal } from './Terminal';

const heads = [
  {
    id: 'cli',
    icon: TerminalSquare,
    title: 'CLI',
    subtitle: 'Headless',
    description: 'Powerful command-line interface for scripting, onboarding, cron-based automation, and background operations. Pipe outputs, chain commands, and integrate into any workflow.',
    features: ['Scriptable agent management', 'Cron job integration', 'Pipe-friendly output'],
  },
  {
    id: 'tui',
    icon: Monitor,
    title: 'TUI',
    subtitle: 'Interactive',
    description: 'A full-screen terminal dashboard built with Ink (React for CLI). Live portfolio monitoring, real-time log streaming, and keyboard-driven agent switching.',
    features: ['Live agent heartbeats', 'Real-time log streaming', 'Keyboard navigation'],
  },
  {
    id: 'dashboard',
    icon: Globe,
    title: 'Dashboard',
    subtitle: 'Visual',
    description: 'A local React web application for chat, analytics, and visual directive management. Access everything through your browser at localhost:74446.',
    features: ['Chat interface', 'Transaction analytics', 'Directive management'],
  },
];

const AUTO_SWITCH_INTERVAL = 5000;

export function TriHeadShowcase() {
  const [active, setActive] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [progress, setProgress] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startAutoSwitch = useCallback(() => {
    // Clear any existing timers
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (progressRef.current) clearInterval(progressRef.current);

    // Reset progress
    setProgress(0);

    // Progress bar updates every 50ms
    const progressStep = 50 / AUTO_SWITCH_INTERVAL;
    progressRef.current = setInterval(() => {
      setProgress(prev => Math.min(prev + progressStep, 1));
    }, 50);

    // Auto advance
    intervalRef.current = setInterval(() => {
      setActive(prev => (prev + 1) % heads.length);
      setProgress(0);
    }, AUTO_SWITCH_INTERVAL);
  }, []);

  useEffect(() => {
    startAutoSwitch();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (progressRef.current) clearInterval(progressRef.current);
    };
  }, [startAutoSwitch]);

  const selectTab = useCallback((index: number) => {
    setActive(index);
    startAutoSwitch();
  }, [startAutoSwitch]);

  const goNext = useCallback(() => {
    setActive((prev) => (prev + 1) % heads.length);
    startAutoSwitch();
  }, [startAutoSwitch]);

  const goPrev = useCallback(() => {
    setActive((prev) => (prev - 1 + heads.length) % heads.length);
    startAutoSwitch();
  }, [startAutoSwitch]);

  // Swipe handling
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    const diff = touchStart - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      diff > 0 ? goNext() : goPrev();
    }
    setTouchStart(null);
  };

  const current = heads[active];
  const Icon = current.icon;

  return (
    <section className="border-t border-border">
      <div className="mx-auto max-w-6xl px-6 py-24 sm:py-32">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
            The Tri-Head Architecture
          </h2>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Three interfaces, one brain. Real-time sync across every surface.
          </p>
        </div>

        {/* Tab Selector */}
        <div className="flex justify-center mb-10">
          <div className="inline-flex rounded-xl border border-border bg-card p-1 gap-1">
            {heads.map((head, i) => {
              const TabIcon = head.icon;
              return (
                <button
                  key={head.id}
                  onClick={() => selectTab(i)}
                  className={`relative flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all overflow-hidden ${
                    active === i
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                  }`}
                >
                  <TabIcon className="w-4 h-4" />
                  {head.title}
                  {active === i && (
                    <span
                      className="absolute bottom-0 left-0 h-0.5 bg-primary-foreground/40 transition-none"
                      style={{ width: `${progress * 100}%` }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div
          className="relative"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            {/* Visual Panel */}
            <div className="order-2 lg:order-1">
              {active === 0 ? (
                <Terminal />
              ) : (
                <div className="w-full rounded-xl border border-border bg-card overflow-hidden shadow-sm">
                  <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-secondary/50">
                    <div className="flex gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-red-400/60" />
                      <div className="w-3 h-3 rounded-full bg-yellow-400/60" />
                      <div className="w-3 h-3 rounded-full bg-green-400/60" />
                    </div>
                    <span className="text-xs text-muted-foreground font-mono ml-2">
                      {active === 1 ? 'sigil tui' : 'localhost:74446'}
                    </span>
                  </div>
                  <div className="p-6 font-mono text-sm min-h-[220px] flex flex-col justify-center items-center gap-4 text-center">
                    <Icon className="w-12 h-12 text-primary/40" />
                    <div>
                      <p className="text-foreground font-semibold mb-1">{current.title}</p>
                      <p className="text-muted-foreground text-xs max-w-xs">
                        {active === 1
                          ? 'Live dashboard with agent status, logs, and balance monitoring'
                          : 'Chat, analytics, and visual directive management in your browser'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Info Panel */}
            <div className="order-1 lg:order-2 flex flex-col justify-center">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <span className="text-xs font-mono text-primary uppercase tracking-wider">{current.subtitle}</span>
                  <h3 className="text-2xl font-bold tracking-tight">{current.title}</h3>
                </div>
              </div>

              <p className="text-muted-foreground leading-relaxed mb-6">
                {current.description}
              </p>

              <ul className="space-y-2">
                {current.features.map((feat) => (
                  <li key={feat} className="flex items-center gap-2.5 text-sm">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                    <span className="text-muted-foreground">{feat}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Prev / Next arrows (mobile) */}
          <div className="flex justify-center gap-3 mt-8 lg:hidden">
            <button
              onClick={goPrev}
              className="p-2 rounded-lg border border-border hover:bg-secondary transition-colors"
              aria-label="Previous"
            >
              <ChevronLeft className="w-5 h-5 text-muted-foreground" />
            </button>
            <div className="flex items-center gap-2">
              {heads.map((_, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    i === active ? 'bg-primary' : 'bg-border'
                  }`}
                />
              ))}
            </div>
            <button
              onClick={goNext}
              className="p-2 rounded-lg border border-border hover:bg-secondary transition-colors"
              aria-label="Next"
            >
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
