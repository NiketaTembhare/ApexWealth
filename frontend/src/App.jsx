import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Auth from './components/Auth';
import BankStatementUpload from './components/BankStatementUpload';
import DashboardCharts from './components/DashboardCharts';
import AIInsightsSidebar from './components/AIInsightsSidebar';
import AIAgentPanel from './components/AIAgentPanel';
import FloatingChatbot from './components/FloatingChatbot';
import TimeFilter from './components/TimeFilter';
import FinancialForm from './components/FinancialForm';
import AdviceDashboard from './components/AdviceDashboard';
import Spinner from './components/Spinner';
import { generateAdvice, logoutUser } from './services/api';
import { analyzeTransactions } from './utils/syntheticData';
import {
  Sparkles, X, LogOut, User, Upload, BarChart2, Brain, Home,
  ArrowRight, ChevronLeft, Database
} from 'lucide-react';

const NAV_ITEMS = [
  { id: 'upload', label: 'Import Data', icon: Upload },
  { id: 'dashboard', label: 'Analytics', icon: BarChart2 },
  { id: 'agents', label: 'AI Agents', icon: Brain },
  { id: 'advisor', label: 'AI Advisor', icon: Sparkles },
];

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [advice, setAdvice] = useState(null);
  const [inputData, setInputData] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [filter, setFilter] = useState('monthly');
  const [activeNav, setActiveNav] = useState('upload');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Restore session
  useEffect(() => {
    const savedUser = localStorage.getItem('apex_user');
    if (savedUser) {
      try { setUser(JSON.parse(savedUser)); } catch { localStorage.removeItem('apex_user'); }
    }
  }, []);

  // Re-analyze when filter or transactions change
  useEffect(() => {
    if (transactions.length > 0) {
      const result = analyzeTransactions(transactions, filter);
      setAnalytics(result);
    }
  }, [transactions, filter]);

  // Auto-navigate to dashboard after data load
  const handleDataLoaded = (txns) => {
    setTransactions(txns);
    const result = analyzeTransactions(txns, filter);
    setAnalytics(result);
    setTimeout(() => setActiveNav('dashboard'), 300);
  };

  const handleFilterChange = (newFilter) => {
    setFilter(newFilter);
  };

  const handleFormSubmit = async (formData) => {
    setLoading(true);
    setError('');
    try {
      const data = await generateAdvice(formData);
      setAdvice(data);
      setInputData(formData);
      setActiveNav('advisor');
    } catch (err) {
      setError(err.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logoutUser();
    setUser(null);
    setAdvice(null);
    setInputData(null);
    setTransactions([]);
    setAnalytics(null);
    setError('');
  };

  if (!user) {
    return <Auth onAuthSuccess={(userData) => setUser(userData)} />;
  }

  const renderContent = () => {
    switch (activeNav) {
      case 'upload':
        return <BankStatementUpload onDataLoaded={handleDataLoaded} />;

      case 'dashboard':
        return (
          <div className="space-y-6 animate-fade-in">
            {/* Analytics header with time filter */}
            <div className="glass-panel-glow p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-bank-textActive flex items-center gap-2">
                  <BarChart2 className="w-5 h-5 text-cyan-400" /> Financial Analytics Dashboard
                </h2>
                <p className="text-xs text-bank-textMuted mt-0.5">
                  {transactions.length} transactions · {analytics?.transactionCount || 0} in view
                </p>
              </div>
              <TimeFilter value={filter} onChange={handleFilterChange} />
            </div>

            {/* Quick stats */}
            {analytics && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Total Income', value: `₹${analytics.totalIncome.toLocaleString('en-IN')}`, color: 'text-emerald-400', bg: 'bg-emerald-500/5', border: 'border-emerald-500/20' },
                  { label: 'Total Expenses', value: `₹${analytics.totalExpenses.toLocaleString('en-IN')}`, color: 'text-rose-400', bg: 'bg-rose-500/5', border: 'border-rose-500/20' },
                  { label: 'Net Savings', value: `₹${analytics.savings.toLocaleString('en-IN')}`, color: analytics.savings >= 0 ? 'text-cyan-400' : 'text-red-400', bg: 'bg-cyan-500/5', border: 'border-cyan-500/20' },
                  { label: 'Savings Ratio', value: `${analytics.savingsRatio}%`, color: 'text-purple-400', bg: 'bg-purple-500/5', border: 'border-purple-500/20' },
                ].map((stat, i) => (
                  <div key={i} className={`rounded-2xl border p-4 ${stat.bg} ${stat.border}`}>
                    <p className="text-[10px] text-bank-textMuted font-bold uppercase tracking-wider">{stat.label}</p>
                    <p className={`text-xl font-black mt-1 ${stat.color}`}>{stat.value}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Main 2-col layout: Charts + AI Insights sidebar */}
            <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
              <div className="xl:col-span-3">
                <DashboardCharts analytics={analytics} filter={filter} />
              </div>
              <div className="xl:col-span-1">
                <div className="glass-panel p-5 h-full">
                  <AIInsightsSidebar analytics={analytics} />
                </div>
              </div>
            </div>

            {/* No data prompt */}
            {!analytics && (
              <div className="glass-panel p-16 text-center space-y-4">
                <Database className="w-12 h-12 text-bank-textMuted mx-auto" />
                <p className="text-bank-textMuted font-semibold">No transaction data loaded yet</p>
                <button onClick={() => setActiveNav('upload')} className="px-6 py-3 text-sm font-bold bg-gradient-to-r from-cyan-500 to-purple-600 text-white rounded-xl flex items-center gap-2 mx-auto">
                  Import Bank Statement <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        );

      case 'agents':
        return (
          <div className="space-y-6 animate-fade-in">
            <div className="glass-panel-glow p-5">
              <h2 className="text-lg font-bold text-bank-textActive flex items-center gap-2">
                <Brain className="w-5 h-5 text-purple-400" /> Multi-AI Agent System
              </h2>
              <p className="text-xs text-bank-textMuted mt-1">6 specialized AI agents analyzing your financial data in real-time</p>
            </div>
            <AIAgentPanel active={true} analytics={analytics} />
          </div>
        );

      case 'advisor':
        return (
          <div className="space-y-6 animate-fade-in">
            <div className="glass-panel-glow p-5 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-bank-textActive flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-emerald-400" /> AI Wealth Advisor
                </h2>
                <p className="text-xs text-bank-textMuted mt-1">Enter your financials to get personalized AI-driven wealth advice</p>
              </div>
              {advice && (
                <button onClick={() => { setAdvice(null); setInputData(null); }} className="px-4 py-2 text-xs font-bold border border-bank-cardBorder text-bank-textMuted hover:text-white rounded-xl transition">
                  New Analysis
                </button>
              )}
            </div>

            {error && (
              <div className="p-4 bg-red-900/25 border border-red-500/30 text-red-200 text-sm rounded-2xl flex items-center justify-between gap-4">
                <span>🚨 {error}</span>
                <button onClick={() => setError('')} className="text-red-400 hover:text-red-200 p-1">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {advice
              ? <AdviceDashboard advice={advice} inputData={inputData} onReset={() => { setAdvice(null); setInputData(null); }} />
              : <FinancialForm onSubmit={handleFormSubmit} />
            }
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col min-h-screen text-slate-100 selection:bg-cyan-500 selection:text-white">
      <Header />

      <div className="flex flex-1 relative">

        {/* Sidebar */}
        <aside className={`${sidebarOpen ? 'w-56' : 'w-16'} transition-all duration-300 flex-shrink-0 bg-bank-card/50 border-r border-bank-cardBorder backdrop-blur-md flex flex-col z-20 sticky top-0 h-screen`}>

          {/* Sidebar toggle */}
          <div className="flex items-center justify-between p-4 border-b border-bank-cardBorder/60">
            {sidebarOpen && (
              <div>
                <p className="text-xs font-bold text-bank-textActive">{user.name}</p>
                <p className="text-[10px] text-bank-textMuted">{user.username}</p>
              </div>
            )}
            <button
              onClick={() => setSidebarOpen(o => !o)}
              className="p-1.5 rounded-lg hover:bg-bank-cardBorder text-bank-textMuted hover:text-white transition ml-auto"
            >
              {sidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <User className="w-4 h-4" />}
            </button>
          </div>

          {/* Nav items */}
          <nav className="flex-1 p-3 space-y-1">
            {NAV_ITEMS.map(item => {
              const Icon = item.icon;
              const isActive = activeNav === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveNav(item.id)}
                  title={item.label}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 text-sm font-semibold ${
                    isActive
                      ? 'bg-gradient-to-r from-cyan-500/20 to-purple-600/20 border border-cyan-500/30 text-cyan-400'
                      : 'text-bank-textMuted hover:text-white hover:bg-bank-card/60'
                  }`}
                >
                  <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-cyan-400' : ''}`} />
                  {sidebarOpen && <span>{item.label}</span>}
                  {isActive && sidebarOpen && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-cyan-400" />}
                </button>
              );
            })}
          </nav>

          {/* Sign out */}
          <div className="p-3 border-t border-bank-cardBorder/60">
            <button
              onClick={handleLogout}
              title="Sign Out"
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-bank-textMuted hover:text-rose-400 hover:bg-rose-500/5 transition text-sm font-semibold"
            >
              <LogOut className="w-4 h-4 flex-shrink-0" />
              {sidebarOpen && 'Sign Out'}
            </button>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0 p-6 lg:p-8 overflow-x-hidden">
          {renderContent()}
        </main>
      </div>

      {/* Floating Chatbot */}
      <FloatingChatbot
        financialData={inputData}
        advice={advice}
        analytics={analytics}
      />

      {loading && <Spinner />}
    </div>
  );
}
