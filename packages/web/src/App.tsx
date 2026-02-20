import { clsx } from 'clsx';
import { Activity, Bot, ExternalLink, LayoutDashboard, LogOut, MessageSquare, Moon, Settings, Sun, Terminal, Users } from 'lucide-react';
import { useState } from 'react';
import { Link, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { twMerge } from 'tailwind-merge';
import { AgentSidebar } from './components/AgentSidebar';
import { ChatBox } from './components/ChatBox';
import { LogTerminal } from './components/LogTerminal';
import { WalletView } from './components/WalletView';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { useAgents } from './hooks/useAgents';
import { useProviders } from './hooks/useProviders';
import { SocketProvider } from './hooks/useSocket';
import { AgentDetails } from './pages/AgentDetails';
import { AgentManager } from './pages/AgentManager';
import { SettingsPage } from './pages/SettingsPage';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

// Login Component
const Login = ({ onLogin }: { onLogin: (token: string) => void }) => {
    const [input, setInput] = useState('');
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground">
            <div className="w-full max-w-md p-8 space-y-6 bg-card rounded-xl border border-border shadow-lg">
                <div className="flex flex-col items-center space-y-2">
                    <div className="p-3 bg-primary/10 rounded-full mb-2">
                        <Activity className="w-8 h-8 text-primary" />
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight">Connection Required</h1>
                    <p className="text-sm text-muted-foreground">Local session token not found</p>
                </div>

                <div className="p-4 bg-secondary/30 border border-border rounded-lg text-sm space-y-3">
                    <p className="font-medium">How to connect:</p>
                    <ol className="list-decimal list-outside ml-4 space-y-2 text-muted-foreground">
                        <li>Open your terminal</li>
                        <li>Run <code className="px-1.5 py-0.5 bg-background border border-border rounded font-mono text-xs text-foreground">sigil start</code> to start the daemon</li>
                        <li>Run <code className="px-1.5 py-0.5 bg-background border border-border rounded font-mono text-xs text-foreground">sigil dashboard</code> to open this page automatically</li>
                    </ol>
                    <div className="pt-3 mt-3 border-t border-border">
                        <p className="text-xs text-muted-foreground">
                            Alternatively, paste the session token printed by the CLI below:
                        </p>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="space-y-2">
                        <input 
                            type="password" 
                            placeholder="Auth Token" 
                            value={input} 
                            onChange={e => setInput(e.target.value)} 
                            className="w-full px-3 py-2 bg-secondary border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm placeholder:text-muted-foreground"
                        />
                    </div>
                    <button 
                        onClick={() => onLogin(input)}
                        disabled={!input}
                        className="w-full py-2 px-4 bg-primary text-primary-foreground hover:bg-primary/90 rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Connect to Sigil
                    </button>
                </div>
            </div>
        </div>
    );
};

