import { clsx } from 'clsx';
import { Activity, LayoutDashboard, ListTodo, LogOut, MessageSquare, Settings, Terminal, Users, Wallet } from 'lucide-react';
import { useState } from 'react';
import { twMerge } from 'tailwind-merge';
import { AgentManager } from './components/AgentManager';
import { AgentSidebar } from './components/AgentSidebar';
import { ChatBox } from './components/ChatBox';
import { DirectiveManager } from './components/DirectiveManager';
import { LogTerminal } from './components/LogTerminal';
import { PortfolioChart } from './components/PortfolioChart';
import { SettingsPage } from './components/SettingsPage';
import { TransactionLedger } from './components/TransactionLedger';
import { useAgents } from './hooks/useAgents';
import { SocketProvider } from './hooks/useSocket';

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
                    <div className="p-3 bg-primary/10 rounded-full">
                        <Activity className="w-8 h-8 text-primary" />
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight">Welcome back</h1>
                    <p className="text-sm text-muted-foreground">Enter your authentication token to continue</p>
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
                        className="w-full py-2 px-4 bg-primary text-primary-foreground hover:bg-primary/90 rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
                    >
                        Connect to Sigil
                    </button>
                </div>
            </div>
        </div>
    );
};

const DashboardContent = ({ activeAgent }: { activeAgent: any }) => {
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
        <div className="flex flex-col h-full space-y-4 overflow-hidden">
            <header className="flex items-center justify-between px-1">
                <div className="flex items-center space-x-4">
                    <h1 className="text-2xl font-bold tracking-tight">{activeAgent.name}</h1>
                    <div className={cn(
                        "px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wide",
                        activeAgent.status === 'active' && "bg-green-500/15 text-green-500",
                        activeAgent.status === 'paused' && "bg-orange-500/15 text-orange-500",
                        activeAgent.status === 'stopped' && "bg-red-500/15 text-red-500",
                    )}>
                        {activeAgent.status}
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full bg-secondary text-secondary-foreground text-xs font-medium">
                        {activeAgent.role}
                    </span>
                </div>
            </header>

            <div className="grid grid-cols-12 gap-4 flex-1 min-h-0">
                {/* Left Column: Logs & Chat */}
                <div className="col-span-7 flex flex-col gap-4 min-h-0">
                    <div className="flex-1 flex flex-col min-h-0 bg-card border border-border rounded-lg shadow-sm overflow-hidden">
                        <div className="px-4 py-3 border-b border-border flex items-center gap-2">
                            <Terminal className="w-4 h-4 text-muted-foreground" />
                            <h3 className="font-medium text-sm">Live Logs</h3>
                        </div>
                        <LogTerminal activeAgent={activeAgent} />
                    </div>
                    <div className="h-1/3 flex flex-col min-h-0 bg-card border border-border rounded-lg shadow-sm overflow-hidden">
                        <div className="px-4 py-3 border-b border-border flex items-center gap-2">
                            <MessageSquare className="w-4 h-4 text-muted-foreground" />
                            <h3 className="font-medium text-sm">Chat</h3>
                        </div>
                        <ChatBox activeAgent={activeAgent} />
                    </div>
                </div>

                {/* Right Column: Portfolio, Directives, Transactions */}
                <div className="col-span-5 flex flex-col gap-4 min-h-0 overflow-y-auto pr-1">
                     <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden shrink-0">
                         {/* Portfolio Chart Header could go here if needed, but component has it */}
                         <div className="px-4 py-3 border-b border-border flex items-center gap-2">
                            <Wallet className="w-4 h-4 text-muted-foreground" />
                            <h3 className="font-medium text-sm">Portfolio</h3>
                        </div>
                         <PortfolioChart activeAgent={activeAgent} />
                    </div>
                    <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden shrink-0">
                        <div className="px-4 py-3 border-b border-border flex items-center gap-2">
                            <ListTodo className="w-4 h-4 text-muted-foreground" />
                            <h3 className="font-medium text-sm">Directives</h3>
                        </div>
                        <DirectiveManager activeAgent={activeAgent} />
                    </div>
                    <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden flex-1 min-h-[200px]">
                        <div className="px-4 py-3 border-b border-border flex items-center gap-2">
                            <Activity className="w-4 h-4 text-muted-foreground" />
                            <h3 className="font-medium text-sm">Transactions</h3>
                        </div>
                        <TransactionLedger activeAgent={activeAgent} />
                    </div>
                </div>
            </div>
        </div>
    );
};

const Dashboard = () => {
    const { agents, activeAgent, activeAgentId, setActiveAgentId } = useAgents();
    const [activeTab, setActiveTab] = useState<'dashboard' | 'agents' | 'settings'>('dashboard');

    const refreshAgents = () => {
        // Mock refresh
    }; 
    
    // Logout function
    const handleLogout = () => {
        localStorage.removeItem('sigil_token');
        window.location.reload();
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
                        <button 
                            onClick={() => setActiveTab('dashboard')}
                            className={cn(
                                "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                                activeTab === 'dashboard' 
                                    ? "bg-primary/10 text-primary" 
                                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                            )}
                        >
                            <LayoutDashboard className="w-4 h-4" />
                            Dashboard
                        </button>
                        <button 
                             onClick={() => setActiveTab('agents')}
                             className={cn(
                                "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                                activeTab === 'agents' 
                                    ? "bg-primary/10 text-primary" 
                                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                            )}
                        >
                            <Users className="w-4 h-4" />
                            Agents
                        </button>
                        <button 
                             onClick={() => setActiveTab('settings')}
                             className={cn(
                                "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                                activeTab === 'settings' 
                                    ? "bg-primary/10 text-primary" 
                                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                            )}
                        >
                            <Settings className="w-4 h-4" />
                            Settings
                        </button>
                    </div>

                    <div className="pt-4 border-t border-border">
                        <h3 className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Active Agents
                        </h3>
                        <AgentSidebar 
                            agents={agents} 
                            activeAgentId={activeAgentId} 
                            onSelectAgent={(id) => { setActiveAgentId(id); setActiveTab('dashboard'); }} 
                        />
                    </div>
                </div>
                
                <div className="p-4 border-t border-border">
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
                {activeTab === 'dashboard' && <DashboardContent activeAgent={activeAgent} />}
                {activeTab === 'agents' && <AgentManager agents={agents} refreshAgents={refreshAgents} />}
                {activeTab === 'settings' && <SettingsPage />}
            </main>
        </div>
    );
};

function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('sigil_token'));

  const handleLogin = (t: string) => {
      localStorage.setItem('sigil_token', t);
      setToken(t);
  };

  if (!token) {
      return <Login onLogin={handleLogin} />;
  }

  return (
    <SocketProvider>
       <Dashboard />
    </SocketProvider>
  );
}

export default App;
