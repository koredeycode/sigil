import { clsx } from "clsx";
import {
    Activity,
    Bot,
    Brain,
    Clock,
    ExternalLink,
    LogOut,
    MessageSquare,
    Monitor,
    Moon,
    Settings,
    Sun,
    Terminal,
} from "lucide-react";
import { useState } from "react";
import {
    Group,
    Panel,
    Separator,
    useDefaultLayout,
} from "react-resizable-panels";
import {
    Link,
    Route,
    Routes,
    useLocation,
    useNavigate,
    useSearchParams,
} from "react-router-dom";
import { twMerge } from "tailwind-merge";
import { ChatBox } from "./components/ChatBox";
import { CustomSelect } from "./components/CustomSelect";
import { WalletView } from "./components/WalletView";
import { ThemeProvider, useTheme } from "./context/ThemeContext";
import type { Agent } from "./hooks/useAgents";
import { useAgents } from "./hooks/useAgents";
import { useProviders } from "./hooks/useProviders";
import { SocketProvider } from "./hooks/useSocket";
import { AgentDetails } from "./pages/AgentDetails";
import { AgentManager } from "./pages/AgentManager";
import { CronsPage } from "./pages/CronsPage";
import { LogsPage } from "./pages/LogsPage";
import { SettingsPage } from "./pages/SettingsPage";
import { StatusPage } from "./pages/StatusPage";

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

// Login Component
const Login = ({ onLogin }: { onLogin: (token: string) => void }) => {
  const [input, setInput] = useState("");
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground">
      <div className="w-full max-w-md p-8 space-y-6 bg-card rounded-xl border border-border shadow-lg">
        <div className="flex flex-col items-center space-y-2">
          <div className="p-3 bg-primary/10 rounded-full mb-2">
            <Activity className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            Connection Required
          </h1>
          <p className="text-sm text-muted-foreground">
            Local session token not found
          </p>
        </div>

        <div className="p-4 bg-secondary/30 border border-border rounded-lg text-sm space-y-3">
          <p className="font-medium">How to connect:</p>
          <ol className="list-decimal list-outside ml-4 space-y-2 text-muted-foreground">
            <li>Open your terminal</li>
            <li>
              Run{" "}
              <code className="px-1.5 py-0.5 bg-background border border-border rounded font-mono text-xs text-foreground">
                sigil start
              </code>{" "}
              to start the daemon
            </li>
            <li>
              Run{" "}
              <code className="px-1.5 py-0.5 bg-background border border-border rounded font-mono text-xs text-foreground">
                sigil dashboard
              </code>{" "}
              to open this page automatically
            </li>
            <li>
              Run{" "}
              <code className="px-1.5 py-0.5 bg-background border border-border rounded font-mono text-xs text-foreground">
                sigil auth token
              </code>{" "}
              to view the current session token
            </li>
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
              onChange={(e) => setInput(e.target.value)}
              className="w-full px-3 py-2 bg-secondary border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm placeholder:text-muted-foreground"
            />
          </div>
          <button
            onClick={() => onLogin(input)}
            disabled={!input}
            className="w-full py-2 px-4 bg-primary text-primary-foreground hover:bg-primary/90 rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Connect to Sigil Wallet
          </button>
        </div>
      </div>
    </div>
  );
};

