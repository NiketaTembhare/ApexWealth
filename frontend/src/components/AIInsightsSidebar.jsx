import React, { useEffect, useState } from 'react';
import {
  Sparkles, TrendingDown, TrendingUp, AlertTriangle, ShoppingBag,
  Coffee, PiggyBank, Zap, ChevronDown, ChevronUp, ExternalLink,
  Lightbulb, Target, DollarSign, RefreshCw
} from 'lucide-react';

const INSIGHT_ICONS = {
  food: Coffee, spend: ShoppingBag, saving: PiggyBank,
  warning: AlertTriangle, up: TrendingUp, down: TrendingDown,
};

const RISK_COLORS = {
  high: {
    bg: 'bg-red-500/10', border: 'border-red-500/20',
    text: 'text-red-400', badge: 'bg-red-500/10 text-red-400 border-red-500/20',
    bar: 'bg-red-400',
  },
  medium: {
    bg: 'bg-amber-500/10', border: 'border-amber-500/20',
    text: 'text-amber-400', badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    bar: 'bg-amber-400',
  },
  low: {
    bg: 'bg-emerald-500/10', border: 'border-emerald-500/20',
    text: 'text-emerald-400', badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    bar: 'bg-emerald-400',
  },
};

// ── Generate rich, data-driven insights ─────────────────────────
function generateInsights(analytics) {
  if (!analytics) return [];
  const { totalIncome, totalExpenses, savings, savingsRatio, categoryData, healthScore, monthlyTrend } = analytics;

  const insights = [];
  const topCategory = categoryData?.[0];
  const foodData = categoryData?.find(c => c.name === 'Food & Dining');
  const sipData = categoryData?.find(c => c.name === 'SIP / MF');
  const entData = categoryData?.find(c => c.name === 'Entertainment');
  const rentData = categoryData?.find(c => c.name === 'Rent');
  const utilData = categoryData?.find(c => c.name === 'Utilities');
  const travelData = categoryData?.find(c => c.name === 'Travel');
  const investData = categoryData?.find(c => c.name === 'Investment');

  // 1. Top spending category
  if (topCategory) {
    const pct = totalExpenses > 0 ? Math.round((topCategory.value / totalExpenses) * 100) : 0;
    const savingOpportunity = Math.round(topCategory.value * 0.15);
    insights.push({
      icon: 'spend',
      title: `${topCategory.name} is your biggest spend`,
      body: `₹${topCategory.value.toLocaleString('en-IN')} spent — ${pct}% of total expenses.`,
      risk: pct > 40 ? 'high' : pct > 25 ? 'medium' : 'low',
      badge: `${pct}% of spend`,
      details: [
        { label: 'Amount spent', value: `₹${topCategory.value.toLocaleString('en-IN')}` },
        { label: 'Share of expenses', value: `${pct}%` },
        { label: 'Share of income', value: `${totalIncome > 0 ? Math.round((topCategory.value / totalIncome) * 100) : 0}%` },
        { label: 'Savings if cut 15%', value: `+₹${savingOpportunity.toLocaleString('en-IN')}/mo` },
      ],
      actions: [
        `Set a monthly budget cap of ₹${Math.round(topCategory.value * 0.85).toLocaleString('en-IN')} for ${topCategory.name}`,
        `Track ${topCategory.name} transactions weekly to spot spikes early`,
        pct > 35 ? 'This category is unusually high — review recurring subscriptions' : 'You\'re close to the recommended limit',
      ],
    });
  }

  // 2. Savings rate
  if (savingsRatio !== undefined) {
    const monthlyPotential = Math.round(savings);
    const idealSavings = Math.round(totalIncome * 0.2);
    const gap = idealSavings - monthlyPotential;
    insights.push({
      icon: savingsRatio > 20 ? 'up' : 'warning',
      title: savingsRatio > 20 ? 'Strong savings discipline' : 'Savings gap detected',
      body: savingsRatio > 20
        ? `Savings rate ${savingsRatio}% — above the 20% benchmark. ₹${monthlyPotential.toLocaleString('en-IN')} available monthly.`
        : `Savings rate only ${savingsRatio}% — below the 20% target. Gap of ₹${Math.abs(gap).toLocaleString('en-IN')}/month.`,
      risk: savingsRatio > 20 ? 'low' : savingsRatio > 10 ? 'medium' : 'high',
      badge: `${savingsRatio}% saved`,
      details: [
        { label: 'Current savings', value: `₹${monthlyPotential.toLocaleString('en-IN')}/mo` },
        { label: 'Savings rate', value: `${savingsRatio}%` },
        { label: 'Target (20% rule)', value: `₹${idealSavings.toLocaleString('en-IN')}/mo` },
        { label: 'Monthly gap', value: gap > 0 ? `₹${gap.toLocaleString('en-IN')} short` : `₹${Math.abs(gap).toLocaleString('en-IN')} surplus` },
      ],
      actions: [
        savingsRatio > 20
          ? `Invest surplus ₹${Math.round(savings * 0.4).toLocaleString('en-IN')} in SIP or index funds`
          : `Reduce top 2 expense categories by 10% to recover ₹${Math.round(totalExpenses * 0.1).toLocaleString('en-IN')}/month`,
        'Automate savings transfer on salary day to avoid spending it',
        savingsRatio < 10 ? 'Emergency: review all subscriptions and non-essential spend immediately' : 'Set up a separate savings account for goal-based saving',
      ],
    });
  }

  // 3. Food spending
  if (foodData) {
    const foodPct = totalIncome > 0 ? Math.round((foodData.value / totalIncome) * 100) : 0;
    const mealPlanSaving = Math.round(foodData.value * 0.25);
    insights.push({
      icon: 'food',
      title: foodPct > 20 ? 'Food spending is elevated' : 'Food spending looks healthy',
      body: `₹${foodData.value.toLocaleString('en-IN')} on food/dining — ${foodPct}% of income.`,
      risk: foodPct > 20 ? 'medium' : 'low',
      badge: `${foodPct}% of income`,
      details: [
        { label: 'Food & Dining total', value: `₹${foodData.value.toLocaleString('en-IN')}` },
        { label: '% of income', value: `${foodPct}%` },
        { label: 'Recommended max', value: '15% of income' },
        { label: 'Savings via meal planning', value: `₹${mealPlanSaving.toLocaleString('en-IN')}/mo` },
      ],
      actions: [
        'Limit Swiggy/Zomato orders to weekends only — saves ~25%',
        'Batch-cook meals on Sundays to reduce weekday delivery spend',
        foodPct > 20 ? `Set ₹${Math.round(totalIncome * 0.15).toLocaleString('en-IN')} as your food budget cap` : 'Great control! Consider meal prepping to save even more',
      ],
    });
  }

  // 4. Rent check
  if (rentData) {
    const rentPct = totalIncome > 0 ? Math.round((rentData.value / totalIncome) * 100) : 0;
    insights.push({
      icon: rentPct > 30 ? 'warning' : 'up',
      title: rentPct > 30 ? 'Rent exceeds 30% guideline' : 'Rent is within healthy range',
      body: `Rent at ₹${rentData.value.toLocaleString('en-IN')} is ${rentPct}% of income. Guideline: under 30%.`,
      risk: rentPct > 40 ? 'high' : rentPct > 30 ? 'medium' : 'low',
      badge: `${rentPct}% of income`,
      details: [
        { label: 'Monthly rent', value: `₹${rentData.value.toLocaleString('en-IN')}` },
        { label: '% of income', value: `${rentPct}%` },
        { label: 'Ideal max (30% rule)', value: `₹${Math.round(totalIncome * 0.3).toLocaleString('en-IN')}` },
        { label: 'Annual rent cost', value: `₹${(rentData.value * 12).toLocaleString('en-IN')}` },
      ],
      actions: [
        rentPct > 30 ? 'Consider relocating to a more affordable area or co-living' : 'Keep your rent under 30% to maintain strong savings capacity',
        'Negotiate a rent freeze or multi-year lease for stability',
        'Track rent as a fixed cost — build \'housing fund\' for 2 months buffer',
      ],
    });
  }

  // 5. SIP / Investments
  if (sipData || investData) {
    const invTotal = (sipData?.value || 0) + (investData?.value || 0);
    const invPct = totalIncome > 0 ? Math.round((invTotal / totalIncome) * 100) : 0;
    insights.push({
      icon: 'saving',
      title: invPct >= 10 ? 'Good investment discipline' : 'Investment ratio is low',
      body: `Investing ₹${invTotal.toLocaleString('en-IN')}/month (${invPct}% of income). Target: 15%+.`,
      risk: invPct >= 15 ? 'low' : invPct >= 8 ? 'medium' : 'high',
      badge: `${invPct}% invested`,
      details: [
        { label: 'Total invested', value: `₹${invTotal.toLocaleString('en-IN')}/mo` },
        { label: '% of income', value: `${invPct}%` },
        { label: 'Target investment', value: `₹${Math.round(totalIncome * 0.15).toLocaleString('en-IN')}/mo` },
        { label: '10yr corpus (8% CAGR)', value: `₹${Math.round(invTotal * 12 * 14.49).toLocaleString('en-IN')}` },
      ],
      actions: [
        invPct < 10 ? `Increase SIP by ₹${Math.round(totalIncome * 0.05).toLocaleString('en-IN')} monthly to reach 15% target` : 'Great! Diversify across large-cap, mid-cap, and debt funds',
        'Use Nifty 50 Index Fund for stable long-term returns',
        'Set SIP auto-debit on salary credit date to enforce discipline',
      ],
    });
  }

  // 6. Entertainment check
  if (entData) {
    const entPct = totalIncome > 0 ? Math.round((entData.value / totalIncome) * 100) : 0;
    if (entPct > 4) {
      insights.push({
        icon: 'warning',
        title: 'Entertainment spend above threshold',
        body: `₹${entData.value.toLocaleString('en-IN')} on entertainment — ${entPct}% of income (rec: 5%).`,
        risk: entPct > 10 ? 'high' : 'medium',
        badge: `${entPct}% of income`,
        details: [
          { label: 'Entertainment total', value: `₹${entData.value.toLocaleString('en-IN')}` },
          { label: '% of income', value: `${entPct}%` },
          { label: 'Recommended max', value: '5% of income' },
          { label: 'Overspend vs limit', value: `₹${Math.max(0, Math.round(entData.value - totalIncome * 0.05)).toLocaleString('en-IN')} excess` },
        ],
        actions: [
          'Audit streaming subscriptions — cancel ones unused > 2 weeks',
          'Switch to annual plans for Netflix/Hotstar — saves ~20%',
          `Budget ₹${Math.round(totalIncome * 0.05).toLocaleString('en-IN')}/month for entertainment and track it weekly`,
        ],
      });
    }
  }

  // 7. Financial Health Score
  if (healthScore !== undefined) {
    const scoreLabel = healthScore >= 70 ? 'Excellent' : healthScore >= 40 ? 'Fair' : 'Needs Attention';
    insights.push({
      icon: healthScore >= 70 ? 'up' : 'down',
      title: `Financial health: ${scoreLabel}`,
      body: `Score ${healthScore}/100 — based on savings rate, expense control, and investment habits.`,
      risk: healthScore >= 70 ? 'low' : healthScore >= 40 ? 'medium' : 'high',
      badge: `${healthScore}/100`,
      details: [
        { label: 'Overall score', value: `${healthScore}/100` },
        { label: 'Savings contribution', value: `${savingsRatio}% (target: 20%)` },
        { label: 'Expense ratio', value: `${totalIncome > 0 ? Math.round((totalExpenses / totalIncome) * 100) : 0}% of income` },
        { label: 'Rating', value: scoreLabel },
      ],
      actions: [
        healthScore < 50 ? 'Priority: build emergency fund of 3 months expenses first' : 'Maintain savings rate and gradually increase investment %',
        healthScore < 70 ? 'Reduce top 2 expense categories by 10% each' : 'Consider stepping up SIP by ₹500 every 6 months',
        'Review financial health monthly and adjust budgets accordingly',
      ],
    });
  }

  // 8. Emergency fund
  const emergencyTarget = Math.round(totalExpenses * 3);
  const emergencyMonths = savings > 0 ? Math.round(emergencyTarget / savings) : '?';
  insights.push({
    icon: 'warning',
    title: 'Emergency fund check',
    body: `Target: ₹${emergencyTarget.toLocaleString('en-IN')} (3 months expenses). Build alongside goals.`,
    risk: 'medium',
    badge: `₹${emergencyTarget.toLocaleString('en-IN')} target`,
    details: [
      { label: 'Monthly expenses', value: `₹${totalExpenses.toLocaleString('en-IN')}` },
      { label: '3-month target', value: `₹${emergencyTarget.toLocaleString('en-IN')}` },
      { label: '6-month target', value: `₹${(totalExpenses * 6).toLocaleString('en-IN')}` },
      { label: 'Months to build (at current savings)', value: `${emergencyMonths} months` },
    ],
    actions: [
      'Open a dedicated liquid fund account for emergency savings',
      `Allocate ₹${Math.round(savings * 0.3).toLocaleString('en-IN')}/month toward emergency fund until ₹${emergencyTarget.toLocaleString('en-IN')} is reached`,
      'Never invest emergency fund in equity — keep in liquid/FD accounts',
    ],
  });

  return insights;
}

