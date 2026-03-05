import { HomeClient } from '@/components/HomeClient';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sigil — Autonomous AI Agents for Solana',
  description: 'Spawn independent AI agents that monitor, trade, and rebalance your Solana portfolio. Local-first, keys in your OS Keychain.',
};

export default function HomePage() {
  return <HomeClient />;
}