const DashboardContent = ({ agents }: { agents: Agent[] }) => {
  const [searchParams] = useSearchParams();
  const agentIdParam = searchParams.get("agent");

  // Explicitly fallback to "sigil" as the main agent if no agent is specified
  const activeAgent =
    agents.find((a) => a.id === agentIdParam) ||
    agents.find((a) => a.name === "sigil") ||
    agents[0] ||
    null;

  const navigate = useNavigate();
  const { primaryProvider } = useProviders();

  const { defaultLayout, onLayoutChanged } = useDefaultLayout({
    id: "sigil-dashboard-layout",
    storage: localStorage,
  });

  if (!activeAgent) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground space-y-4">
        <MessageSquare className="w-16 h-16 opacity-20" />
        <h2 className="text-xl font-medium">No Agent Selected</h2>
        <p className="text-sm">
          Select an agent from the sidebar to view their dashboard.
        </p>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col h-full space-y-4 overflow-hidden">
      <header className="flex items-center justify-between px-1 shrink-0">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold tracking-tight">
              {activeAgent.name}
            </h1>
            <Link
              to={`/agents/${activeAgent.id}`}
              className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
              title="Go to Agent Details"
            >
              <ExternalLink className="w-4 h-4" />
            </Link>
          </div>
          <div
            className={cn(
              "px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wide",
              activeAgent.status === "running" &&
                "bg-green-500/15 text-green-500",
              activeAgent.status === "paused" &&
                "bg-orange-500/15 text-orange-500",
            )}
          >
            {activeAgent.status}
          </div>
          {primaryProvider && (
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-secondary text-xs font-medium text-muted-foreground border border-border">
              <Brain className="w-3.5 h-3.5" />
              <span>{primaryProvider.name}</span>
              <span className="opacity-50">·</span>
              <span className="font-mono">{primaryProvider.model}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Agent Switcher */}
          {agents.length > 1 && (
            <div className="flex items-center gap-2">
              <Bot className="w-4 h-4 text-muted-foreground" />
              <div className="w-48">
                <CustomSelect
                  value={activeAgent.id}
                  onChange={(value) => navigate(`/?agent=${value}`)}
                  options={agents.map((agent) => ({
                    id: agent.id,
                    label: (
                      <div className="flex items-center justify-between w-full gap-2">
                        <span className="truncate">{agent.name}</span>
                        <span
                          className={`w-2 h-2 rounded-full shrink-0 ${
                            agent.status === "running"
                              ? "bg-green-500"
                              : "bg-red-500"
                          }`}
                        />
                      </div>
                    ),
                  }))}
                />
              </div>
            </div>
          )}

          <button
            onClick={() => navigate(`/logs?agent=${activeAgent.id}`)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors border bg-background text-foreground border-border hover:bg-secondary"
          >
            <Terminal className="w-4 h-4" />
            View Logs
          </button>
        </div>
      </header>

      <Group
        defaultLayout={defaultLayout}
        onLayoutChanged={onLayoutChanged}
        orientation="horizontal"
        className="h-full w-full"
      >
        {/* Left Column: Full-Height Chat */}
        <Panel defaultSize="70%" maxSize="75%" minSize="50%">
          {/* Inner wrapper takes care of the flex layout instead of the Panel */}
          <div className="flex flex-col h-full bg-card border border-border rounded-lg shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center gap-2 bg-secondary/30 shrink-0">
              <MessageSquare className="w-4 h-4 text-muted-foreground" />
              <h3 className="font-medium text-sm">Agent Chat</h3>
            </div>
            <ChatBox activeAgent={activeAgent} />
          </div>
        </Panel>

        {/* Resizer */}
        <Separator className="w-1.5 flex items-center justify-center bg-transparent hover:bg-primary/5 transition-colors cursor-col-resize group outline-none">
          <div className="w-0.5 h-8 rounded-full bg-border group-hover:bg-primary/50 transition-colors" />
        </Separator>

        {/* Right Column: Wallet View */}
        <Panel defaultSize="30%">
          <div className="flex flex-col h-full">
            <WalletView activeAgent={activeAgent} />
          </div>
        </Panel>
      </Group>
    </div>
  );
};

const Dashboard = () => {
  const { agents } = useAgents();
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();

  const refreshAgents = () => {
    // Mock refresh
  };

  // Logout function
  const handleLogout = () => {
    localStorage.removeItem("sigil_token");
  };

  if (!agents)
    return (
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
            <img
              src="/logo.png"
              alt="Sigil Wallet Logo"
              className="w-6 h-6 object-contain"
            />
            Sigil Wallet
          </h2>
        </div>

        <div className="px-3 flex-1 overflow-y-auto">
          <div className="space-y-6 mb-6 mt-4">
            {/* Main Group */}
            <div className="space-y-1">
              <div className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Main
              </div>
              <Link
                to="/"
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  location.pathname === "/"
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                )}
              >
                <MessageSquare className="w-4 h-4" />
                Chat
              </Link>
            </div>

            {/* System Group */}
            <div className="space-y-1">
              <div className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                System
              </div>
              <Link
                to="/agents"
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  location.pathname.startsWith("/agents")
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                )}
              >
                <Bot className="w-4 h-4" />
                Agents
              </Link>
              <Link
                to="/logs"
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  location.pathname.startsWith("/logs")
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                )}
              >
                <Terminal className="w-4 h-4" />
                Logs
              </Link>
              <Link
                to="/crons"
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  location.pathname.startsWith("/crons")
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                )}
              >
                <Clock className="w-4 h-4" />
                Crons
              </Link>
              <Link
                to="/status"
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  location.pathname === "/status"
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                )}
              >
                <Activity className="w-4 h-4" />
                Status
              </Link>
              <Link
                to="/settings"
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  location.pathname === "/settings"
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                )}
              >
                <Settings className="w-4 h-4" />
                Settings
              </Link>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-border flex flex-col gap-2">
          <button
            onClick={toggleTheme}
            className="w-full flex items-center justify-between px-3 py-2 rounded-md bg-secondary text-sm font-medium hover:bg-secondary/80 transition-colors mb-2"
          >
            <span className="flex items-center gap-2 text-muted-foreground">
              {theme === "system" ? (
                <Monitor className="w-4 h-4" />
              ) : theme === "dark" ? (
                <Moon className="w-4 h-4" />
              ) : (
                <Sun className="w-4 h-4" />
              )}
              Theme
            </span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-background text-foreground shadow-sm capitalize">
              {theme}
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
          <Route path="/" element={<DashboardContent agents={agents} />} />
          <Route
            path="/agents/:id"
            element={<AgentDetails agents={agents} />}
          />
          <Route
            path="/agents"
            element={
              <AgentManager agents={agents} refreshAgents={refreshAgents} />
            }
          />
          <Route path="/crons" element={<CronsPage agents={agents} />} />
          <Route path="/logs" element={<LogsPage agents={agents} />} />
          <Route path="/status" element={<StatusPage />} />
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
    if (hash.startsWith("#token=")) {
      initialToken = hash.replace("#token=", "");
      // Clear hash for cleaner URL
      window.location.hash = "";
    }

    // Fallback to local storage
    const finalToken = initialToken || localStorage.getItem("sigil_token");
    if (finalToken) {
      localStorage.setItem("sigil_token", finalToken);
    }
    return finalToken;
  });

  const handleLogin = (t: string) => {
    localStorage.setItem("sigil_token", t);
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
