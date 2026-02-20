import type { Command } from 'commander';

export function registerHealthCommand(program: Command) {
  program
    .command('health')
    .description('Check the API health of the Sigil backend')
    .action(async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
        
        const res = await fetch('http://localhost:7445/api/status', {
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);

        if (res.ok) {
          const data = await res.json();
          console.log(`✅ Sigil API is healthy (Agents: ${data.data.agents.total})`);
        } else {
          console.log(`⚠️ Sigil API responded with status: ${res.status}`);
        }
      } catch (error: any) {
        console.log(`❌ Sigil API is unreachable (${error.message || 'Connection refused'}).`);
      }
    });
}
