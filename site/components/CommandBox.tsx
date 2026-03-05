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
    <button
      onClick={handleCopy}
      className={`flex items-start gap-3 px-5 py-3.5 rounded-xl border border-border bg-secondary/50 font-mono text-sm hover:bg-secondary transition-colors cursor-pointer group text-left ${className}`}
    >
      <span className="text-muted-foreground select-none mt-0.5">$</span>
      <span className="flex-1 text-foreground/90 break-words whitespace-pre-wrap leading-relaxed">
        {command}
      </span>
      {copied ? (
        <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
      ) : (
        <Copy className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0 mt-0.5" />
      )}
    </button>
  );
}
