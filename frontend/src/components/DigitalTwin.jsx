import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from 'recharts';
import {
  Sliders, TrendingUp, AlertTriangle, ShieldAlert, CheckCircle2,
  DollarSign, Landmark, HelpCircle, Activity, Info, Database, Zap
} from 'lucide-react';

import { API_BASE_URL } from '../services/api';

export default function DigitalTwin({ analytics }) {
  const [loading, setLoading] = useState(false);
  const [params, setParams] = useState({
    discretionary_reduction_pct: 20,
    sip_addition: 5000,
    market_return_type: 'balanced',
    inflation_rate_annual: 6.0,
    shock_event: 'none'
  });
  
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  // Determine if real analytics data is available or if we're using demo fallbacks
  const hasRealData = analytics && (
    analytics.totalIncome > 0 || analytics.totalExpenses > 0
  );

  // Values from uploaded analytics, or hardcoded demo defaults
  const income = analytics?.totalIncome || 65000;
  const necessities = (analytics?.totalExpenses || 25000) * 0.60;
  const discretionary = (analytics?.totalExpenses || 25000) * 0.40;
  const savingsGoal = 500000;
  const currentSavings = analytics?.savings || 100000;
  const timelineMonths = 36;

  const runSimulation = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('apex_token');
      const response = await axios.post(
        `${API_BASE_URL}/simulation/run`,
        {
          monthly_income: income,
          necessities_expense: necessities,
          discretionary_expense: discretionary,
          current_savings: currentSavings > 0 ? currentSavings : 50000.0,
          target_goal: savingsGoal,
          timeline_months: timelineMonths,
          ...params,
          inflation_rate_annual: params.inflation_rate_annual / 100.0 // convert to float
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      setResults(response.data);
      setLoading(false);
    } catch (err) {
      console.error("Simulation endpoint failed, falling back to local JS simulation engine:", err);
      // Fallback local JS implementation
      localJsSimulationRun();
    }
  };

  const localJsSimulationRun = () => {
    // Zero-dependency client-side simulation fallback
    const labels = [];
    const pessimistic = [];
    const median = [];
    const optimistic = [];
    
    let baseReturn = 0.10;
    let baseVol = 0.10;
    if (params.market_return_type === 'conservative') {
      baseReturn = 0.06; baseVol = 0.05;
    } else if (params.market_return_type === 'aggressive') {
      baseReturn = 0.14; baseVol = 0.18;
    }
    
    let startingBal = currentSavings > 0 ? currentSavings : 50000.0;
    let infRate = params.inflation_rate_annual / 100.0;
    let inc = income;
    
    if (params.shock_event === 'market_crash') {
      startingBal = startingBal * 0.70;
      baseReturn -= 0.04;
      baseVol += 0.08;
    } else if (params.shock_event === 'income_shock') {
      inc = inc * 0.70;
    } else if (params.shock_event === 'inflation_spike') {
      infRate = Math.max(infRate, 0.12);
    }
    
    const monthlyReturn = baseReturn / 12;
    const monthlyVol = baseVol / Math.sqrt(12);
    const monthlyInf = infRate / 12;
    const reducedDiscretionary = discretionary * (1.0 - (params.discretionary_reduction_pct / 100.0));
    const baseExpenses = necessities + reducedDiscretionary;
    
    const numPaths = 100;
    const paths = [];
    
    for (let p = 0; p < numPaths; p++) {
      const path = [startingBal];
      let bal = startingBal;
      for (let m = 1; m <= timelineMonths; m++) {
        const expenses = baseExpenses * Math.pow(1.0 + monthlyInf, m);
        let surplus = inc - expenses;
        if (surplus < 0) surplus = Math.max(surplus, -bal);
        bal += surplus + params.sip_addition;
        
        // Simple random walk
        const u1 = Math.random();
        const u2 = Math.random();
        const randNorm = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
        const growth = monthlyReturn + (monthlyVol * (isNaN(randNorm) ? 0 : randNorm));
        bal = bal * (1.0 + growth);
        if (bal < 0) bal = 0;
        path.push(bal);
      }
      paths.push(path);
    }
    
    for (let m = 0; m <= timelineMonths; m++) {
      labels.append ? labels.append(`Month ${m}`) : labels.push(`Month ${m}`);
      const vals = paths.map(p => p[m]).sort((a, b) => a - b);
      pessimistic.push(Math.round(vals[Math.floor(numPaths * 0.10)]));
      median.push(Math.round(vals[Math.floor(numPaths * 0.50)]));
      optimistic.push(Math.round(vals[Math.floor(numPaths * 0.90)]));
    }
    
    let goalMonth = -1;
    for (let m = 0; m <= timelineMonths; m++) {
      if (median[m] >= savingsGoal) {
        goalMonth = m;
        break;
      }
    }
    
    setResults({
      labels,
      pessimistic,
      median,
      optimistic,
      metrics: {
        goal_achieved_month: goalMonth,
        ending_balance: median[median.length - 1],
        total_invested: (inc - baseExpenses + params.sip_addition) * timelineMonths,
        estimated_returns: Math.max(0, median[median.length - 1] - startingBal - (inc - baseExpenses + params.sip_addition) * timelineMonths),
        resilience_status: median[median.length - 1] >= savingsGoal ? "High" : "Medium"
      },
      advisory_summary: goalMonth !== -1 
        ? `Target goal achieved in Month ${goalMonth}! Your strategy displays strong systemic buffer resilience.` 
        : `Target falls short of ₹${savingsGoal.toLocaleString()} goal. Modify parameters to optimize growth.`
    });
    setLoading(false);
  };

  useEffect(() => {
    runSimulation();
  }, [params]);

  // Format Recharts data structure
  const chartData = results ? results.labels.map((lbl, idx) => ({
    name: lbl,
    Pessimistic: results.pessimistic[idx],
    Median: results.median[idx],
    Optimistic: results.optimistic[idx],
    Goal: savingsGoal
  })) : [];

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Overview */}
      <div className="glass-panel-glow p-5 flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-bank-textActive flex items-center gap-2">
            <Activity className="w-5 h-5 text-cyan-400 animate-pulse" /> Financial Digital Twin Simulator
          </h3>
          <p className="text-xs text-bank-textMuted mt-1">
            Simulate future net worth and cash balances. Test stress models against macroeconomic crashes, income loss, or hyper-inflation.
          </p>
        </div>
        {/* Data source badge */}
        {hasRealData ? (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/25 rounded-full self-start flex-shrink-0">
            <Database className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">User Data</span>
          </div>
        ) : (
          <div className="flex flex-col items-end gap-1 self-start flex-shrink-0">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 border border-amber-500/25 rounded-full">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest">Demo Data</span>
            </div>
            <p className="text-[9px] text-bank-textMuted/60 text-right">Upload a statement to use your real data</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        
        {/* Sliders Panel */}
        <div className="xl:col-span-1 glass-panel p-5 space-y-6 flex flex-col justify-start">
          <h4 className="text-xs font-bold text-bank-textActive uppercase tracking-wider flex items-center gap-1.5 border-b border-white/5 pb-3">
            <Sliders className="w-4 h-4 text-cyan-400" /> Simulation Controls
          </h4>
          
          {/* Slider 1: Spend reduction */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-bank-textMuted">Cut Discretionary Spend</span>
              <span className="text-cyan-400">{params.discretionary_reduction_pct}%</span>
            </div>
            <input type="range" min="0" max="100" step="5"
              value={params.discretionary_reduction_pct}
              onChange={e => setParams(prev => ({ ...prev, discretionary_reduction_pct: parseInt(e.target.value) }))}
              className="w-full accent-cyan-400" />
            <p className="text-[9px] text-bank-textMuted/60">Reduces shopping, entertainment budget to maximize monthly surplus</p>
          </div>
          
          {/* Slider 2: Add SIP */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-bank-textMuted">Monthly SIP Addition</span>
              <span className="text-cyan-400">₹{params.sip_addition.toLocaleString('en-IN')}</span>
            </div>
            <input type="range" min="0" max="50000" step="1000"
              value={params.sip_addition}
              onChange={e => setParams(prev => ({ ...prev, sip_addition: parseInt(e.target.value) }))}
              className="w-full accent-cyan-400" />
          </div>
          
          {/* Slider 3: Inflation */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-bank-textMuted">Annual Inflation Rate</span>
              <span className="text-cyan-400">{params.inflation_rate_annual}%</span>
            </div>
            <input type="range" min="3.0" max="15.0" step="0.5"
              value={params.inflation_rate_annual}
              onChange={e => setParams(prev => ({ ...prev, inflation_rate_annual: parseFloat(e.target.value) }))}
              className="w-full accent-cyan-400" />
          </div>
          
          {/* Dropdown 1: Portfolio Growth Type */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-bank-textMuted">Asset Allocation Strategy</label>
            <select value={params.market_return_type}
              onChange={e => setParams(prev => ({ ...prev, market_return_type: e.target.value }))}
              className="w-full bg-bank-bg border border-bank-cardBorder rounded-lg px-3 py-2 text-xs text-bank-textActive outline-none focus:border-cyan-500/40">
              <option value="conservative">Conservative Yield (6% CAGR)</option>
              <option value="balanced">Balanced Alloc (10% CAGR)</option>
              <option value="aggressive">Aggressive Equity (14% CAGR)</option>
            </select>
          </div>
          
          {/* Crisis Shock Events Selector */}
          <div className="space-y-2 pt-2 border-t border-white/5">
            <label className="block text-xs font-bold text-rose-400 uppercase tracking-widest flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-rose-400" /> Stress Trigger Shock
            </label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {[
                { id: 'none', label: 'No Shock', color: 'hover:border-cyan-500/30' },
                { id: 'market_crash', label: '30% Crash', color: 'hover:border-rose-500/30 text-rose-400' },
                { id: 'income_shock', label: 'Income Cut', color: 'hover:border-amber-500/30 text-amber-400' },
                { id: 'inflation_spike', label: 'Hyper-Inf', color: 'hover:border-red-500/30 text-red-400' }
              ].map(shock => (
                <button key={shock.id}
                  onClick={() => setParams(prev => ({ ...prev, shock_event: shock.id }))}
                  className={`px-2 py-2 text-[10px] font-bold rounded-lg border text-center transition ${
                    params.shock_event === shock.id 
                      ? 'bg-rose-500/10 border-rose-500/40 text-rose-400' 
                      : `bg-bank-bg/40 border-bank-cardBorder text-bank-textMuted ${shock.color}`
                  }`}>
                  {shock.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Charts & Metric Reports */}
        <div className="xl:col-span-3 space-y-4">
          
          {/* Main projection chart */}
          <div className="glass-panel p-5 space-y-4">
            <div className="flex justify-between items-center flex-wrap gap-2">
              <h4 className="text-xs font-bold text-bank-textActive uppercase tracking-wider flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-cyan-400" /> Projected Net Worth Trajectory (Confidence Bands)
              </h4>
              
              {params.shock_event !== 'none' && (
                <span className="text-[10px] font-black uppercase bg-rose-500/10 border border-rose-500/20 text-rose-400 px-3 py-1 rounded-full animate-ai-pulse">
                  Stress Mode: {params.shock_event.replace('_',' ').toUpperCase()} Active
                </span>
              )}
            </div>
            
            <div className="h-[300px] w-full text-[10px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorOpt" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorMed" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorPess" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.08}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#26354D" opacity={0.3} />
                  <XAxis dataKey="name" stroke="#94A3B8" />
                  <YAxis stroke="#94A3B8" tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#161F30', borderColor: '#26354D', borderRadius: '12px' }}
                    labelStyle={{ color: '#F8FAFC', fontWeight: 'bold' }}
                    formatter={v => [`₹${v.toLocaleString('en-IN')}`, null]}
                  />
                  <Legend />
                  <Area name="Optimistic (90th)" type="monotone" dataKey="Optimistic" stroke="#06b6d4" fillOpacity={1} fill="url(#colorOpt)" />
                  <Area name="Median (50th)" type="monotone" dataKey="Median" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorMed)" />
                  <Area name="Pessimistic (10th)" type="monotone" dataKey="Pessimistic" stroke="#ef4444" fillOpacity={1} fill="url(#colorPess)" />
                  <Area name="Savings Goal Target" type="monotone" dataKey="Goal" stroke="#10b981" strokeDasharray="5 5" fill="none" LegendType="none" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Results Summary */}
          {results && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              
              <div className="glass-panel p-4 text-center">
                <p className="text-[10px] text-bank-textMuted font-bold uppercase tracking-wider">Goal Timeline</p>
                <p className="text-xl font-black text-cyan-400 mt-1">
                  {results.metrics.goal_achieved_month !== -1 ? `${results.metrics.goal_achieved_month} Months` : "Failed Target"}
                </p>
                <p className="text-[9px] text-bank-textMuted/60 mt-1">Months required to cross target threshold</p>
              </div>
              
              <div className="glass-panel p-4 text-center">
                <p className="text-[10px] text-bank-textMuted font-bold uppercase tracking-wider">Median End Balance</p>
                <p className="text-xl font-black text-purple-400 mt-1">
                  ₹{results.metrics.ending_balance.toLocaleString('en-IN')}
                </p>
                <p className="text-[9px] text-bank-textMuted/60 mt-1">Estimated balance at month {timelineMonths}</p>
              </div>
              
              <div className="glass-panel p-4 text-center">
                <p className="text-[10px] text-bank-textMuted font-bold uppercase tracking-wider">Estimated Returns</p>
                <p className="text-xl font-black text-emerald-400 mt-1">
                  ₹{results.metrics.estimated_returns.toLocaleString('en-IN')}
                </p>
                <p className="text-[9px] text-bank-textMuted/60 mt-1">Compounded portfolio yields earned</p>
              </div>

              <div className="glass-panel p-4 flex flex-col justify-center items-center">
                <p className="text-[10px] text-bank-textMuted font-bold uppercase tracking-wider">Stress Resilience</p>
                <div className="flex items-center gap-1.5 mt-2">
                  {results.metrics.resilience_status === 'High' ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span className="text-xs font-bold text-emerald-400">High Buffer</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                      <span className="text-xs font-bold text-amber-400">Moderate Risk</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
          
          {/* Advisory description text */}
          {results?.advisory_summary && (
            <div className="p-4 bg-cyan-500/5 border border-cyan-500/10 rounded-2xl flex items-start gap-3">
              <Info className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-bank-textActive">Digital Twin Sandbox Advice</p>
                <p className="text-xs text-bank-textMuted mt-1 leading-relaxed">{results.advisory_summary}</p>
              </div>
            </div>
          )}

          {/* ── DATA SOURCES EXPLAINABILITY PANEL ── */}
          <div className={`p-4 rounded-2xl border ${hasRealData ? 'bg-emerald-500/5 border-emerald-500/15' : 'bg-amber-500/5 border-amber-500/15'}`}>
            <p className="text-[10px] font-bold uppercase tracking-wider mb-3 flex items-center gap-1.5 ${hasRealData ? 'text-emerald-400' : 'text-amber-400'}">
              <Info className="w-3.5 h-3.5" />
              {hasRealData ? 'Simulation Data Sources — From Your Statement' : 'Simulation Data Sources — Demo Defaults Used'}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                { label: 'Monthly Income', value: `₹${income.toLocaleString('en-IN')}`, source: hasRealData ? 'Detected from salary credits' : 'Demo default', real: hasRealData && analytics?.totalIncome > 0 },
                { label: 'Necessities (60%)', value: `₹${Math.round(necessities).toLocaleString('en-IN')}`, source: hasRealData ? '60% of detected expenses' : 'Demo default', real: hasRealData && analytics?.totalExpenses > 0 },
                { label: 'Discretionary (40%)', value: `₹${Math.round(discretionary).toLocaleString('en-IN')}`, source: hasRealData ? '40% of detected expenses' : 'Demo default', real: hasRealData && analytics?.totalExpenses > 0 },
                { label: 'Current Savings', value: `₹${currentSavings.toLocaleString('en-IN')}`, source: hasRealData ? 'Net income − expenses' : 'Demo default (₹1,00,000)', real: hasRealData && analytics?.savings > 0 },
                { label: 'Savings Goal', value: `₹${savingsGoal.toLocaleString('en-IN')}`, source: 'Fixed simulation target', real: false },
                { label: 'Timeline', value: `${timelineMonths} months`, source: 'Fixed simulation window', real: false },
              ].map((item) => (
                <div key={item.label} className="flex flex-col gap-0.5 px-3 py-2 bg-bank-bg/40 rounded-xl border border-bank-cardBorder/40">
                  <span className="text-[9px] font-bold text-bank-textMuted uppercase tracking-wider">{item.label}</span>
                  <span className="text-xs font-bold text-bank-textActive">{item.value}</span>
                  <span className={`text-[9px] ${item.real ? 'text-emerald-400' : 'text-amber-400/70'}`}>
                    {item.real ? '✓ ' : '○ '}{item.source}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

