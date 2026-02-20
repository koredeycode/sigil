import { Layout } from './components/Layout.js';
import { ConfigProvider } from './context/ConfigContext.js';
import { SocketProvider } from './hooks/useSocket.js';

interface RootProps {
  apiPort?: number;
  authToken?: string;
}

export function Root({ apiPort = 7445, authToken = '' }: RootProps) {
  return (
    <ConfigProvider apiPort={apiPort} authToken={authToken}>
      <SocketProvider apiPort={apiPort} authToken={authToken}>
         <Layout />
      </SocketProvider>
    </ConfigProvider>
  );
}
