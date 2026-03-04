import cronstrue from 'cronstrue';
import { AlertCircle, Calendar, Check, Clock, Edit3, Info, Plus, Power, PowerOff, Trash2, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CustomSelect } from '../components/CustomSelect';
import type { Agent } from '../hooks/useAgents';
import { ApiClient } from '../lib/api';

// ─── Types ─────────────────────────────────────────────────────────────
type FrequencyType = 'every_minute' | 'hourly' | 'daily' | 'weekly' | 'custom';

interface ScheduleConfig {
  frequency: FrequencyType;
  minute: number;
  hour: number;
  days: number[]; // 0=Sun, 1=Mon, ...6=Sat
  customExpression: string;
}

interface CronJob {
  id: number;
  agent_id: string;
  name: string;
  expression: string;
  task_prompt: string;
  is_active: number;
  last_run: string | null;
  created_at: string;
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// ─── Helpers ───────────────────────────────────────────────────────────
function buildExpression(config: ScheduleConfig): string {
  switch (config.frequency) {
    case 'every_minute':
      return '* * * * *';
    case 'hourly':
      return `${config.minute} * * * *`;
    case 'daily':
      return `${config.minute} ${config.hour} * * *`;
    case 'weekly': {
      const d = config.days.length > 0 ? config.days.sort().join(',') : '*';
      return `${config.minute} ${config.hour} * * ${d}`;
    }
    case 'custom':
      return config.customExpression;
  }
}

function parseExpressionToConfig(expression: string): ScheduleConfig {
  const parts = expression.split(' ');
  if (parts.length !== 5) return { frequency: 'custom', minute: 0, hour: 0, days: [], customExpression: expression };

  const [min, hr, , , dow] = parts;

  // Every minute
  if (expression === '* * * * *') {
    return { frequency: 'every_minute', minute: 0, hour: 0, days: [], customExpression: expression };
  }

  // Hourly: "N * * * *" where N is a single number
  if (hr === '*' && parts[2] === '*' && parts[3] === '*' && dow === '*' && /^\d+$/.test(min)) {
    return { frequency: 'hourly', minute: parseInt(min), hour: 0, days: [], customExpression: expression };
  }

  // Daily: "N H * * *" where both are simple numbers
  if (parts[2] === '*' && parts[3] === '*' && dow === '*' && /^\d+$/.test(min) && /^\d+$/.test(hr)) {
    return { frequency: 'daily', minute: parseInt(min), hour: parseInt(hr), days: [], customExpression: expression };
  }

  // Weekly: "N H * * D1,D2,..."
  if (parts[2] === '*' && parts[3] === '*' && /^\d+$/.test(min) && /^\d+$/.test(hr) && dow !== '*') {
    const days = dow.split(',').map(Number).filter(n => !isNaN(n));
    return { frequency: 'weekly', minute: parseInt(min), hour: parseInt(hr), days, customExpression: expression };
  }

  return { frequency: 'custom', minute: 0, hour: 0, days: [], customExpression: expression };
}

function getHumanReadable(expression: string): string {
  try {
    return cronstrue.toString(expression, { use24HourTimeFormat: false });
  } catch {
    return 'Invalid expression';
  }
}

function getNextRuns(expression: string, count = 3): string[] {
  try {
    const parts = expression.split(' ');
    if (parts.length !== 5) return [];
    const [minP, hrP, domP, monP, dowP] = parts;

    const matchField = (field: string, value: number): boolean => {
      if (field === '*') return true;
      return field.split(',').some(part => {
        if (part.includes('/')) {
          const [, step] = part.split('/');
          return value % parseInt(step) === 0;
        }
        if (part.includes('-')) {
          const [lo, hi] = part.split('-').map(Number);
          return value >= lo && value <= hi;
        }
        return parseInt(part) === value;
      });
    };

    const runs: string[] = [];
    const d = new Date();
    d.setSeconds(0, 0);
    d.setMinutes(d.getMinutes() + 1); // start from next minute

    for (let i = 0; i < 60 * 24 * 8 && runs.length < count; i++) {
      const min = d.getMinutes();
      const hr = d.getHours();
      const dom = d.getDate();
      const mon = d.getMonth() + 1;
      const dow = d.getDay();
      if (
        matchField(minP, min) &&
        matchField(hrP, hr) &&
        matchField(domP, dom) &&
        matchField(monP, mon) &&
        matchField(dowP, dow)
      ) {
        runs.push(d.toLocaleString());
      }
      d.setMinutes(d.getMinutes() + 1);
    }
    return runs;
  } catch {
    return [];
  }
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return 'Never';
  const date = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// ─── Schedule Builder Component ────────────────────────────────────────
function ScheduleBuilder({
  config,
  onChange,
}: {
  config: ScheduleConfig;
  onChange: (config: ScheduleConfig) => void;
}) {
  const expression = buildExpression(config);
  const humanReadable = getHumanReadable(expression);
  const nextRuns = getNextRuns(expression);

  const frequencies: { value: FrequencyType; label: string }[] = [
    { value: 'every_minute', label: 'Every Minute' },
    { value: 'hourly', label: 'Hourly' },
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'custom', label: 'Custom' },
  ];

  return (
    <div className="space-y-4">
      {/* Frequency tabs */}
      <div>
        <label className="text-xs font-semibold text-muted-foreground block mb-2">Frequency</label>
        <div className="flex flex-wrap gap-1 p-1 bg-secondary/50 rounded-lg">
          {frequencies.map(f => (
            <button
              key={f.value}
              type="button"
              onClick={() => onChange({ ...config, frequency: f.value })}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                config.frequency === f.value
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Frequency-specific configuration */}
      {config.frequency === 'hourly' && (
        <div className="space-y-1">
          <label className="text-xs font-semibold text-muted-foreground">At minute</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              max={59}
              value={config.minute}
              onChange={(e) => onChange({ ...config, minute: Math.min(59, Math.max(0, parseInt(e.target.value) || 0)) })}
              className="w-20 px-3 py-2 bg-background border border-input rounded-md text-sm font-mono focus:ring-2 focus:ring-primary"
            />
            <span className="text-xs text-muted-foreground">past every hour</span>
          </div>
        </div>
      )}

      {(config.frequency === 'daily' || config.frequency === 'weekly') && (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">Hour</label>
            <select
              value={config.hour}
              onChange={(e) => onChange({ ...config, hour: parseInt(e.target.value) })}
              className="w-full px-3 py-2 bg-background border border-input rounded-md text-sm focus:ring-2 focus:ring-primary"
            >
              {Array.from({ length: 24 }, (_, i) => (
                <option key={i} value={i}>
                  {i.toString().padStart(2, '0')}:00 {i < 12 ? 'AM' : 'PM'}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">Minute</label>
            <select
              value={config.minute}
              onChange={(e) => onChange({ ...config, minute: parseInt(e.target.value) })}
              className="w-full px-3 py-2 bg-background border border-input rounded-md text-sm focus:ring-2 focus:ring-primary"
            >
              {Array.from({ length: 60 }, (_, i) => (
                <option key={i} value={i}>:{i.toString().padStart(2, '0')}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {config.frequency === 'weekly' && (
        <div className="space-y-1">
          <label className="text-xs font-semibold text-muted-foreground">Days of the week</label>
          <div className="flex gap-1.5">
            {DAY_LABELS.map((label, i) => {
              const isSelected = config.days.includes(i);
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    const days = isSelected
                      ? config.days.filter(d => d !== i)
                      : [...config.days, i];
                    onChange({ ...config, days });
                  }}
                  className={`w-10 h-10 rounded-lg text-xs font-medium transition-all ${
                    isSelected
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {config.frequency === 'custom' && (() => {
        const fields = config.customExpression.split(' ');
        while (fields.length < 5) fields.push('*');
        const labels = [
          { name: 'minute', range: '0-59', color: 'text-blue-500' },
          { name: 'hour', range: '0-23', color: 'text-emerald-500' },
          { name: 'day', range: '1-31', color: 'text-amber-500' },
          { name: 'month', range: '1-12', color: 'text-purple-500' },
          { name: 'dow', range: '0-6', color: 'text-rose-500' },
        ];
        const updateField = (idx: number, val: string) => {
          const newFields = [...fields];
          newFields[idx] = val || '*';
          onChange({ ...config, customExpression: newFields.slice(0, 5).join(' ') });
        };
        return (
          <div className="space-y-3">
            <div className="flex items-center gap-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Cron Expression</label>
              <div className="group relative">
                <Info className="w-3 h-3 text-muted-foreground/40 hover:text-muted-foreground cursor-help transition-colors" />
                <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-3 py-2 bg-popover border border-border rounded-lg shadow-lg text-[11px] text-popover-foreground w-56 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity z-10">
                  <p className="font-medium mb-1">Cron Expression</p>
                  <p className="text-muted-foreground leading-relaxed">A cron expression defines when a task runs. Each field specifies a time unit. Use * for any value, , for lists, - for ranges, / for steps.</p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-5 gap-3">
              {labels.map((l, i) => (
                <div key={l.name} className="flex flex-col items-center gap-1.5">
                  <div className="flex flex-col items-center">
                    <span className={`text-[10px] font-bold uppercase tracking-wider leading-none ${l.color}`}>{l.name}</span>
                    <span className="text-[9px] text-muted-foreground/50 leading-none mt-0.5">{l.range}</span>
                  </div>
                  <input
                    value={fields[i]}
                    onChange={(e) => updateField(i, e.target.value)}
                    className="w-full px-2 py-2 bg-background border border-input rounded-lg text-sm font-mono text-center focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                    placeholder="*"
                  />
                </div>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-muted-foreground/50">
              <code className="bg-secondary px-1.5 py-0.5 rounded font-mono">*</code><span>any</span>
              <span className="text-muted-foreground/20">·</span>
              <code className="bg-secondary px-1.5 py-0.5 rounded font-mono">,</code><span>list</span>
              <span className="text-muted-foreground/20">·</span>
              <code className="bg-secondary px-1.5 py-0.5 rounded font-mono">-</code><span>range</span>
              <span className="text-muted-foreground/20">·</span>
              <code className="bg-secondary px-1.5 py-0.5 rounded font-mono">/</code><span>step</span>
            </div>
          </div>
        );
      })()}

      {/* Live preview */}
      <div className="bg-secondary/30 border border-border/50 rounded-lg p-3 space-y-2">
        <div className="flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs font-semibold text-foreground">{humanReadable}</span>
        </div>
        <div className="flex items-center gap-2">
          <code className="text-[11px] font-mono text-muted-foreground bg-secondary px-2 py-0.5 rounded">
            {expression}
          </code>
        </div>
        {nextRuns.length > 0 && (
          <div className="space-y-0.5 pt-1 border-t border-border/30">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Next runs</p>
            {nextRuns.map((r, i) => (
              <p key={i} className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                <Calendar className="w-3 h-3 opacity-50" />
                {r}
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Cron Job Form (Create / Edit) ─────────────────────────────────────
function CronJobForm({
  initialName,
  initialExpression,
  initialPrompt,
  title,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initialName: string;
  initialExpression: string;
  initialPrompt: string;
  title: string;
  submitLabel: string;
  onSubmit: (name: string, expression: string, prompt: string) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initialName);
  const [prompt, setPrompt] = useState(initialPrompt);
  const [scheduleConfig, setScheduleConfig] = useState<ScheduleConfig>(
    parseExpressionToConfig(initialExpression)
  );

  const expression = buildExpression(scheduleConfig);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      {/* Modal */}
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-card border border-border rounded-2xl p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200 mx-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border pb-4 mb-5">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            {title}
          </h3>
          <button
            onClick={onCancel}
            className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Left column: Name + Schedule */}
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Task Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 bg-background border border-input rounded-md text-sm focus:ring-2 focus:ring-primary"
                placeholder="e.g. Daily Yield Harvest"
              />
            </div>
            <ScheduleBuilder config={scheduleConfig} onChange={setScheduleConfig} />
          </div>

          {/* Right column: Prompt */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">Execution Prompt</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-input rounded-md text-sm font-mono h-full min-h-[200px] resize-y focus:ring-2 focus:ring-primary"
              placeholder="e.g. Check all yield farms and harvest rewards if gas is under 15 gwei..."
            />
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-5 mt-5 border-t border-border">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-md hover:bg-secondary text-sm font-medium transition-colors border border-border"
          >
            Cancel
          </button>
          <button
            onClick={() => onSubmit(name.trim(), expression, prompt.trim())}
            disabled={!name.trim() || !expression.trim() || !prompt.trim()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-medium transition-colors disabled:opacity-50"
          >
            <Check className="w-3.5 h-3.5" />
            {submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────
export function CronsPage({ agents }: { agents: Agent[] }) {
  const [searchParams] = useSearchParams();
  const agentIdParam = searchParams.get('agent');
  const navigate = useNavigate();

  // Auto-select main agent if no param
  const activeAgent = agents.find(a => a.id === agentIdParam)
    || agents.find(a => a.name === 'sigil')
    || agents[0]
    || null;

  const [crons, setCrons] = useState<CronJob[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const fetchCrons = async () => {
    if (!activeAgent) return;
    const token = localStorage.getItem('sigil_token');
    if (!token) return;

    setIsLoading(true);
    setError(null);
    try {
      const client = new ApiClient(token);
      const res = await client.getCronJobs(activeAgent.id);
      setCrons(res.data || []);
    } catch (err: any) {
      console.error('Failed to fetch crons:', err);
      setError(err.error || err.message || 'Failed to fetch crons');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCrons();
  }, [activeAgent?.id]);

  const handleCreate = async (name: string, expression: string, prompt: string) => {
    if (!activeAgent) return;
    const token = localStorage.getItem('sigil_token');
    if (!token) return;

    try {
      const client = new ApiClient(token);
      await client.createCronJob(activeAgent.id, name, expression, prompt);
      setIsCreating(false);
      await fetchCrons();
    } catch (err: any) {
      console.error('Failed to create cron:', err);
      setError(err.error || err.message || 'Failed to create cron job');
    }
  };

  const handleUpdate = async (id: number, name: string, expression: string, prompt: string) => {
    const token = localStorage.getItem('sigil_token');
    if (!token) return;

    try {
      const client = new ApiClient(token);
      await client.updateCronJob(id, name, expression, prompt);
      setEditingId(null);
      await fetchCrons();
    } catch (err: any) {
      console.error('Failed to update cron:', err);
      setError(err.error || err.message || 'Failed to update cron job');
    }
  };

  const handleToggle = async (id: number, active: boolean) => {
    const token = localStorage.getItem('sigil_token');
    if (!token) return;

    try {
      const client = new ApiClient(token);
      await client.toggleCronJob(id, active);
      await fetchCrons();
    } catch (err: any) {
      console.error('Failed to toggle cron:', err);
      setError(err.error || err.message || 'Failed to toggle cron job');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this scheduled task?')) return;

    const token = localStorage.getItem('sigil_token');
    if (!token) return;

    try {
      const client = new ApiClient(token);
      await client.deleteCronJob(id);
      await fetchCrons();
    } catch (err: any) {
      console.error('Failed to delete cron:', err);
      setError(err.error || err.message || 'Failed to delete cron job');
    }
  };

  const editingCron = useMemo(() => crons.find(c => c.id === editingId), [crons, editingId]);

  return (
    <div className="flex flex-col h-full space-y-6 overflow-y-auto pr-2">
      <header className="flex flex-col space-y-2 shrink-0">
        <h1 className="text-3xl font-bold tracking-tight">Scheduled Tasks</h1>
        <p className="text-muted-foreground">Manage and monitor periodic agent executions (crons).</p>
      </header>

      {/* Agent Selector */}
      <div className="flex items-center gap-4 bg-card border border-border rounded-xl p-4 shrink-0 shadow-sm">
        <div className="flex-1 max-w-sm">
          <CustomSelect
            label="Target Agent"
            value={activeAgent?.id || ''}
            onChange={(id) => navigate(`/crons?agent=${id}`)}
            options={agents.map(a => ({ id: a.id, label: a.name }))}
          />
        </div>
        <button
          onClick={() => { setIsCreating(true); setEditingId(null); }}
          disabled={!activeAgent}
          className="ml-auto inline-flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 text-sm font-medium rounded-md transition-colors disabled:opacity-50"
        >
          <Plus className="w-4 h-4" />
          New Cron Job
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-3 text-red-600 animate-in fade-in shrink-0">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <p className="text-xs font-medium leading-relaxed flex-1">{error}</p>
          <button onClick={() => setError(null)} className="hover:opacity-70 transition-opacity">
            <span className="sr-only">Dismiss</span>×
          </button>
        </div>
      )}

      {/* Create Form */}
      {isCreating && (
        <CronJobForm
          initialName=""
          initialExpression="0 * * * *"
          initialPrompt=""
          title="Create New Scheduled Task"
          submitLabel="Create Task"
          onSubmit={(name, expression, prompt) => handleCreate(name, expression, prompt)}
          onCancel={() => setIsCreating(false)}
        />
      )}

      {/* Edit Form */}
      {editingCron && !isCreating && (
        <CronJobForm
          key={editingCron.id}
          initialName={editingCron.name}
          initialExpression={editingCron.expression}
          initialPrompt={editingCron.task_prompt}
          title={`Edit: ${editingCron.name}`}
          submitLabel="Save Changes"
          onSubmit={(name, expression, prompt) => handleUpdate(editingCron.id, name, expression, prompt)}
          onCancel={() => setEditingId(null)}
        />
      )}

      {!activeAgent ? (
        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
          <Clock className="w-12 h-12 opacity-20 mb-4" />
          <p>Select an agent above to view its scheduled tasks.</p>
        </div>
      ) : isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : crons.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center bg-card border border-border rounded-xl border-dashed">
          <Clock className="w-12 h-12 text-muted-foreground opacity-20 mb-4" />
          <h3 className="text-lg font-medium text-muted-foreground">No scheduled tasks</h3>
          <p className="text-sm text-muted-foreground mt-1 text-center max-w-sm">
            This agent has no cron jobs configured. Create a scheduled task to run periodic actions autonomously.
          </p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden shrink-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-secondary/30">
                <tr>
                  <th className="px-6 py-3 font-semibold">Status / Name</th>
                  <th className="px-6 py-3 font-semibold">Schedule</th>
                  <th className="px-6 py-3 font-semibold">Prompt</th>
                  <th className="px-6 py-3 font-semibold">Last Run</th>
                  <th className="px-6 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {crons.map((cron) => (
                  <tr key={cron.id} className={`border-b border-border/50 hover:bg-muted/50 transition-colors ${editingId === cron.id ? 'bg-primary/5' : ''}`}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-2 h-2 rounded-full shrink-0 ${cron.is_active ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]' : 'bg-muted-foreground/30'}`}
                          title={cron.is_active ? 'Active' : 'Inactive'}
                        />
                        <span className="font-medium">{cron.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-0.5">
                        <code className="bg-secondary px-2 py-0.5 rounded text-xs text-muted-foreground block">
                          {cron.expression}
                        </code>
                        <p className="text-[10px] text-muted-foreground/60">
                          {getHumanReadable(cron.expression)}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4 max-w-[200px]">
                      <span className="truncate block font-mono text-xs text-muted-foreground" title={cron.task_prompt}>
                        {cron.task_prompt}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs text-muted-foreground">
                        {timeAgo(cron.last_run)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => { setEditingId(cron.id); setIsCreating(false); }}
                          className="inline-flex items-center justify-center p-1.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                          title="Edit Task"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleToggle(cron.id, !cron.is_active)}
                          className={`inline-flex items-center justify-center p-1.5 rounded-md hover:bg-secondary transition-colors ${cron.is_active ? 'text-orange-500 hover:text-orange-600' : 'text-green-500 hover:text-green-600'}`}
                          title={cron.is_active ? "Pause Task" : "Resume Task"}
                        >
                          {cron.is_active ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => handleDelete(cron.id)}
                          className="inline-flex items-center justify-center p-1.5 rounded-md hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors"
                          title="Delete Task"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
