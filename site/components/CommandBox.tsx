'use client';

import { Check, Copy } from 'lucide-react';
import { useState } from 'react';

interface CommandBoxProps {
  command: string;
  className?: string;
}

export function CommandBox({ command, className = "" }: CommandBoxProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  return (
    <div 
      onClick={handleCopy}
      className={`flex items-center gap-3 px-6 py-4 rounded-xl bg-black/[0.05] dark:bg-white/[0.05] border border-black/5 dark:border-white/5 backdrop-blur-md font-mono text-sm hover:bg-black/10 dark:hover:bg-white/10 transition-all cursor-pointer group shadow-lg ${className}`}
    >
      <span className="text-primary/50">$</span>
      <span className="flex-1 text-left text-foreground/80 dark:text-primary/80 truncate">
        {command}
      </span>
      {copied ? (
        <Check className="w-4 h-4 text-green-500 animate-in zoom-in duration-300" />
      ) : (
        <Copy className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
      )}
    </div>
  );
}
