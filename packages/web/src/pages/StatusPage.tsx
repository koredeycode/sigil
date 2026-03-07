import { Activity, Cpu, Database, Globe, Layers, RefreshCcw, Server, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
interface StatusData {
  status: string;
  version: string;
  uptime: number;
  timestamp: string;
  database: {
    status: string;
    location: string;
  };
  llmProviders: {
    configured: number;
    primary: string;
  };
  agents: {
    total: number;
    running: number;
    paused: number;
  };
  network: {
    rpc: string;
    status: string;
    latency: string | null;
  };
  system: {
    nodeVersion: string;
    platform: string;
    memory: {
      used: string;
      total: string;
    };
  };
}

export function StatusPage() {
  const [data, setData] = useState<StatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = async () => {
    const token = localStorage.getItem("sigil_token");
    if (!token) {
      setError("No session token found");
      setLoading(false);
      return;
    }

    try {
      // Fetch with rpc=true to get network status
      const response = await fetch(`/api/status?rpc=true`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const json = await response.json();
      if (json.data) {
        setData(json.data);
      } else {
        setError("Failed to parse status data");
      }
    } catch (err) {
      console.error("Error fetching status:", err);
      setError("Failed to fetch system status");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-red-500 gap-4">
        <Activity className="w-12 h-12 opacity-50" />
        <p>{error}</p>
        <button 
          onClick={() => { setLoading(true); fetchStatus(); }}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data) return null;

  const formatUptime = (seconds: number) => {
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const parts = [];
    if (d > 0) parts.push(`${d}d`);
    if (h > 0) parts.push(`${h}h`);
    if (m > 0) parts.push(`${m}m`);
    return parts.join(" ") || "< 1m";
  };

  const StatusCard = ({ title, icon: Icon, children, statusColor }: { title: string, icon: any, children: React.ReactNode, statusColor?: string }) => (
    <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-secondary rounded-lg">
            <Icon className="w-5 h-5 text-primary" />
          </div>
          <h3 className="font-semibold">{title}</h3>
        </div>
        {statusColor && (
          <div className={`w-2.5 h-2.5 rounded-full ${statusColor} animate-pulse`} />
        )}
      </div>
      <div className="space-y-3">
        {children}
      </div>
    </div>
  );

  const StatItem = ({ label, value, subtext }: { label: string, value: string | number, subtext?: string }) => (
    <div className="flex flex-col">
      <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">{label}</span>
      <div className="flex items-baseline gap-2">
        <span className="text-lg font-mono font-semibold">{value}</span>
        {subtext && <span className="text-xs text-muted-foreground">{subtext}</span>}
      </div>
    </div>
  );

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mt-2">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">System Status</h1>
          <p className="text-muted-foreground">Monitor your Sigil instance and resource health.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => { setLoading(true); fetchStatus(); }}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all border border-border bg-background hover:bg-secondary text-muted-foreground hover:text-foreground disabled:opacity-50"
            title="Refresh Status"
          >
            <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${data.status === 'ok' ? 'bg-green-500/10 border-green-500/20 text-green-500' : 'bg-red-500/10 border-red-500/20 text-red-500'} text-sm font-medium`}>
            <ShieldCheck className="w-4 h-4" />
            {data.status === 'ok' ? 'All Systems Operational' : 'Systems Degraded'}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Core Info */}
        <StatusCard title="Core Engine" icon={Server} statusColor="bg-green-500">
          <div className="grid grid-cols-2 gap-4">
            <StatItem label="Version" value={`v${data.version}`} />
            <StatItem label="Uptime" value={formatUptime(data.uptime)} />
            <StatItem label="Node.js" value={data.system.nodeVersion} />
            <StatItem label="Platform" value={data.system.platform} />
          </div>
        </StatusCard>

        {/* Database */}
        <StatusCard title="Database" icon={Database} statusColor={data.database.status === 'connected' ? 'bg-green-500' : 'bg-red-500'}>
          <StatItem label="Status" value={data.database.status} />
          <StatItem label="File Location" value={data.database.location} />
        </StatusCard>

        {/* LLM & Agents */}
        <StatusCard title="Intelligence" icon={Layers}>
          <div className="grid grid-cols-2 gap-4">
            <StatItem label="Providers" value={data.llmProviders.configured} />
            <StatItem label="Primary" value={data.llmProviders.primary} />
            <StatItem label="Running Agents" value={data.agents.running} subtext={`/ ${data.agents.total}`} />
            <StatItem label="Paused" value={data.agents.paused} />
          </div>
        </StatusCard>

        {/* Network */}
        <StatusCard title="Solana Network" icon={Globe} statusColor={data.network.status === 'healthy' ? 'bg-green-500' : 'bg-orange-500'}>
          <StatItem label="RPC Node" value={data.network.rpc.split('/')[2]?.split('?')[0] || "Custom RPC"} />
          <div className="grid grid-cols-2 gap-4 mt-2">
            <StatItem label="RPC Status" value={data.network.status} />
            <StatItem label="Latency" value={data.network.latency || "N/A"} />
          </div>
        </StatusCard>

        {/* Resources */}
        <StatusCard title="System Resources" icon={Cpu}>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted-foreground uppercase font-medium">Memory Usage</span>
                <span className="font-mono">{data.system.memory.used} / {data.system.memory.total}</span>
              </div>
              <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-500" 
                  style={{ width: `${(parseInt(data.system.memory.used) / parseInt(data.system.memory.total)) * 100}%` }}
                />
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground font-mono">
              Last Updated: {new Date(data.timestamp).toLocaleTimeString()}
            </p>
          </div>
        </StatusCard>
      </div>
    </div>
  );
}
