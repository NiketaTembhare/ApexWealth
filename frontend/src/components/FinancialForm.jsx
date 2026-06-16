import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  Calendar, 
  Home, 
  Utensils, 
  ShoppingBag, 
  Car, 
  PartyPopper, 
  Goal, 
  TrendingUp, 
  ArrowRight,
  Calculator,
  Zap,
  RotateCcw,
  FileCheck,
  CheckCircle
} from 'lucide-react';

// Demo profile values (realistic Indian mid-tier profile)
const DEMO_PROFILE = {
  monthly_income: 65000,
  rent_expense: 18000,
  food_expense: 6000,
  shopping_expense: 4500,
  travel_expense: 3000,
  entertainment_expense: 4000,
  savings_goal: 150000,
  financial_goal_timeline: 12
};

const EMPTY_FORM = {
  monthly_income: '',
  rent_expense: '',
  food_expense: '',
  shopping_expense: '',
  travel_expense: '',
  entertainment_expense: '',
  savings_goal: '',
  financial_goal_timeline: ''
};

export default function FinancialForm({ onSubmit, initialValues, suggestedProfile }) {
  const [formData, setFormData] = useState(initialValues || EMPTY_FORM);
  const [isDemoLoaded, setIsDemoLoaded] = useState(false);
  const [isStatementLoaded, setIsStatementLoaded] = useState(false);
  const [fieldSources, setFieldSources] = useState({}); // per-field source annotations
  const [validationError, setValidationError] = useState('');

  // Live Metrics — only computed when there is real input
  const [metrics, setMetrics] = useState({
    totalExpenses: 0,
    savingsCapacity: 0,
    expenseRatio: 0,
    savingsTargetMonthly: 0
  });

  useEffect(() => {
    const totalExp = (
      Number(formData.rent_expense || 0) +
      Number(formData.food_expense || 0) +
      Number(formData.shopping_expense || 0) +
      Number(formData.travel_expense || 0) +
      Number(formData.entertainment_expense || 0)
    );
    const income = Number(formData.monthly_income || 0);
    const capacity = income - totalExp;
    const ratio = income > 0 ? ((totalExp / income) * 100) : 0;
    const targetMonthly = (formData.savings_goal && formData.financial_goal_timeline) 
      ? (Number(formData.savings_goal) / Number(formData.financial_goal_timeline))
      : 0;

    setMetrics({
      totalExpenses: totalExp,
      savingsCapacity: capacity,
      expenseRatio: ratio,
      savingsTargetMonthly: targetMonthly
    });
  }, [formData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    const numericValue = value === '' ? '' : Math.max(0, parseFloat(value) || 0);
    setFormData(prev => ({
      ...prev,
      [name]: numericValue
    }));
    // Clear source annotation when user manually edits
    if (fieldSources[name]) {
      setFieldSources(prev => { const n = {...prev}; delete n[name]; return n; });
    }
    // Clear demo badge if user manually edits
    if (isDemoLoaded) setIsDemoLoaded(false);
    if (isStatementLoaded) setIsStatementLoaded(false);
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    setValidationError('');

    if (!formData.monthly_income || Number(formData.monthly_income) <= 0) {
      setValidationError('Monthly Income must be greater than 0.');
      return;
    }
    if (!formData.savings_goal || Number(formData.savings_goal) <= 0) {
      setValidationError('Savings Goal must be greater than 0.');
      return;
    }
    if (!formData.financial_goal_timeline || Number(formData.financial_goal_timeline) <= 0) {
      setValidationError('Timeline must be greater than 0 months.');
      return;
    }

    onSubmit(formData);
  };

  // Load demo financial profile
  const handleLoadDemo = () => {
    setFormData(DEMO_PROFILE);
    setIsDemoLoaded(true);
    setIsStatementLoaded(false);
    setFieldSources({});
    setValidationError('');
  };

  // Auto-fill from uploaded statement data
  const handleAutoFill = () => {
    if (!suggestedProfile) return;
    const { profile, sources } = suggestedProfile;
    setFormData(prev => ({
      ...prev,
      ...Object.fromEntries(
        Object.entries(profile).filter(([, v]) => v !== '' && v > 0)
      )
    }));
    setFieldSources(sources || {});
    setIsStatementLoaded(true);
    setIsDemoLoaded(false);
    setValidationError('');
  };

  // Clear all fields back to empty
  const handleClearAll = () => {
    setFormData(EMPTY_FORM);
    setIsDemoLoaded(false);
    setIsStatementLoaded(false);
    setFieldSources({});
    setValidationError('');
  };

  const hasAnyInput = Object.values(formData).some(v => v !== '' && v !== 0);  return (
    <form onSubmit={handleFormSubmit} className="space-y-6 animate-fade-in">
      
      {/* Alerts / Notices */}
      <div className="space-y-4">
        {isStatementLoaded && suggestedProfile && (
          <div className="flex items-start gap-2.5 px-4 py-3 bg-emerald-500/8 border border-emerald-500/25 rounded-xl">
            <span className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-500/15 border border-emerald-500/30 rounded-full text-[10px] font-bold text-emerald-400 uppercase tracking-widest flex-shrink-0 mt-0.5">
              <FileCheck className="w-3 h-3" /> User Data
            </span>
            <div>
              <p className="text-xs text-emerald-400 font-bold">
                Auto-filled from {suggestedProfile.totalTransactions} transactions across {suggestedProfile.monthCount} month{suggestedProfile.monthCount > 1 ? 's' : ''}.
              </p>
              <p className="text-[10px] text-emerald-400/70 mt-0.5">
                Categories detected: {suggestedProfile.detectedCategories.slice(0, 5).join(' · ')}. Set your Savings Goal and Timeline to generate advice.
              </p>
            </div>
          </div>
        )}

        {isDemoLoaded && (
          <div className="flex items-center gap-2.5 px-4 py-3 bg-amber-500/8 border border-amber-500/25 rounded-xl">
            <span className="flex items-center gap-2 px-2 py-0.5 bg-amber-500/15 border border-amber-500/30 rounded-full text-[10px] font-bold text-amber-400 uppercase tracking-widest">
              <Zap className="w-3 h-3" /> Demo Data
            </span>
            <p className="text-xs text-amber-400/80 font-medium">
              Sample profile loaded — edit any field to switch to your own data.
            </p>
          </div>
        )}

        {validationError && (
          <div className="p-4 bg-bank-danger/10 border border-bank-danger/30 text-bank-danger text-sm rounded-xl font-semibold flex items-center gap-2 animate-pulse">
            <span>⚠️</span> {validationError}
          </div>
        )}
      </div>

      {/* Top Row: Core + Expenditures Grid (3 columns) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Card 1: Core Financials */}
        <div className="glass-panel p-6 space-y-4">
          <h3 className="text-sm font-semibold tracking-wider text-emerald-400 uppercase flex items-center gap-2 border-b border-white/5 pb-2">
            <TrendingUp className="w-4 h-4" /> Core Financials
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-bank-textMuted uppercase tracking-wider mb-2">
                Monthly Net Income
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-bank-textMuted font-bold text-sm pointer-events-none z-10">₹</span>
                <input
                  type="number"
                  name="monthly_income"
                  required
                  value={formData.monthly_income}
                  onChange={handleChange}
                  placeholder="Enter monthly income"
                  className="pl-8 pr-4"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-bank-textMuted uppercase tracking-wider mb-2">
                Target Savings Goal
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-bank-textMuted font-bold text-sm pointer-events-none z-10">₹</span>
                <input
                  type="number"
                  name="savings_goal"
                  required
                  value={formData.savings_goal}
                  onChange={handleChange}
                  placeholder="Enter savings goal amount"
                  className="pl-8 pr-4"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-bank-textMuted uppercase tracking-wider mb-2 flex items-center gap-1">
                Goal Timeline <span className="text-[9px] text-bank-textMuted font-normal lowercase">(months)</span>
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-bank-textMuted pointer-events-none z-10" />
                <input
                  type="number"
                  name="financial_goal_timeline"
                  required
                  value={formData.financial_goal_timeline}
                  onChange={handleChange}
                  placeholder="e.g. 12"
                  className="pl-9 pr-4"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Essential Bills */}
        <div className="glass-panel p-6 space-y-4">
          <h3 className="text-sm font-semibold tracking-wider text-blue-400 uppercase flex items-center gap-2 border-b border-white/5 pb-2">
            <Calculator className="w-4 h-4" /> Essential Bills
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-bank-textMuted uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Home className="w-3.5 h-3.5" /> Housing / Rent
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-bank-textMuted font-bold text-sm pointer-events-none z-10">₹</span>
                <input
                  type="number"
                  name="rent_expense"
                  value={formData.rent_expense}
                  onChange={handleChange}
                  placeholder="Enter rent amount"
                  className="pl-8 pr-4"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-bank-textMuted uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Utensils className="w-3.5 h-3.5" /> Food & Dining
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-bank-textMuted font-bold text-sm pointer-events-none z-10">₹</span>
                <input
                  type="number"
                  name="food_expense"
                  value={formData.food_expense}
                  onChange={handleChange}
                  placeholder="Enter monthly food expenses"
                  className="pl-8 pr-4"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-bank-textMuted uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Car className="w-3.5 h-3.5" /> Travel & Commute
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-bank-textMuted font-bold text-sm pointer-events-none z-10">₹</span>
                <input
                  type="number"
                  name="travel_expense"
                  value={formData.travel_expense}
                  onChange={handleChange}
                  placeholder="Enter travel expenses"
                  className="pl-8 pr-4"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Card 3: Discretionary Expenditures */}
        <div className="glass-panel p-6 space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold tracking-wider text-purple-400 uppercase flex items-center gap-2 border-b border-white/5 pb-2">
              <PartyPopper className="w-4 h-4" /> Discretionary Spends
            </h3>

            <div className="space-y-4 mt-4">
              <div>
                <label className="block text-[10px] font-bold text-bank-textMuted uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <ShoppingBag className="w-3.5 h-3.5" /> Shopping & Retail
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-bank-textMuted font-bold text-sm pointer-events-none z-10">₹</span>
                  <input
                    type="number"
                    name="shopping_expense"
                    value={formData.shopping_expense}
                    onChange={handleChange}
                    placeholder="Enter shopping expenses"
                    className="pl-8 pr-4"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-bank-textMuted uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <PartyPopper className="w-3.5 h-3.5" /> Entertainment & Leisure
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-bank-textMuted font-bold text-sm pointer-events-none z-10">₹</span>
                  <input
                    type="number"
                    name="entertainment_expense"
                    value={formData.entertainment_expense}
                    onChange={handleChange}
                    placeholder="Enter entertainment expenses"
                    className="pl-8 pr-4"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="p-3 bg-purple-500/5 border border-purple-500/10 rounded-xl text-[10px] text-purple-400/90 leading-relaxed font-medium mt-4">
            Discretionary outflows include shopping and leisure. Compiling an advisory report highlights opportunities to trim these parameters to reach your savings targets.
          </div>
        </div>
      </div>

      {/* Bottom Row: Calculations & Submission Panel (3 columns) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Real-Time Ratios Card */}
        <div className="glass-panel p-6 flex flex-col justify-between h-full relative overflow-hidden group min-h-[190px]">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-bl-full pointer-events-none" />
          
          <h3 className="text-sm font-bold text-bank-textMuted uppercase tracking-wider mb-4 flex items-center gap-2 border-b border-white/5 pb-2">
            <Calculator className="w-4 h-4 text-emerald-400" /> Real-Time Ratios
          </h3>

          {!hasAnyInput ? (
            <div className="py-4 text-center">
              <p className="text-xs text-bank-textMuted/60 leading-relaxed">
                Enter your financial details or load a demo profile to see live calculations.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1.5 text-bank-textMuted">
                  <span>Total Expenses</span>
                  <span className="text-bank-textActive font-bold">₹{metrics.totalExpenses.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="w-full bg-bank-bg rounded-full h-2 overflow-hidden border border-bank-cardBorder">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${metrics.expenseRatio > 90 ? 'bg-bank-danger' : metrics.expenseRatio > 60 ? 'bg-yellow-500' : 'bg-emerald-500'}`}
                    style={{ width: `${Math.min(100, metrics.expenseRatio)}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] mt-1 text-bank-textMuted font-medium">
                  <span>Expense Ratio</span>
                  <span className={metrics.expenseRatio > 90 ? 'text-bank-danger font-bold' : 'font-bold text-bank-textActive'}>
                    {metrics.expenseRatio.toFixed(1)}% of Income
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-bank-cardBorder/60">
                <div className="text-[10px] font-semibold text-bank-textMuted mb-0.5">Monthly Savings Potential</div>
                <div className={`text-xl font-black tracking-tight ${metrics.savingsCapacity >= 0 ? 'text-emerald-400' : 'text-bank-danger'}`}>
                  {metrics.savingsCapacity >= 0 ? '+' : ''}₹{metrics.savingsCapacity.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Savings Goal Estimator Card */}
        <div className="glass-panel p-6 flex flex-col justify-between h-full relative overflow-hidden group min-h-[190px]">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-bl-full pointer-events-none" />

          <h3 className="text-sm font-bold text-bank-textMuted uppercase tracking-wider mb-4 flex items-center gap-2 border-b border-white/5 pb-2">
            <Goal className="w-4 h-4 text-blue-400" /> Goal Estimator
          </h3>

          {!hasAnyInput ? (
            <div className="py-4 text-center">
              <p className="text-xs text-bank-textMuted/60 leading-relaxed">
                Set your savings goal and timeline to see monthly requirements.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <div className="text-[10px] font-semibold text-bank-textMuted mb-0.5">Required Monthly Savings</div>
                <div className="text-xl font-black text-blue-400 tracking-tight">
                  {metrics.savingsTargetMonthly > 0
                    ? `₹${metrics.savingsTargetMonthly.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                    : <span className="text-bank-textMuted text-lg">—</span>
                  }
                </div>
              </div>

              {metrics.savingsTargetMonthly > 0 && (
                <div className="pt-2 border-t border-bank-cardBorder/60">
                  {metrics.savingsCapacity >= metrics.savingsTargetMonthly ? (
                    <div className="bg-emerald-500/5 border border-emerald-500/20 p-2 rounded-xl text-[10px]">
                      <span className="font-bold text-emerald-400">🟢 On Track</span>
                      <p className="text-bank-textMuted mt-0.5 leading-normal">
                        Surplus exceeds target by ₹{(metrics.savingsCapacity - metrics.savingsTargetMonthly).toLocaleString('en-IN', { maximumFractionDigits: 0 })}/mo.
                      </p>
                    </div>
                  ) : (
                    <div className="bg-bank-danger/5 border border-bank-danger/20 p-2 rounded-xl text-[10px]">
                      <span className="font-bold text-bank-danger">🔴 Savings Gap</span>
                      <p className="text-bank-textMuted mt-0.5 leading-normal">
                        Short by ₹{Math.abs(metrics.savingsCapacity - metrics.savingsTargetMonthly).toLocaleString('en-IN', { maximumFractionDigits: 0 })}/mo.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Card 6: Operations & Actions Submit Card */}
        <div className="glass-panel p-6 flex flex-col justify-between h-full space-y-4 min-h-[190px]">
          <div>
            <h3 className="text-sm font-semibold tracking-wider text-cyan-400 uppercase flex items-center gap-2 border-b border-white/5 pb-2">
              <Zap className="w-4 h-4" /> Actions & Compilation
            </h3>
            <p className="text-[10px] text-bank-textMuted mt-2 leading-relaxed">
              Verify values and trigger Gemini intelligence to compile budget and portfolio suggestions.
            </p>
          </div>

          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleLoadDemo}
                className="flex items-center justify-center gap-1.5 px-3 py-2 text-[10px] font-bold bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl transition hover:bg-amber-500/25"
              >
                <Zap className="w-3 h-3" /> Load Demo
              </button>
              {suggestedProfile ? (
                <button
                  type="button"
                  onClick={handleAutoFill}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 text-[10px] font-bold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl transition hover:bg-emerald-500/25"
                >
                  <FileCheck className="w-3 h-3" /> Auto-Fill
                </button>
              ) : (
                <button
                  type="button"
                  disabled
                  className="flex items-center justify-center gap-1.5 px-3 py-2 text-[10px] font-bold bg-bank-bg/40 border border-bank-cardBorder text-bank-textMuted/40 rounded-xl cursor-not-allowed"
                >
                  <FileCheck className="w-3 h-3" /> No Data
                </button>
              )}
            </div>

            <div className="flex gap-2">
              {hasAnyInput && (
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="px-3 py-2 text-[10px] font-bold bg-bank-bg hover:bg-bank-cardBorder border border-bank-cardBorder text-bank-textMuted hover:text-white rounded-xl transition flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3 h-3" /> Reset
                </button>
              )}
              <button
                type="submit"
                className="flex-1 py-2 px-3 bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white font-bold text-[10px] rounded-xl shadow-glow-cyan hover:shadow-lg transition-all duration-300 flex items-center justify-center gap-1.5 border border-cyan-400/20"
              >
                <span>Generate Wealth Advisory</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

      </div>
    </form>
  );
}
