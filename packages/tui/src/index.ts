import { render } from 'ink';
import React from 'react';
import { Root } from './Root.js';

export { Root } from './Root.js';

export function startTui(apiPort: number, authToken: string) {
  const instance = render(React.createElement(Root, { apiPort, authToken }));
  return instance;
}
