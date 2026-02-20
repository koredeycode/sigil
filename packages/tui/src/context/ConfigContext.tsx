import { createContext, ReactNode, useContext } from 'react';

interface ConfigContextType {
  apiPort: number;
  authToken: string;
}

const ConfigContext = createContext<ConfigContextType>({ apiPort: 7445, authToken: '' });

export function ConfigProvider({ children, apiPort, authToken }: { children: ReactNode } & ConfigContextType) {
  return (
    <ConfigContext.Provider value={{ apiPort, authToken }}>
      {children}
    </ConfigContext.Provider>
  );
}

export function useConfig() {
  return useContext(ConfigContext);
}
