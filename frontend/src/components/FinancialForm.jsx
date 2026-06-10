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

  const hasAnyInput = Object.values(formData).some(v => v !== '' && v !== 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      
      {/* Interactive Input Form */}
      <form onSubmit={handleFormSubmit} className="lg:col-span-2 glass-panel p-6 sm:p-8 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6 pb-6 border-b border-bank-cardBorder">
          <div>
            <h2 className="text-xl font-bold text-bank-textActive tracking-tight">Financial Profile Builder</h2>
            <p className="text-sm text-bank-textMuted mt-0.5">Input your financial details to get personalised AI advice.</p>
          </div>
          
          {/* Auto-Fill from Statement + Demo + Clear buttons */}
          <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
            {hasAnyInput && (
              <button
                type="button"
                onClick={handleClearAll}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-bank-bg hover:bg-bank-cardBorder border border-bank-cardBorder text-bank-textMuted hover:text-white rounded-xl transition"
              >
                <RotateCcw className="w-3 h-3" /> Clear
              </button>
            )}
            {/* Auto-Fill from Statement — only shown when transaction data is available */}
            {suggestedProfile && (
              <button
                type="button"
                onClick={handleAutoFill}
                className="flex items-center gap-2 px-4 py-2 text-xs font-bold bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white rounded-xl transition shadow-md"
              >
                <FileCheck className="w-3.5 h-3.5" />
                Auto-Fill from Statement
              </button>
            )}
            <button
              type="button"
              onClick={handleLoadDemo}
              className="flex items-center gap-2 px-4 py-2 text-xs font-bold bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white rounded-xl transition shadow-md"
            >
              <Zap className="w-3.5 h-3.5" />
              Load Demo
            </button>
          </div>
        </div>

        {/* Statement Auto-Fill notice */}
        {isStatementLoaded && suggestedProfile && (
          <div className="mb-5 flex items-start gap-2.5 px-4 py-3 bg-emerald-500/8 border border-emerald-500/25 rounded-xl">
            <span className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-500/15 border border-emerald-500/30 rounded-full text-[10px] font-bold text-emerald-400 uppercase tracking-widest flex-shrink-0 mt-0.5">
              <FileCheck className="w-3 h-3" /> User Data
            </span>
            <div>
              <p className="text-xs text-emerald-400 font-bold">
                Auto-filled from {suggestedProfile.totalTransactions} transactions across {suggestedProfile.monthCount} month{suggestedProfile.monthCount > 1 ? 's' : ''}.
              </p>
              <p className="text-[10px] text-emerald-400/70 mt-0.5">
                Categories detected: {suggestedProfile.detectedCategories.slice(0,5).join(' · ')}. Set your Savings Goal and Timeline to generate advice.
              </p>
            </div>
          </div>
        )}

        {/* Demo badge notice */}
        {isDemoLoaded && (
          <div className="mb-5 flex items-center gap-2.5 px-4 py-3 bg-amber-500/8 border border-amber-500/25 rounded-xl">
            <span className="flex items-center gap-1.5 px-2 py-0.5 bg-amber-500/15 border border-amber-500/30 rounded-full text-[10px] font-bold text-amber-400 uppercase tracking-widest">
              <Zap className="w-3 h-3" /> Demo Data
            </span>
            <p className="text-xs text-amber-400/80 font-medium">
              Sample profile loaded — edit any field to switch to your own data.
            </p>
          </div>
        )}

        {validationError && (
          <div className="mb-6 p-4 bg-bank-danger/10 border border-bank-danger/30 text-bank-danger text-sm rounded-xl font-semibold flex items-center gap-2 animate-pulse">
            <span>⚠️</span> {validationError}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          
          {/* Section: Income & Goal */}
          <div className="space-y-5">
            <h3 className="text-sm font-semibold tracking-wider text-emerald-400 uppercase flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4" /> Core Financials
            </h3>
            
            <div>
              <label className="block text-xs font-bold text-bank-textMuted uppercase tracking-wider mb-2">
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
              <label className="block text-xs font-bold text-bank-textMuted uppercase tracking-wider mb-2">
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
              <label className="block text-xs font-bold text-bank-textMuted uppercase tracking-wider mb-2 flex items-center gap-1">
                Goal Timeline <span className="text-[10px] text-bank-textMuted font-normal lowercase">(months)</span>
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

          {/* Section: Expenditures */}
          <div className="space-y-5">
            <h3 className="text-sm font-semibold tracking-wider text-blue-400 uppercase flex items-center gap-2 mb-2">
              <Calculator className="w-4 h-4" /> Monthly Expenditures
            </h3>

            <div>
              <label className="block text-xs font-bold text-bank-textMuted uppercase tracking-wider mb-2 flex items-center gap-1.5">
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
              <label className="block text-xs font-bold text-bank-textMuted uppercase tracking-wider mb-2 flex items-center gap-1.5">
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
              <label className="block text-xs font-bold text-bank-textMuted uppercase tracking-wider mb-2 flex items-center gap-1.5">
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
              <label className="block text-xs font-bold text-bank-textMuted uppercase tracking-wider mb-2 flex items-center gap-1.5">
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

            <div>
              <label className="block text-xs font-bold text-bank-textMuted uppercase tracking-wider mb-2 flex items-center gap-1.5">
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

        <button
          type="submit"
          className="mt-8 w-full py-4 px-6 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold rounded-xl shadow-glow-emerald hover:shadow-lg transition-all duration-300 flex items-center justify-center gap-2 group"
        >
          <span>Generate AI Wealth Advisory</span>
          <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </button>
      </form>

      {/* Dynamic Calculations Dashboard Panel */}
      <div className="space-y-6 lg:col-span-1">
        
        {/* Real-time cash flow */}
        <div className="glass-panel p-6 flex flex-col justify-between h-fit relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-bl-full pointer-events-none" />
          
          <h3 className="text-sm font-bold text-bank-textMuted uppercase tracking-wider mb-4 flex items-center gap-2">
            <Calculator className="w-4 h-4 text-emerald-400" /> Real-Time Ratios
          </h3>

          {!hasAnyInput ? (
            <div className="py-6 text-center space-y-2">
              <p className="text-xs text-bank-textMuted/60 leading-relaxed">
                Enter your financial details or load a demo profile to see live calculations.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1.5 text-bank-textMuted">
                  <span>Total Monthly Expenses</span>
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
                <div className="text-xs font-semibold text-bank-textMuted mb-0.5">Calculated Monthly Savings Potential</div>
                <div className={`text-2xl font-black tracking-tight ${metrics.savingsCapacity >= 0 ? 'text-emerald-400' : 'text-bank-danger'}`}>
                  {metrics.savingsCapacity >= 0 ? '+' : ''}₹{metrics.savingsCapacity.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <p className="text-[10px] text-bank-textMuted mt-1 leading-relaxed">
                  Disposable income remaining after matching specified categorical expenses.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Savings Goal Calculator Panel */}
        <div className="glass-panel p-6 flex flex-col justify-between h-fit relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-bl-full pointer-events-none" />

          <h3 className="text-sm font-bold text-bank-textMuted uppercase tracking-wider mb-4 flex items-center gap-2">
            <Goal className="w-4 h-4 text-blue-400" /> Goal Estimator
          </h3>

          {!hasAnyInput ? (
            <div className="py-6 text-center space-y-2">
              <p className="text-xs text-bank-textMuted/60 leading-relaxed">
                Set your savings goal and timeline to see monthly requirements.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <div className="text-xs font-semibold text-bank-textMuted mb-0.5">Required Monthly Savings</div>
                <div className="text-2xl font-black text-blue-400 tracking-tight">
                  {metrics.savingsTargetMonthly > 0
                    ? `₹${metrics.savingsTargetMonthly.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                    : <span className="text-bank-textMuted text-lg">—</span>
                  }
                </div>
                {formData.financial_goal_timeline && formData.savings_goal ? (
                  <p className="text-[10px] text-bank-textMuted mt-1 leading-relaxed">
                    Needed monthly over {formData.financial_goal_timeline} months to secure your ₹{Number(formData.savings_goal).toLocaleString('en-IN')} goal.
                  </p>
                ) : (
                  <p className="text-[10px] text-bank-textMuted mt-1">Enter savings goal and timeline above.</p>
                )}
              </div>

              {metrics.savingsTargetMonthly > 0 && (
                <div className="pt-3 border-t border-bank-cardBorder/60">
                  <div className="text-xs font-semibold text-bank-textMuted mb-2">Goal Status Check</div>
                  {metrics.savingsCapacity >= metrics.savingsTargetMonthly ? (
                    <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-xl">
                      <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                        <span>🟢 On Track</span>
                      </div>
                      <p className="text-[10px] text-bank-textMuted mt-1 leading-normal">
                        Your current savings potential exceeds the target by ₹{(metrics.savingsCapacity - metrics.savingsTargetMonthly).toLocaleString('en-IN', { maximumFractionDigits: 0 })}/mo. You are positioned exceptionally well!
                      </p>
                    </div>
                  ) : (
                    <div className="bg-bank-danger/10 border border-bank-danger/20 p-3 rounded-xl">
                      <div className="text-xs font-bold text-bank-danger flex items-center gap-1.5">
                        <span>🔴 Savings Gap Identified</span>
                      </div>
                      <p className="text-[10px] text-bank-textMuted mt-1 leading-normal">
                        You are short by ₹{Math.abs(metrics.savingsCapacity - metrics.savingsTargetMonthly).toLocaleString('en-IN', { maximumFractionDigits: 0 })}/mo. The AI Wealth Engine will structure strategies to narrow this gap.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
