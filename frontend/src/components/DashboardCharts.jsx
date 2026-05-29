import React, { useState } from 'react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  LineChart, Line, AreaChart, Area, RadialBarChart, RadialBar,
} from 'recharts';
import { CATEGORY_COLORS } from '../utils/syntheticData';
import { TrendingUp, Activity, BarChart2, Layers, Flame } from 'lucide-react';

const CHART_COLORS = ['#06b6d4', '#8b5cf6', '#f59e0b', '#10b981', '#ec4899', '#3b82f6', '#f97316', '#64748b', '#22c55e', '#ef4444'];

function GlowTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-bank-card/95 border border-bank-cardBorder px-3 py-2 rounded-xl text-xs shadow-lg backdrop-blur">
      {label && <p className="text-bank-textMuted font-bold mb-1">{label}</p>}
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color || p.fill }} />
          <span className="text-bank-textMuted">{p.name}:</span>
          <span className="text-bank-textActive font-bold">₹{(p.value || 0).toLocaleString('en-IN')}</span>
        </div>
      ))}
    </div>
  );
}

export default function DashboardCharts({ analytics, filter }) {
  const [activeIndex, setActiveIndex] = useState(null);

  if (!analytics) return null;

  const { categoryData, monthlyTrend, heatmapData, predictionData } = analytics;

  // Investment donut data
  const investmentAlloc = [
    { name: 'SIP/MF', value: 40, color: '#10b981' },
    { name: 'FD', value: 25, color: '#06b6d4' },
    { name: 'PPF', value: 20, color: '#8b5cf6' },
    { name: 'ETF', value: 15, color: '#f59e0b' },
  ];

  // Health gauge data
  const gaugeData = [{ name: 'Health', value: analytics.healthScore }];

  // Heatmap intensity
  const maxHeat = Math.max(...(heatmapData?.map(d => d.value) || [1]));
  const weeks = ['Wk 1', 'Wk 2', 'Wk 3', 'Wk 4'];
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div className="space-y-6">

      {/* Row 1: Pie + Bar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* 1. Expense Pie Chart */}
        <div className="glass-panel p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-bank-textActive flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-400" /> Category Spending
            </h4>
            <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest bg-cyan-500/5 px-2 py-0.5 rounded-full border border-cyan-500/20">Pie Chart</span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={categoryData.slice(0, 8)}
                cx="50%" cy="50%" innerRadius={55} outerRadius={90}
                dataKey="value" nameKey="name"
                animationBegin={0} animationDuration={1000}
                onMouseEnter={(_, i) => setActiveIndex(i)}
                onMouseLeave={() => setActiveIndex(null)}
              >
                {categoryData.slice(0, 8).map((entry, i) => (
                  <Cell
                    key={i}
                    fill={CATEGORY_COLORS[entry.name] || CHART_COLORS[i % CHART_COLORS.length]}
                    opacity={activeIndex === null || activeIndex === i ? 1 : 0.5}
                    stroke={activeIndex === i ? '#fff' : 'transparent'}
                    strokeWidth={2}
                  />
                ))}
              </Pie>
              <Tooltip content={<GlowTooltip />} />
              <Legend
                formatter={(value) => <span className="text-[10px] text-bank-textMuted">{value}</span>}
                iconType="circle" iconSize={8}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* 2. Savings vs Expenses Bar Chart */}
        <div className="glass-panel p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-bank-textActive flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-purple-400" /> Savings vs Expenses
            </h4>
            <span className="text-[10px] font-bold text-purple-400 uppercase tracking-widest bg-purple-500/5 px-2 py-0.5 rounded-full border border-purple-500/20">Bar Chart</span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthlyTrend} barGap={4}>
              <defs>
                <linearGradient id="barGradExp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.9} />
                  <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.4} />
                </linearGradient>
                <linearGradient id="barGradSav" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.9} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.4} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
              <Tooltip content={<GlowTooltip />} />
              <Bar dataKey="expenses" name="Expenses" fill="url(#barGradExp)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="savings" name="Savings" fill="url(#barGradSav)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row 2: Line Trend + Health Gauge */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* 3. Spending Trend Line */}
        <div className="glass-panel p-6 space-y-4 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-bank-textActive flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" /> Spending Trend
            </h4>
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest bg-emerald-500/5 px-2 py-0.5 rounded-full border border-emerald-500/20">Line Chart</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={monthlyTrend}>
              <defs>
                <filter id="glow-line">
                  <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                  <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
              <Tooltip content={<GlowTooltip />} />
              <Line type="monotone" dataKey="expenses" name="Expenses" stroke="#f43f5e" strokeWidth={2} dot={{ fill: '#f43f5e', r: 3 }} filter="url(#glow-line)" />
              <Line type="monotone" dataKey="income" name="Income" stroke="#10b981" strokeWidth={2} dot={{ fill: '#10b981', r: 3 }} filter="url(#glow-line)" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* 4. Financial Health Gauge */}
        <div className="glass-panel p-6 flex flex-col items-center justify-center space-y-3">
          <h4 className="text-sm font-bold text-bank-textActive w-full text-left flex items-center gap-2">
            <Activity className="w-4 h-4 text-amber-400" /> Health Score
          </h4>
          <div className="relative flex items-center justify-center" style={{ width: 150, height: 150 }}>
            <ResponsiveContainer width={150} height={150}>
              <RadialBarChart cx="50%" cy="50%" innerRadius="60%" outerRadius="90%" startAngle={225} endAngle={-45} data={gaugeData}>
                <RadialBar
                  background={{ fill: '#1e293b' }}
                  dataKey="value"
                  cornerRadius={10}
                  fill={analytics.healthScore >= 70 ? '#10b981' : analytics.healthScore >= 40 ? '#f59e0b' : '#ef4444'}
                />
              </RadialBarChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-3xl font-black" style={{ color: analytics.healthScore >= 70 ? '#10b981' : analytics.healthScore >= 40 ? '#f59e0b' : '#ef4444' }}>
                {analytics.healthScore}
              </span>
              <span className="text-[10px] text-bank-textMuted font-bold uppercase tracking-wider">/100</span>
            </div>
          </div>
          <div className="text-center">
            <span className={`text-xs font-bold px-3 py-1 rounded-full ${analytics.healthScore >= 70 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : analytics.healthScore >= 40 ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
              {analytics.healthScore >= 70 ? '🟢 Excellent' : analytics.healthScore >= 40 ? '🟡 Fair' : '🔴 Needs Work'}
            </span>
            <p className="text-[10px] text-bank-textMuted mt-2 leading-relaxed">Based on savings ratio, expense control & investment habits</p>
          </div>
        </div>
      </div>

      {/* Row 3: Investment Donut + Cashflow Area */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* 5. Investment Allocation Donut */}
        <div className="glass-panel p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-bank-textActive">💎 Investment Allocation</h4>
            <span className="text-[10px] font-bold text-teal-400 uppercase tracking-widest bg-teal-500/5 px-2 py-0.5 rounded-full border border-teal-500/20">Suggested</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={investmentAlloc} cx="50%" cy="50%" innerRadius={50} outerRadius={80}
                dataKey="value" nameKey="name" animationDuration={1000}>
                {investmentAlloc.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={v => `${v}%`} contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, fontSize: 11 }} />
              <Legend formatter={(v) => <span className="text-[10px] text-bank-textMuted">{v}</span>} iconType="circle" iconSize={8} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* 6. Cashflow Area Chart */}
        <div className="glass-panel p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-bank-textActive">🌊 Cashflow Overview</h4>
            <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest bg-blue-500/5 px-2 py-0.5 rounded-full border border-blue-500/20">Area Chart</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={monthlyTrend}>
              <defs>
                <linearGradient id="areaIncome" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="areaExpense" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
              <Tooltip content={<GlowTooltip />} />
              <Area type="monotone" dataKey="income" name="Income" stroke="#10b981" fill="url(#areaIncome)" strokeWidth={2} />
              <Area type="monotone" dataKey="expenses" name="Expenses" stroke="#f43f5e" fill="url(#areaExpense)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row 4: Heatmap + Prediction */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* 7. Weekly Spending Heatmap */}
        <div className="glass-panel p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-bank-textActive flex items-center gap-2">
              <Flame className="w-4 h-4 text-orange-400" /> Weekly Spending Intensity
            </h4>
            <span className="text-[10px] font-bold text-orange-400 uppercase tracking-widest bg-orange-500/5 px-2 py-0.5 rounded-full border border-orange-500/20">Heatmap</span>
          </div>
          <div className="overflow-x-auto">
            <div className="space-y-2 min-w-[320px]">
              <div className="flex gap-2 pl-14">
                {days.map(d => <div key={d} className="w-10 text-center text-[9px] text-bank-textMuted font-bold uppercase">{d}</div>)}
              </div>
              {weeks.map(week => (
                <div key={week} className="flex items-center gap-2">
                  <div className="w-12 text-[9px] text-bank-textMuted font-bold text-right pr-2">{week}</div>
                  {days.map(day => {
                    const cell = heatmapData.find(d => d.week === week && d.day === day);
                    const intensity = cell ? cell.value / maxHeat : 0;
                    const alpha = 0.15 + intensity * 0.85;
                    return (
                      <div
                        key={day}
                        title={`₹${cell?.value?.toLocaleString('en-IN') || 0}`}
                        className="w-10 h-8 rounded-md transition-all duration-300 hover:scale-110 cursor-default"
                        style={{ background: `rgba(251, 146, 60, ${alpha})`, boxShadow: intensity > 0.7 ? `0 0 8px rgba(251,146,60,${alpha*0.6})` : 'none' }}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2 mt-3 justify-end">
              <span className="text-[9px] text-bank-textMuted">Low</span>
              {[0.15, 0.4, 0.65, 0.85, 1].map(v => (
                <div key={v} className="w-5 h-3 rounded-sm" style={{ background: `rgba(251,146,60,${v})` }} />
              ))}
              <span className="text-[9px] text-bank-textMuted">High</span>
            </div>
          </div>
        </div>

        {/* 8. AI Prediction Graph */}
        <div className="glass-panel p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-bank-textActive">🤖 AI Expense Prediction</h4>
            <span className="text-[10px] font-bold text-violet-400 uppercase tracking-widest bg-violet-500/5 px-2 py-0.5 rounded-full border border-violet-500/20">Next 3 Months</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={predictionData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 9 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
              <Tooltip content={<GlowTooltip />} />
              <Line
                type="monotone" dataKey="expenses" name="Expenses"
                stroke="#8b5cf6" strokeWidth={2}
                strokeDasharray={(d) => d?.predicted ? '6 3' : '0'}
                dot={(props) => {
                  const { cx, cy, payload } = props;
                  return payload.predicted
                    ? <circle key={`dot-${cx}`} cx={cx} cy={cy} r={4} fill="#8b5cf6" opacity={0.5} strokeDasharray="3 3" stroke="#8b5cf6" />
                    : <circle key={`dot-${cx}`} cx={cx} cy={cy} r={3} fill="#8b5cf6" />;
                }}
              />
            </LineChart>
          </ResponsiveContainer>
          <p className="text-[10px] text-bank-textMuted text-center">Dashed = AI predicted future months based on trend analysis</p>
        </div>
      </div>

    </div>
  );
}
