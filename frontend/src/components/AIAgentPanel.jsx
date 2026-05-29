import React, { useState, useEffect, useCallback } from 'react';
import {
  PieChart, Brain, TrendingUp, ShieldAlert, LineChart,
  MessageSquare, ChevronDown, ChevronUp, CheckCircle, AlertTriangle
} from 'lucide-react';

const COLOR_MAP = {
  blue:    { bg: 'bg-blue-500/10',    border: 'border-blue-500/20',    text: 'text-blue-400',    pulse: 'bg-blue-400',    bar: 'from-blue-500 to-blue-400' },
  emerald: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400', pulse: 'bg-emerald-400', bar: 'from-emerald-500 to-teal-400' },
  teal:    { bg: 'bg-teal-500/10',    border: 'border-teal-500/20',    text: 'text-teal-400',    pulse: 'bg-teal-400',    bar: 'from-teal-500 to-cyan-400' },
  amber:   { bg: 'bg-amber-500/10',   border: 'border-amber-500/20',   text: 'text-amber-400',   pulse: 'bg-amber-400',   bar: 'from-amber-500 to-orange-400' },
  purple:  { bg: 'bg-purple-500/10',  border: 'border-purple-500/20',  text: 'text-purple-400',  pulse: 'bg-purple-400',  bar: 'from-purple-500 to-pink-400' },
  pink:    { bg: 'bg-pink-500/10',    border: 'border-pink-500/20',    text: 'text-pink-400',    pulse: 'bg-pink-400',    bar: 'from-pink-500 to-rose-400' },
};

