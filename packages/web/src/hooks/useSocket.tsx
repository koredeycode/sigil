import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';

interface SocketContextType {
  socket: Socket | null;
  connected: boolean;
}

const SocketContext = createContext<SocketContextType>({ socket: null, connected: false });

interface SocketProviderProps {
  children: ReactNode;
}

// Determine API URL — same origin when served from Express, localhost:7445 in dev
function getApiUrl(): string {
  // If served from Express (same port 7445), use relative URL
  if (window.location.port === '7445') {
    return '';
  }
  // Dev mode — connect to API server
  return 'http://localhost:7445';
}

export function SocketProvider({ children }: SocketProviderProps) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // Check localStorage for token, but don't require it
    const token = localStorage.getItem('sigil_token');
    const apiUrl = getApiUrl();

    const socketInstance = io(apiUrl || 'http://localhost:7445', {
      auth: token ? { token } : {},
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
    });

    socketInstance.on('connect', () => {
      console.log('[Socket] Connected to Sigil server');
      setConnected(true);
    });

    socketInstance.on('connect_error', (error) => {
      console.warn('[Socket] Connection error:', error.message);
    });

    socketInstance.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
      setConnected(false);
    });

    socketInstance.on('reconnect', (attemptNumber) => {
      console.log(`[Socket] Reconnected after ${attemptNumber} attempts`);
    });

    socketRef.current = socketInstance;
    setSocket(socketInstance);

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'sigil_token') {
        if (socketInstance) {
          socketInstance.auth = e.newValue ? { token: e.newValue } : {};
          socketInstance.disconnect().connect();
        }
      }
    };
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      socketInstance.disconnect();
      socketRef.current = null;
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket, connected }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}