const DashboardContent = ({ activeAgent }: { activeAgent: any }) => {
    const [isLogsOpen, setIsLogsOpen] = useState(false);
    const { primaryProvider } = useProviders();

    const [leftWidth, setLeftWidth] = useState(70); // percentage
    const [isDragging, setIsDragging] = useState(false);

    const handleDrag = (e: React.MouseEvent) => {
        e.preventDefault();
        const container = e.currentTarget.parentElement;
        if (!container) return;
        
        setIsDragging(true);
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
        
        const startX = e.clientX;
        const startWidth = leftWidth;
        const containerWidth = container.getBoundingClientRect().width;
        
        const onMouseMove = (moveEvent: MouseEvent) => {
            requestAnimationFrame(() => {
                const delta = moveEvent.clientX - startX;
                const deltaPercentage = (delta / containerWidth) * 100;
                const newWidth = Math.min(Math.max(startWidth + deltaPercentage, 50), 75);
                setLeftWidth(newWidth);
            });
        };
        
        const onMouseUp = () => {
            setIsDragging(false);
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };
        
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    };

    if (!activeAgent) {
         return (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground space-y-4">
                <LayoutDashboard className="w-16 h-16 opacity-20" />
                <h2 className="text-xl font-medium">No Agent Selected</h2>
                <p className="text-sm">Select an agent from the sidebar to view their dashboard.</p>
            </div>
        );
    }

    return (
        <div className="relative flex flex-col h-full space-y-4 overflow-hidden">
            <header className="flex items-center justify-between px-1 shrink-0">
                <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                        <h1 className="text-2xl font-bold tracking-tight">{activeAgent.name}</h1>
                        <Link 
                            to={`/agents/${activeAgent.id}`}
                            className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                            title="Go to Agent Details"
                        >
                            <ExternalLink className="w-4 h-4" />
                        </Link>
                    </div>
                    <div className={cn(
                        "px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wide",
                        activeAgent.status === 'running' && "bg-green-500/15 text-green-500",
                        activeAgent.status === 'paused' && "bg-orange-500/15 text-orange-500",
                        activeAgent.status === 'stopped' && "bg-red-500/15 text-red-500",
                    )}>
                        {activeAgent.status}
                    </div>
                    {primaryProvider && (
                        <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-secondary text-xs font-medium text-muted-foreground border border-border">
                            <Bot className="w-3.5 h-3.5" />
                            <span>{primaryProvider.name}</span>
                            <span className="opacity-50">·</span>
                            <span className="font-mono">{primaryProvider.model}</span>
                        </div>
                    )}
                </div>
                
                <button
                    onClick={() => setIsLogsOpen(!isLogsOpen)}
                    className={cn(
                        "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors border",
                        isLogsOpen 
                            ? "bg-primary text-primary-foreground border-primary hover:bg-primary/90" 
                            : "bg-background text-foreground border-border hover:bg-secondary"
                    )}
                >
                    <Terminal className="w-4 h-4" />
                    {isLogsOpen ? 'Close Logs' : 'View Logs'}
                </button>
            </header>

            <div className="flex flex-1 min-h-0 overflow-hidden relative">
                {/* Left Column: Full-Height Chat */}
                <div 
                    className={cn(
                        "flex flex-col min-h-0 shrink-0",
                        isDragging && "pointer-events-none select-none"
                    )} 
                    style={{ width: `calc(${leftWidth}% - 8px)` }}
                >
                    <div className="flex-1 flex flex-col min-h-0 bg-card border border-border rounded-lg shadow-sm overflow-hidden">
                        <div className="px-4 py-3 border-b border-border flex items-center gap-2 bg-secondary/30 shrink-0">
                            <MessageSquare className="w-4 h-4 text-muted-foreground" />
                            <h3 className="font-medium text-sm">Agent Chat</h3>
                        </div>
                        <ChatBox activeAgent={activeAgent} />
                    </div>
                </div>

                {/* Resizer */}
                <div 
                    className="w-4 shrink-0 flex items-center justify-center cursor-col-resize group z-10"
                    onMouseDown={handleDrag}
                >
                    <div className="w-1 h-8 rounded-full bg-border group-hover:bg-primary/50 transition-colors" />
                </div>

                {/* Right Column: Wallet View */}
                <div 
                    className={cn(
                        "flex flex-col min-h-0 shrink-0",
                        isDragging && "pointer-events-none select-none"
                    )} 
                    style={{ width: `calc(${100 - leftWidth}% - 8px)` }}
                >
                    <WalletView activeAgent={activeAgent} />
                </div>

                {/* Log Drawer Overlay */}
                <div className={cn(
                    "fixed top-0 right-0 bottom-0 w-[500px] xl:w-[600px] max-w-full bg-card text-foreground border-l border-border shadow-2xl flex flex-col z-50 transition-transform duration-300 ease-in-out",
                    isLogsOpen ? "translate-x-0" : "translate-x-full"
                )}>
                    <div className="px-4 py-3 border-b border-border flex items-center justify-between shrink-0 bg-secondary/30">
                        <div className="flex items-center gap-2">
                            <Terminal className="w-4 h-4 text-muted-foreground" />
                            <h3 className="font-medium text-sm">Live Logs for <span className="text-primary font-bold">{activeAgent.name}</span></h3>
                        </div>
                        <button
                            onClick={() => setIsLogsOpen(false)}
                            className="p-1 hover:bg-secondary rounded text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <span className="sr-only">Close Logs</span>
                            ×
                        </button>
                    </div>
                    <LogTerminal activeAgent={activeAgent} />
                </div>
                
                {/* Overlay backdrop when logs are open (optional, helps focus) */}
                {isLogsOpen && (
                    <div 
                        className="fixed inset-0 bg-black/50 z-40 transition-opacity" 
                        onClick={() => setIsLogsOpen(false)}
                    />
                )}
            </div>
        </div>
    );
};