// ── Compute agent findings from real analytics data ─────────────
function computeAgentFindings(analytics) {
  if (!analytics) return {};
  const { totalIncome, totalExpenses, savings, savingsRatio, categoryData, healthScore, monthlyTrend } = analytics;

  const topCat = categoryData?.[0];
  const foodData = categoryData?.find(c => c.name === 'Food & Dining');
  const sipData = categoryData?.find(c => c.name === 'SIP / MF');
  const entData = categoryData?.find(c => c.name === 'Entertainment');
  const rentData = categoryData?.find(c => c.name === 'Rent');
  const investData = categoryData?.find(c => c.name === 'Investment');
  const totalInvested = (sipData?.value || 0) + (investData?.value || 0);
  const expenseRatio = totalIncome > 0 ? Math.round((totalExpenses / totalIncome) * 100) : 0;
  const lastMonth = monthlyTrend?.[monthlyTrend.length - 1];
  const prevMonth = monthlyTrend?.[monthlyTrend.length - 2];
  const expenseChange = lastMonth && prevMonth && prevMonth.expenses > 0
    ? Math.round(((lastMonth.expenses - prevMonth.expenses) / prevMonth.expenses) * 100) : 0;

  return {
    // ── Spending Analysis Agent ──────────────────────────────────
    spending: {
      summary: topCat
        ? `Top spend: ${topCat.name} (₹${topCat.value?.toLocaleString('en-IN')})`
        : 'No dominant category found',
      metrics: [
        { label: 'Total Expenses', value: `₹${totalExpenses?.toLocaleString('en-IN')}`, ok: expenseRatio < 70 },
        { label: 'Expense Ratio', value: `${expenseRatio}%`, ok: expenseRatio < 70 },
        { label: 'MoM Change', value: expenseChange >= 0 ? `+${expenseChange}%` : `${expenseChange}%`, ok: expenseChange <= 5 },
        { label: 'Categories tracked', value: `${categoryData?.length || 0}`, ok: true },
      ],
      findings: [
        topCat ? `${topCat.name} accounts for ${Math.round((topCat.value / totalExpenses) * 100)}% of expenses` : null,
        expenseRatio > 80 ? '⚠ Expense ratio critically high — above 80%' : expenseRatio > 60 ? '⚠ Expenses above healthy 60% threshold' : '✓ Expense ratio is within healthy range',
        expenseChange > 10 ? `⚠ Expenses grew ${expenseChange}% vs last month` : expenseChange > 0 ? `Expenses grew modestly (+${expenseChange}%)` : '✓ Expenses stable or declining',
        foodData ? `Food spend: ₹${foodData.value?.toLocaleString('en-IN')} (${Math.round((foodData.value / totalIncome) * 100)}% of income)` : null,
        entData && (entData.value / totalIncome) > 0.05 ? `⚠ Entertainment above 5% income threshold` : null,
      ].filter(Boolean),
    },

    // ── Savings Optimizer Agent ──────────────────────────────────
    savings: {
      summary: `Savings rate: ${savingsRatio}% · ₹${savings?.toLocaleString('en-IN')}/month`,
      metrics: [
        { label: 'Monthly Savings', value: `₹${savings?.toLocaleString('en-IN')}`, ok: savings > 0 },
        { label: 'Savings Rate', value: `${savingsRatio}%`, ok: savingsRatio >= 20 },
        { label: 'Target (20% rule)', value: `₹${Math.round(totalIncome * 0.2)?.toLocaleString('en-IN')}`, ok: true },
        { label: 'Emergency Fund (3mo)', value: `₹${Math.round(totalExpenses * 3)?.toLocaleString('en-IN')}`, ok: false },
      ],
      findings: [
        savingsRatio >= 20 ? `✓ Savings rate ${savingsRatio}% exceeds 20% benchmark` : `⚠ Savings rate ${savingsRatio}% is below 20% target`,
        savings > 0 ? `₹${savings?.toLocaleString('en-IN')}/month available for goals` : '⚠ Negative savings — expenses exceed income',
        `Emergency fund target: ₹${Math.round(totalExpenses * 3)?.toLocaleString('en-IN')} (3 months expenses)`,
        savingsRatio < 20 ? `To reach 20%: reduce expenses by ₹${Math.round(totalIncome * 0.2 - savings)?.toLocaleString('en-IN')}/month` : `Surplus of ₹${Math.round(savings - totalIncome * 0.2)?.toLocaleString('en-IN')}/month beyond target`,
      ],
    },

    // ── Investment Advisor Agent ─────────────────────────────────
    investment: {
      summary: totalInvested > 0
        ? `Investing ₹${totalInvested?.toLocaleString('en-IN')}/mo (${Math.round((totalInvested / totalIncome) * 100)}% of income)`
        : 'No investments detected in data',
      metrics: [
        { label: 'Monthly Invested', value: `₹${totalInvested?.toLocaleString('en-IN')}`, ok: totalInvested > 0 },
        { label: 'Investment %', value: `${Math.round((totalInvested / Math.max(totalIncome, 1)) * 100)}%`, ok: totalInvested / totalIncome >= 0.1 },
        { label: 'SIP Amount', value: sipData ? `₹${sipData.value?.toLocaleString('en-IN')}` : '₹0', ok: !!sipData },
        { label: '10yr corpus (8%)', value: `₹${Math.round(totalInvested * 12 * 14.49)?.toLocaleString('en-IN')}`, ok: true },
      ],
      findings: [
        totalInvested > 0 ? `Current investment rate: ${Math.round((totalInvested / totalIncome) * 100)}% of income` : '⚠ No investment activity found — start SIP now',
        totalInvested / totalIncome < 0.1 ? `⚠ Investment below 10% income threshold — target ₹${Math.round(totalIncome * 0.15)?.toLocaleString('en-IN')}/month` : '✓ Investment rate is healthy',
        sipData ? `✓ SIP active: ₹${sipData.value?.toLocaleString('en-IN')}/month in mutual funds` : 'Suggestion: Start ₹2000/month SIP in Nifty 50 Index Fund',
        `Recommended: 40% large-cap, 30% mid-cap, 20% debt, 10% gold ETF`,
        `At current rate, 10-year corpus: ₹${Math.round(totalInvested * 12 * 14.49)?.toLocaleString('en-IN')} (8% CAGR)`,
      ],
    },

    // ── Risk Detection Agent ─────────────────────────────────────
    risk: {
      summary: healthScore < 50 ? '🔴 High financial risk detected' : healthScore < 70 ? '🟡 Moderate risk' : '🟢 Low risk profile',
      metrics: [
        { label: 'Health Score', value: `${healthScore}/100`, ok: healthScore >= 60 },
        { label: 'Debt/Expense', value: expenseRatio > 80 ? 'High' : expenseRatio > 60 ? 'Medium' : 'Low', ok: expenseRatio <= 60 },
        { label: 'Savings Buffer', value: savings > 0 ? '✓' : '✗', ok: savings > 0 },
        { label: 'Risk Level', value: healthScore >= 70 ? 'Low' : healthScore >= 40 ? 'Medium' : 'High', ok: healthScore >= 70 },
      ],
      findings: [
        expenseRatio > 80 ? '🔴 CRITICAL: Expenses exceed 80% of income — severe overspending' : expenseRatio > 60 ? '🟡 Expenses between 60-80% — monitor closely' : '🟢 Expense ratio under control',
        savings < 0 ? '🔴 ALERT: Negative savings — spending more than earning' : savings < totalIncome * 0.1 ? '🟡 Very low savings buffer — risky if income disrupted' : '🟢 Adequate savings buffer maintained',
        rentData && rentData.value / totalIncome > 0.4 ? '🔴 Rent exceeds 40% income — housing risk' : rentData && rentData.value / totalIncome > 0.3 ? '🟡 Rent above 30% income guideline' : '🟢 Housing cost is manageable',
        entData && entData.value / totalIncome > 0.1 ? '🟡 Entertainment overspend — review subscriptions' : '🟢 Entertainment within limits',
        `Financial Health Score: ${healthScore}/100 — ${healthScore >= 70 ? 'Excellent' : healthScore >= 40 ? 'Needs improvement' : 'Requires immediate attention'}`,
      ],
    },

    // ── Predictive Analytics Agent ───────────────────────────────
    prediction: {
      summary: monthlyTrend?.length > 1
        ? `Trend: expenses ${expenseChange >= 0 ? '+' : ''}${expenseChange}% MoM`
        : 'Insufficient data for prediction',
      metrics: [
        { label: 'Next Month Expenses', value: `₹${Math.round(totalExpenses * (1 + Math.max(expenseChange / 100, -0.1)))?.toLocaleString('en-IN')}`, ok: true },
        { label: 'Projected Savings', value: `₹${Math.round(savings * 0.95)?.toLocaleString('en-IN')}`, ok: savings > 0 },
        { label: 'Expense Trend', value: expenseChange > 0 ? `↑ +${expenseChange}%` : `↓ ${expenseChange}%`, ok: expenseChange <= 0 },
        { label: '6-Month Corpus', value: `₹${Math.round(savings * 6)?.toLocaleString('en-IN')}`, ok: savings > 0 },
      ],
      findings: [
        monthlyTrend?.length > 1 ? `Expense trend: ${expenseChange >= 0 ? '↑ Growing' : '↓ Declining'} at ${Math.abs(expenseChange)}% per month` : 'Need more months of data for trend analysis',
        `Projected next month expenses: ₹${Math.round(totalExpenses * (1 + Math.max(expenseChange / 100, -0.05)))?.toLocaleString('en-IN')}`,
        `At current savings rate, 6-month corpus: ₹${Math.round(savings * 6)?.toLocaleString('en-IN')}`,
        savings > 0 && totalInvested > 0 ? `Projected 1-year investment value: ₹${Math.round(totalInvested * 13)?.toLocaleString('en-IN')} (~8% returns)` : 'Start investing to project wealth growth',
        expenseChange > 5 ? '⚠ Expenses growing fast — apply spending controls next month' : '✓ Spending pattern is stable',
      ],
    },

    // ── Financial Coach Agent ────────────────────────────────────
    coach: {
      summary: `Personalized plan based on ${categoryData?.length || 0} categories · ₹${totalIncome?.toLocaleString('en-IN')} income`,
      metrics: [
        { label: 'Income', value: `₹${totalIncome?.toLocaleString('en-IN')}`, ok: true },
        { label: 'Net Savings', value: `₹${savings?.toLocaleString('en-IN')}`, ok: savings > 0 },
        { label: 'Categories', value: `${categoryData?.length || 0} tracked`, ok: true },
        { label: 'Plan Status', value: savings > 0 ? 'On Track' : 'Off Track', ok: savings > 0 },
      ],
      findings: [
        `50/30/20 Rule check — Needs: ₹${Math.round(totalIncome * 0.5)?.toLocaleString('en-IN')} | Wants: ₹${Math.round(totalIncome * 0.3)?.toLocaleString('en-IN')} | Savings: ₹${Math.round(totalIncome * 0.2)?.toLocaleString('en-IN')}`,
        `Your actual split — Expenses: ₹${totalExpenses?.toLocaleString('en-IN')} | Savings: ₹${savings?.toLocaleString('en-IN')}`,
        savingsRatio >= 20 ? '✓ You are meeting the 20% savings rule' : `⚠ Savings shortfall of ₹${Math.round(totalIncome * 0.2 - savings)?.toLocaleString('en-IN')}/month`,
        totalInvested > 0 ? `✓ Investing ₹${totalInvested?.toLocaleString('en-IN')}/month — keep growing it` : '⚠ No investment detected — start with ₹500 SIP today',
        `Next milestone: Build ₹${Math.round(totalExpenses * 3)?.toLocaleString('en-IN')} emergency fund`,
      ],
    },
  };
}