// ── Expandable Insight Card ──────────────────────────────────────
function InsightCard({ insight, isVisible, index }) {
  const [expanded, setExpanded] = useState(false);
  const Icon = INSIGHT_ICONS[insight.icon] || Sparkles;
  const colors = RISK_COLORS[insight.risk];

  return (
    <div
      className={`rounded-2xl border transition-all duration-500 overflow-hidden ${colors.bg} ${colors.border} ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
      style={{ transitionDelay: `${index * 80}ms` }}
    >
      {/* ── Card header (always visible) ── */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full p-4 text-left flex items-start gap-3 hover:bg-white/5 transition-colors"
      >
        <div className={`p-1.5 rounded-lg flex-shrink-0 ${colors.bg} border ${colors.border}`}>
          <Icon className={`w-3.5 h-3.5 ${colors.text}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <span className="text-xs font-bold text-bank-textActive leading-tight">{insight.title}</span>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border whitespace-nowrap ${colors.badge}`}>
                {insight.badge}
              </span>
              {expanded
                ? <ChevronUp className={`w-3.5 h-3.5 ${colors.text} flex-shrink-0`} />
                : <ChevronDown className="w-3.5 h-3.5 text-bank-textMuted flex-shrink-0" />
              }
            </div>
          </div>
          <p className="text-[11px] text-bank-textMuted leading-relaxed mt-1">{insight.body}</p>
        </div>
      </button>

      {/* ── Expanded detail panel ── */}
      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-white/5 pt-3">

          {/* Data breakdown */}
          {insight.details?.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              {insight.details.map((d, i) => (
                <div key={i} className="bg-bank-bg/60 rounded-xl px-3 py-2 border border-bank-cardBorder/50">
                  <p className="text-[9px] text-bank-textMuted font-bold uppercase tracking-wider">{d.label}</p>
                  <p className={`text-xs font-black mt-0.5 ${colors.text}`}>{d.value}</p>
                </div>
              ))}
            </div>
          )}

          {/* Action items */}
          {insight.actions?.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[9px] font-bold text-bank-textMuted uppercase tracking-wider flex items-center gap-1">
                <Lightbulb className="w-2.5 h-2.5" /> Recommended Actions
              </p>
              {insight.actions.map((action, i) => (
                <div key={i} className="flex items-start gap-2 text-[11px] text-bank-textMuted leading-relaxed">
                  <span className={`mt-1 w-1.5 h-1.5 rounded-full flex-shrink-0 ${colors.bar}`} />
                  <span>{action}</span>
                </div>
              ))}
            </div>
          )}

          {/* AI badge */}
          <div className="flex items-center gap-1 pt-1">
            <Sparkles className="w-2.5 h-2.5 text-cyan-400" />
            <span className="text-[9px] text-cyan-400 font-bold uppercase tracking-wider">AI Generated · Based on your data</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────
export default function AIInsightsSidebar({ analytics }) {
  const [visibleCount, setVisibleCount] = useState(0);
  const [expandAll, setExpandAll] = useState(false);
  const insights = generateInsights(analytics);

  useEffect(() => {
    setVisibleCount(0);
    insights.forEach((_, i) => {
      setTimeout(() => setVisibleCount(c => Math.max(c, i + 1)), i * 160);
    });
  }, [analytics]);

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-bank-textActive flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-cyan-400 animate-pulse" /> AI Insights
          {insights.length > 0 && (
            <span className="text-[10px] font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2 py-0.5 rounded-full">
              {insights.length}
            </span>
          )}
        </h3>
        <div className="flex items-center gap-2">
          {insights.length > 0 && (
            <button
              onClick={() => setExpandAll(e => !e)}
              className="text-[9px] font-bold text-bank-textMuted hover:text-cyan-400 transition flex items-center gap-1"
            >
              {expandAll ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              {expandAll ? 'Collapse' : 'Expand all'}
            </button>
          )}
          <span className="text-[9px] font-bold text-cyan-400 uppercase tracking-widest bg-cyan-500/5 px-2 py-0.5 rounded-full border border-cyan-500/20 flex items-center gap-1">
            <Zap className="w-2.5 h-2.5" /> Live
          </span>
        </div>
      </div>

      {/* Click hint */}
      {insights.length > 0 && (
        <p className="text-[10px] text-bank-textMuted flex items-center gap-1">
          <ExternalLink className="w-2.5 h-2.5" /> Click any card to expand details & actions
        </p>
      )}

      {/* Insight cards */}
      <div className="space-y-2">
        {insights.map((insight, i) => (
          <InsightCard
            key={`${i}-${analytics?.healthScore}`}
            insight={expandAll ? { ...insight, _forceExpand: true } : insight}
            isVisible={i < visibleCount}
            index={i}
            forceExpand={expandAll}
          />
        ))}
      </div>

      {insights.length === 0 && (
        <div className="text-center py-8 text-bank-textMuted text-xs space-y-2">
          <Target className="w-8 h-8 mx-auto opacity-30" />
          <p>Upload transactions to generate AI insights</p>
        </div>
      )}
    </div>
  );
}
