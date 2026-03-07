/**
 * Utility helpers for Solana-related formatting and links.
 */

/**
 * Generate a Solana Devnet Explorer link for an address or transaction.
 */
export function getExplorerLink(type: 'address' | 'tx', identifier: string): string {
  const baseUrl = 'https://explorer.solana.com';
  const cluster = 'cluster=devnet';
  
  if (type === 'address') {
    return `${baseUrl}/address/${identifier}?${cluster}`;
  }
  
  return `${baseUrl}/tx/${identifier}?${cluster}`;
}

/**
 * Format an identifier with a markdown link to the Solana Devnet Explorer.
 */
export function formatExplorerLink(type: 'address' | 'tx', identifier: string): string {
  const link = getExplorerLink(type, identifier);
  return `[${identifier}](${link})`;
}
