import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import type { Agent } from '../hooks/useAgents';

interface PortfolioChartProps {
    activeAgent: Agent | null;
}

const data = [
  { name: 'SOL', value: 400 },
  { name: 'USDC', value: 300 },
  { name: 'BONK', value: 300 },
  { name: 'JUP', value: 200 },
];

const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ec4899']; // Tailwind colors: green, blue, amber, pink

const renderCustomizedLabel = ({
  cx, cy, midAngle, innerRadius, outerRadius, percent
}: any) => {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * Math.PI / 180);
  const y = cy + radius * Math.sin(-midAngle * Math.PI / 180);

  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" className="text-[10px] font-bold">
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

export function PortfolioChart({ activeAgent }: PortfolioChartProps) {
    if (!activeAgent) return <div className="p-4 text-muted-foreground text-sm">Select an agent</div>;

    return (
        <div className="w-full h-[250px] p-2 bg-card">
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        fill="#8884d8"
                        paddingAngle={5}
                        dataKey="value"
                        stroke="none"
                        labelLine={false}
                        label={renderCustomizedLabel}
                    >
                        {data.map((_entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip 
                        contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px', color: '#fff' }} 
                        itemStyle={{ color: '#fff' }}
                    />
                    <Legend iconType="circle" />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
}