const AGENT_CONFIG = [
  { id: 'spending',   name: 'Spending Analysis',       icon: PieChart,     color: 'blue',    tasks: ['Scanning transactions…', 'Detecting patterns…', 'Flagging anomalies…', 'Analysis complete ✓'] },
  { id: 'savings',    name: 'Savings Optimizer',        icon: Brain,        color: 'emerald', tasks: ['Loading income data…', 'Computing savings gap…', 'Generating strategies…', 'Optimization ready ✓'] },
  { id: 'investment', name: 'Investment Advisor',       icon: TrendingUp,   color: 'teal',    tasks: ['Checking risk profile…', 'Evaluating allocations…', 'Mapping SIP options…', 'Suggestions ready ✓'] },
  { id: 'risk',       name: 'Risk Detection',           icon: ShieldAlert,  color: 'amber',   tasks: ['Scanning for spikes…', 'Cross-referencing data…', 'Evaluating exposure…', 'Risk report ready ✓'] },
  { id: 'prediction', name: 'Predictive Analytics',    icon: LineChart,    color: 'purple',  tasks: ['Training model…', 'Applying trends…', 'Running simulations…', 'Forecast complete ✓'] },
  { id: 'coach',      name: 'Financial Coach',          icon: MessageSquare,color: 'pink',    tasks: ['Loading context…', 'Building your plan…', 'Personalizing advice…', 'Coach ready ✓'] },
];

