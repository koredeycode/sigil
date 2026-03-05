import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Test dApp | Sigil Wallet',
  description: 'Test the Sigil extension\'s connection and transaction signing flow.',
};

export default function TestDappLayout({ children }: { children: React.ReactNode }) {
  return children;
}
