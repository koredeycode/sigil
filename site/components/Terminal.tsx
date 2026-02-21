'use client';

import { useEffect, useState } from 'react';

const commands = [
  'sigil init',
  'sigil agent create --name "alpha"',
  'sigil agent start "alpha"',
  'sigil log alpha'
];

export function Terminal() {
  const [text, setText] = useState('');
  const [commandIndex, setCommandIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => {
      const currentCommand = commands[commandIndex];
      
      if (!isDeleting) {
        setText(currentCommand.substring(0, charIndex + 1));
        setCharIndex(prev => prev + 1);
        
        if (charIndex + 1 === currentCommand.length) {
          setTimeout(() => setIsDeleting(true), 2000);
        }
      } else {
        setText(currentCommand.substring(0, charIndex - 1));
        setCharIndex(prev => prev - 1);
        
        if (charIndex === 1) {
          setIsDeleting(false);
          setCommandIndex(prev => (prev + 1) % commands.length);
          setCharIndex(0);
        }
      }
    }, isDeleting ? 50 : 100);

    return () => clearTimeout(timeout);
  }, [charIndex, commandIndex, isDeleting]);

  return (
    <div className="w-full max-w-2xl bg-black/80 backdrop-blur-md rounded-lg border border-white/10 overflow-hidden shadow-2xl font-mono text-xs sm:text-sm">
      <div className="bg-white/5 px-4 py-2 border-b border-white/10 flex items-center justify-between">
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500/50" />
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50" />
          <div className="w-2.5 h-2.5 rounded-full bg-green-500/50" />
        </div>
        <div className="text-white/30 text-[10px] uppercase tracking-wider">sigil terminal</div>
      </div>
      <div className="p-4 min-h-[160px] flex flex-col justify-start">
        <div className="flex gap-2">
          <span className="text-primary font-bold">➜</span>
          <span className="text-white/50">~</span>
          <span className="text-white">
            {text}
            <span className="inline-block w-2 h-4 bg-primary ml-1 animate-pulse align-middle" />
          </span>
        </div>
        <div className="mt-4 text-white/40 space-y-1">
          {commandIndex === 0 && charIndex > 8 && <div className="animate-in fade-in slide-in-from-top-1">Initializing Sigil workspace...</div>}
          {commandIndex === 1 && charIndex > 20 && <div className="animate-in fade-in slide-in-from-top-1 text-green-400">Agent "alpha" created successfully.</div>}
          {commandIndex === 2 && charIndex > 18 && <div className="animate-in fade-in slide-in-from-top-1 text-yellow-400">Agent "alpha" starting...</div>}
          {commandIndex === 3 && charIndex > 14 && (
            <div className="animate-in fade-in slide-in-from-top-1">
              <div className="text-blue-400">[info] Socket connected</div>
              <div className="text-pink-400">[thought] Analyzing Solana market data...</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
