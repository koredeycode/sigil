import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';

interface SocketContextType {
  socket: Socket | null;
  connected: boolean;
}

const SocketContext = createContext<SocketContextType>({ socket: null, connected: false });

interface SocketProviderProps {
  children: ReactNode;
}

// Hardcoded for now or env var? 
// The implementation plan says "Wire Core to serve packages/web/dist as static files on :7446"
// But dev server runs on 5173 usually.
// The API is on 7445.
// Let's assume API is at localhost:7445 for now.

const API_URL = 'http://localhost:7445';

export function SocketProvider({ children }: SocketProviderProps) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // effective auth token storage for web? 
    // Maybe stored in localStorage after login?
    // For dev, let's assume no auth or hardcoded for now, or fetch from config endpoint if public?
    // Wait, TUI gets it from local DB. Web assumes it's served by Core or standalone?
    // Implementation plan says "Serve web static files from Express".
    // If served from Express, it's same origin/port potentially?
    // Core is 7445. Web is 7446 (dev).
    // Let's fetch config from an endpoint or use a default token for dev.
    // Actually, Phase 3 auth middleware is strict.
    // I need a way to pass the token to the web app.
    // For now, I'll hardcode a "dev-token" or similar, or just try to connect without and see.
    // Wait, TUI reads directly from DB. Web cannot do that.
    // Maybe the web dashboard needs a login page?
    // Implementation Plan Phase 6 doesn't explicitly mention Login Page.
    // But "SettingsPage" implies some config.
    // Let's implement a simple prompt or default for now.
    
    // Check if token in localStorage
    const token = localStorage.getItem('sigil_token');
    
    if (!token) {
        console.warn("No token found in localStorage. Socket connection might fail.");
        return;
    }

    const socketInstance = io(API_URL, {
      auth: { token },
      transports: ['websocket'],
    });

    socketInstance.on('connect', () => {
      console.log('Socket connected');
      setConnected(true);
    });

    socketInstance.on('disconnect', () => {
      console.log('Socket disconnected');
      setConnected(false);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
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