// ── Individual Agent Card ────────────────────────────────────────
function AgentCard({ agent, taskIdx, isDone, isActive, findings, forceExpand }) {
  const [expanded, setExpanded] = useState(false);
  const colors = COLOR_MAP[agent.color];
  const Icon = agent.icon;
  const isOpen = expanded || forceExpand;
  const hasData = findings && Object.keys(findings).length > 0;
  const agentFindings = findings?.[agent.id];

  return (
    <div
      className={`rounded-2xl border transition-all duration-500 ${colors.bg} ${colors.border} ${
        isActive ? 'opacity-100' : 'opacity-25 pointer-events-none'
      }`}
    >
      {/* Card header */}
      <button
        onClick={() => isDone && setExpanded(e => !e)}
        className={`w-full p-4 text-left flex items-start gap-3 ${isDone ? 'cursor-pointer hover:bg-white/5' : 'cursor-default'} transition-colors rounded-2xl`}
      >
        <div className={`p-2 rounded-xl border flex-shrink-0 ${colors.bg} ${colors.border}`}>
          <Icon className={`w-4 h-4 ${colors.text}`} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h4 className="text-xs font-bold text-bank-textActive">{agent.name} Agent</h4>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {isDone ? (
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${colors.bg} ${colors.border} ${colors.text}`}>Done ✓</span>
              ) : isActive ? (
                <span className={`w-1.5 h-1.5 rounded-full ${colors.pulse} animate-ping`} />
              ) : (
                <span className="text-[9px] text-bank-textMuted">Standby</span>
              )}
              {isDone && (
                isOpen ? <ChevronUp className={`w-3.5 h-3.5 ${colors.text}`} /> : <ChevronDown className="w-3.5 h-3.5 text-bank-textMuted" />
              )}
            </div>
          </div>

          {/* Processing status */}
          <p className={`text-[10px] font-mono flex items-center gap-1.5 ${isActive ? colors.text : 'text-bank-textMuted'}`}>
            {isActive && !isDone && (
              <span className="w-2.5 h-2.5 border border-current border-t-transparent rounded-full animate-spin inline-block flex-shrink-0" />
            )}
            {isActive ? agent.tasks[taskIdx] : 'Waiting for data…'}
          </p>

          {/* Summary after done */}
          {isDone && agentFindings?.summary && (
            <p className="text-[10px] text-bank-textMuted mt-1 leading-relaxed">{agentFindings.summary}</p>
          )}

          {/* Progress bar */}
          {isActive && (
            <div className="mt-2 h-1 bg-bank-bg rounded-full overflow-hidden">
              <div
                className={`h-full bg-gradient-to-r ${colors.bar} rounded-full transition-all duration-700`}
                style={{ width: isDone ? '100%' : `${((taskIdx) / (agent.tasks.length - 1)) * 100}%` }}
              />
            </div>
          )}
        </div>
      </button>

      {/* ── Expanded findings panel ── */}
      {isOpen && isDone && agentFindings && (
        <div className="px-4 pb-4 space-y-3 border-t border-white/5 pt-3">

          {/* Metrics grid */}
          {agentFindings.metrics?.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              {agentFindings.metrics.map((m, i) => (
                <div key={i} className="bg-bank-bg/60 rounded-xl px-3 py-2 border border-bank-cardBorder/40 flex items-start justify-between gap-1">
                  <div>
                    <p className="text-[9px] text-bank-textMuted font-bold uppercase tracking-wider">{m.label}</p>
                    <p className={`text-xs font-black mt-0.5 ${colors.text}`}>{m.value}</p>
                  </div>
                  {m.ok
                    ? <CheckCircle className="w-3 h-3 text-emerald-400 flex-shrink-0 mt-1" />
                    : <AlertTriangle className="w-3 h-3 text-amber-400 flex-shrink-0 mt-1" />
                  }
                </div>
              ))}
            </div>
          )}

          {/* Findings list */}
          {agentFindings.findings?.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[9px] font-bold text-bank-textMuted uppercase tracking-wider">Agent Findings</p>
              {agentFindings.findings.map((f, i) => (
                <div key={i} className="flex items-start gap-2 text-[10px] text-bank-textMuted leading-relaxed">
                  <span className={`w-1 h-1 rounded-full flex-shrink-0 mt-1.5 ${colors.pulse}`} />
                  <span>{f}</span>
                </div>
              ))}
            </div>
          )}

          {/* No data message */}
          {!hasData && (
            <p className="text-[10px] text-bank-textMuted text-center py-2">
              Upload financial data to see detailed findings
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Panel ───────────────────────────────────────────────────
export default function AIAgentPanel({ active = true, analytics }) {
  const [agentStates, setAgentStates] = useState({});
  const [expandAll, setExpandAll] = useState(false);
  const findings = computeAgentFindings(analytics);
  const hasData = !!analytics;
  const doneCount = Object.values(agentStates).filter(s => s?.done).length;

  useEffect(() => {
    if (!active) return;
    setAgentStates({});

    AGENT_CONFIG.forEach((agent, idx) => {
      setTimeout(() => {
        setAgentStates(prev => ({ ...prev, [agent.id]: { taskIdx: 0, done: false } }));
        agent.tasks.forEach((_, ti) => {
          setTimeout(() => {
            const isDone = ti === agent.tasks.length - 1;
            setAgentStates(prev => ({ ...prev, [agent.id]: { taskIdx: ti, done: isDone } }));
          }, ti * 800);
        });
      }, idx * 350);
    });
  }, [active, analytics]);

  return (
    <div className="glass-panel p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-bank-textActive flex items-center gap-2">
          <Brain className="w-4 h-4 text-purple-400" />
          Multi-AI Agent System
          <span className="text-[10px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2 py-0.5 rounded-full">
            {doneCount}/{AGENT_CONFIG.length} done
          </span>
        </h3>
        <div className="flex items-center gap-2">
          {doneCount > 0 && (
            <button
              onClick={() => setExpandAll(e => !e)}
              className="text-[9px] font-bold text-bank-textMuted hover:text-purple-400 transition flex items-center gap-1"
            >
              {expandAll ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              {expandAll ? 'Collapse all' : 'Expand all'}
            </button>
          )}
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest">Live</span>
          </div>
        </div>
      </div>

      {/* Data source indicator */}
      {hasData ? (
        <div className="flex items-center gap-2 px-3 py-2 bg-cyan-500/5 border border-cyan-500/20 rounded-xl text-[10px] text-cyan-400 font-semibold">
          <CheckCircle className="w-3.5 h-3.5" />
          Agents are analysing your uploaded data — click any completed agent to view findings
        </div>
      ) : (
        <div className="flex items-center gap-2 px-3 py-2 bg-amber-500/5 border border-amber-500/20 rounded-xl text-[10px] text-amber-400 font-semibold">
          <AlertTriangle className="w-3.5 h-3.5" />
          Upload a bank statement (CSV, Excel, PDF) to get data-driven agent findings
        </div>
      )}

      {/* Agent cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {AGENT_CONFIG.map(agent => {
          const state = agentStates[agent.id];
          return (
            <AgentCard
              key={agent.id}
              agent={agent}
              taskIdx={state?.taskIdx || 0}
              isDone={state?.done || false}
              isActive={!!state}
              findings={findings}
              forceExpand={expandAll}
            />
          );
        })}
      </div>
    </div>
  );
}
