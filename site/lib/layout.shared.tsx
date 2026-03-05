import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';

export const gitConfig = {
  user: 'koredeycode',
  repo: 'sigil',
  branch: 'main',
};

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: (
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="Sigil Wallet Logo" className="w-6 h-6 object-contain" />
          <span className="font-bold">Sigil Wallet</span>
        </div>
      ),
    },
    links: [],
    githubUrl: `https://github.com/${gitConfig.user}/${gitConfig.repo}`,
  };
}
