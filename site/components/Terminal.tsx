'use client';

import { useEffect, useState } from 'react';

const lines = [
  { prompt: true, text: 'sigil init' },
  { prompt: false, text: '✓ Workspace initialized', color: 'text-primary' },
  { prompt: true, text: 'sigil agent create --name "alpha"' },
  { prompt: false, text: '✓ Agent "alpha" created — wallet generated', color: 'text-primary' },
  { prompt: true, text: 'sigil agent start "alpha"' },
  { prompt: false, text: '● Agent "alpha" is now running', color: 'text-yellow-500 dark:text-yellow-400' },
  { prompt: false, text: '[thought] Checking SOL balance...', color: 'text-muted-foreground' },
  { prompt: false, text: '[action] Requesting 1 SOL airdrop', color: 'text-blue-500 dark:text-blue-400' },
  { prompt: false, text: '✓ Transaction confirmed: 4sK...mR9', color: 'text-primary' },
];

export function Terminal() {
  const [visibleLines, setVisibleLines] = useState(0);

  useEffect(() => {
    if (visibleLines >= lines.length) return;

    const delay = lines[visibleLines]?.prompt ? 800 : 400;
    const timeout = setTimeout(() => {
      setVisibleLines((prev) => prev + 1);
    }, delay);

    return () => clearTimeout(timeout);
  }, [visibleLines]);

  return (
    <div className="w-full max-w-2xl rounded-xl border border-border bg-card overflow-hidden shadow-sm">
      {/* Title Bar */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-secondary/50">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-400/60" />
          <div className="w-3 h-3 rounded-full bg-yellow-400/60" />
          <div className="w-3 h-3 rounded-full bg-green-400/60" />
        </div>
        <span className="text-xs text-muted-foreground font-mono ml-2">terminal</span>
      </div>

      {/* Output */}
      <div className="p-5 font-mono text-sm leading-relaxed min-h-[220px]">
        {lines.slice(0, visibleLines).map((line, i) => (
          <div key={i} className="flex gap-2 animate-in fade-in slide-in-from-bottom-1 duration-300">
            {line.prompt ? (
              <>
                <span className="text-primary select-none">❯</span>
                <span className="text-foreground">{line.text}</span>
              </>
            ) : (
              <span className={`ml-5 ${line.color || 'text-muted-foreground'}`}>{line.text}</span>
            )}
          </div>
        ))}
        {visibleLines < lines.length && (
          <div className="flex gap-2 mt-0.5">
            <span className="text-primary select-none">❯</span>
            <span className="w-2 h-5 bg-primary/70 animate-pulse" />
          </div>
        )}
      </div>
    </div>
  );
}