const Dashboard = () => {
    const { agents, activeAgent, activeAgentId, setActiveAgentId } = useAgents();
    const location = useLocation();
    const navigate = useNavigate();
    const { theme, toggleTheme } = useTheme();
    const isDarkMode = theme === 'dark';

    const refreshAgents = () => {
        // Mock refresh
    }; 
    
    // Logout function
    const handleLogout = () => {
        localStorage.removeItem('sigil_token');
    }

    if (!agents) return (
        <div className="flex items-center justify-center min-h-screen bg-background text-foreground">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
    );

    return (
        <div className="flex h-screen bg-background text-foreground overflow-hidden">
            {/* Sidebar */}
            <aside className="w-64 bg-card border-r border-border flex flex-col">
                <div className="p-6">
                    <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
                        <Activity className="w-6 h-6 text-primary" />
                        Sigil
                    </h2>
                </div>
                
                <div className="px-3 flex-1 overflow-y-auto">
                    <div className="space-y-1 mb-6">
                        <Link 
                            to="/"
                            className={cn(
                                "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                                location.pathname === '/' 
                                    ? "bg-primary/10 text-primary" 
                                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                            )}
                        >
                            <LayoutDashboard className="w-4 h-4" />
                            Dashboard
                        </Link>
                        <Link 
                             to="/agents"
                             className={cn(
                                "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                                location.pathname === '/agents' 
                                    ? "bg-primary/10 text-primary" 
                                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                            )}
                        >
                            <Users className="w-4 h-4" />
                            Agents
                        </Link>
                        <Link 
                             to="/settings"
                             className={cn(
                                "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                                location.pathname === '/settings' 
                                    ? "bg-primary/10 text-primary" 
                                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                            )}
                        >
                            <Settings className="w-4 h-4" />
                            Settings
                        </Link>

                        <div className="pt-2 px-3 pb-2 hidden">
                            <button
                                onClick={toggleTheme}
                                className="w-full flex items-center justify-between px-3 py-2 rounded-md bg-secondary text-sm font-medium hover:bg-secondary/80 transition-colors"
                            >
                                <span className="flex items-center gap-2 text-muted-foreground">
                                    {isDarkMode ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                                    Theme
                                </span>
                                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-background text-foreground shadow-sm">
                                    {isDarkMode ? 'Dark' : 'Light'}
                                </span>
                            </button>
                        </div>
                    </div>

                    <div className="pt-4 border-t border-border">
                        <h3 className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Active Agents
                        </h3>
                        <AgentSidebar 
                            agents={agents} 
                            activeAgentId={activeAgentId} 
                            onSelectAgent={(id) => setActiveAgentId(id)} 
                        />
                    </div>
                </div>
                
                <div className="p-4 border-t border-border flex flex-col gap-2">
                     <button
                        onClick={toggleTheme}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-md bg-secondary text-sm font-medium hover:bg-secondary/80 transition-colors mb-2"
                    >
                        <span className="flex items-center gap-2 text-muted-foreground">
                            {isDarkMode ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                            Theme
                        </span>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-background text-foreground shadow-sm">
                            {isDarkMode ? 'Dark' : 'Light'}
                        </span>
                    </button>
                    <button 
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <LogOut className="w-4 h-4" />
                        Disconnect
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-hidden p-6 bg-background">
                <Routes>
                    <Route path="/" element={<DashboardContent activeAgent={activeAgent} />} />
                    <Route path="/agents/:id" element={<AgentDetails activeAgent={activeAgent} />} />
                    <Route 
                        path="/agents" 
                        element={
                            <AgentManager 
                                agents={agents} 
                                refreshAgents={refreshAgents} 
                                onSelectAgent={(id) => { 
                                    setActiveAgentId(id); 
                                    navigate(`/agents/${id}`); 
                                }} 
                            />
                        } 
                    />
                    <Route path="/settings" element={<SettingsPage />} />
                </Routes>
            </main>
        </div>
    );
};

function App() {
  const [token, setToken] = useState<string | null>(() => {
      // First check hash for direct dashboard injection
      const hash = window.location.hash;
      let initialToken = null;
      if (hash.startsWith('#token=')) {
          initialToken = hash.replace('#token=', '');
          // Clear hash for cleaner URL
          window.location.hash = '';
      }
      
      // Fallback to local storage
      const finalToken = initialToken || localStorage.getItem('sigil_token');
      if (finalToken) {
          localStorage.setItem('sigil_token', finalToken);
      }
      return finalToken;
  });

  const handleLogin = (t: string) => {
      localStorage.setItem('sigil_token', t);
      setToken(t);
  };

  if (!token) {
      return <Login onLogin={handleLogin} />;
  }

  return (
    <ThemeProvider>
        <SocketProvider>
           <Dashboard />
        </SocketProvider>
    </ThemeProvider>
  );
}

export default App;
