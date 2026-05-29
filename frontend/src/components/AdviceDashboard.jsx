import React, { useState, useRef, useEffect } from 'react';
import { 
  PieChart, 
  Wallet, 
  PiggyBank, 
  TrendingUp, 
  ShieldAlert, 
  Sparkles, 
  CheckCircle,
  TrendingDown,
  ArrowUpRight,
  Bookmark,
  MessageSquare,
  Send,
  User,
  Bot,
  Activity,
  History
} from 'lucide-react';
import { sendChatMessage } from '../services/api';

export default function AdviceDashboard({ advice, inputData, onReset }) {
  const [activeTab, setActiveTab] = useState('all');
  const [chatMessages, setChatMessages] = useState([
    {
      role: 'assistant',
      content: `Hello! I'm your dedicated AI Wealth Advisor. 📈 I have reviewed your target goal of **$${inputData.savings_goal.toLocaleString()}** to be achieved in **${inputData.financial_goal_timeline} months**. Ask me anything about adjusting your budget, investing options, or cutting costs!`
    }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState('');

  const chatEndRef = useRef(null);

  useEffect(() => {
    // Scroll chat to bottom on new messages
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, chatLoading]);

  const totalExpenses = (
    inputData.rent_expense +
    inputData.food_expense +
    inputData.shopping_expense +
    inputData.travel_expense +
    inputData.entertainment_expense
  );
  
  const savingsCapacity = inputData.monthly_income - totalExpenses;
  const targetMonthlySavings = inputData.savings_goal / inputData.financial_goal_timeline;
  const savingsGap = targetMonthlySavings - savingsCapacity;

  // Visual percentages
  const rentPct = (inputData.rent_expense / inputData.monthly_income) * 100;
  const foodPct = (inputData.food_expense / inputData.monthly_income) * 100;
  const shoppingPct = (inputData.shopping_expense / inputData.monthly_income) * 100;
  const travelPct = (inputData.travel_expense / inputData.monthly_income) * 100;
  const entPct = (inputData.entertainment_expense / inputData.monthly_income) * 100;
  const totalExpPct = (totalExpenses / inputData.monthly_income) * 100;
  const savingsPct = (savingsCapacity / inputData.monthly_income) * 100;

  // Format advice paragraphs to clean HTML paragraphs (no bullets/points)
  const formatAdviceText = (text) => {
    if (!text) return null;
    
    // Split by newlines (each block forms a clean paragraph)
    const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 0);
    
    return (
      <div className="space-y-4">
        {paragraphs.map((para, idx) => {
          // If there are multiple individual lines split by single newlines, let's keep them readable
          const lines = para.split(/\n/).filter(l => l.trim().length > 0);
          return (
            <p key={idx} className="text-sm text-bank-textMuted leading-relaxed">
              {lines.map((line, lIdx) => {
                let cleanLine = line.replace(/^[-*•\d+.]\s*/, '').trim();
                
                // Bold key phrases before colons if present
                const colonIndex = cleanLine.indexOf(':');
                if (colonIndex > 0 && colonIndex < 35) {
                  const keyPhrase = cleanLine.substring(0, colonIndex);
                  const remaining = cleanLine.substring(colonIndex);
                  return (
                    <span key={lIdx} className="block mt-1">
                      <strong className="text-bank-textActive font-semibold">{keyPhrase}</strong>
                      {remaining}
                    </span>
                  );
                }
                return <span key={lIdx} className="block mt-1">{cleanLine}</span>;
              })}
            </p>
          );
        })}
      </div>
    );
  };


  const handleSendChatMessage = async (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMessage = chatInput.trim();
    setChatInput('');
    setChatError('');
    
    // Add user message locally
    const updatedMessages = [...chatMessages, { role: 'user', content: userMessage }];
    setChatMessages(updatedMessages);
    setChatLoading(true);

    try {
      // Map frontend messages to backend schema ChatMessage
      const historyPayload = updatedMessages.slice(0, -1).map(msg => ({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content
      }));

      const payload = {
        financial_data: inputData,
        advice: advice,
        history: historyPayload,
        message: userMessage
      };

      const response = await sendChatMessage(payload);
      
      setChatMessages(prev => [...prev, { role: 'assistant', content: response.response }]);
    } catch (err) {
      console.error(err);
      setChatError(err.message || 'Unable to connect to the advisor. Try again.');
    } finally {
      setChatLoading(false);
    }
  };

  const tabs = [
    { id: 'all', label: 'All Advisory Core' },
    { id: 'budget', label: 'Budget & Spending', icon: Wallet },
    { id: 'savings', label: 'Savings & Reserves', icon: PiggyBank },
    { id: 'investments', label: 'Wealth & Investments', icon: TrendingUp },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Top Banner: Quick Summary */}
      <div className="glass-panel-glow p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-bl-full pointer-events-none" />
        <div className="relative flex items-start gap-4">
          <div className="bg-emerald-500/10 p-3 rounded-2xl border border-emerald-500/30 text-emerald-400 mt-1">
            <Sparkles className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-bank-textActive tracking-tight">AI Wealth Portfolio Formulated</h2>
            <p className="text-xs text-bank-textMuted mt-0.5 uppercase tracking-wider font-semibold">Model Status: Peak Performance</p>
            <p className="text-sm text-bank-textMuted mt-2 max-w-2xl leading-relaxed">
              {advice.personalized_summary}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3 relative z-10">
          <button
            onClick={onReset}
            className="px-5 py-3 text-sm font-bold bg-bank-bg hover:bg-bank-cardBorder border border-bank-cardBorder rounded-xl transition-all duration-200"
          >
            Refine Inputs
          </button>
          <button
            onClick={() => window.print()}
            className="px-5 py-3 text-sm font-bold bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white rounded-xl shadow-glow-emerald transition-all duration-200 flex items-center gap-1.5"
          >
            <Bookmark className="w-4 h-4" /> Export Report
          </button>
        </div>
      </div>

      {/* NEW FEATURE: Visual Analytics Dashboard */}
      <div className="glass-panel p-6 sm:p-8 space-y-6 relative overflow-hidden">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-bank-textActive flex items-center gap-2">
            <Activity className="w-5 h-5 text-emerald-400 animate-pulse" /> Real-time Visual Financial Analytics
          </h3>
          <span className="text-[10px] font-bold text-emerald-400 tracking-widest uppercase bg-emerald-500/5 px-2 py-0.5 rounded-full border border-emerald-500/20">
            Interactive Ratios
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Circular SVG Doughnut Ratios */}
          <div className="flex flex-col items-center justify-center bg-bank-bg/40 border border-bank-cardBorder/60 p-6 rounded-2xl">
            <div className="relative w-40 h-40">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                {/* Background Ring */}
                <path
                  className="text-bank-cardBorder"
                  strokeWidth="3.5"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                {/* Expense Ring */}
                <path
                  className="text-rose-500/80 transition-all duration-1000 ease-out"
                  strokeWidth="3.5"
                  strokeDasharray={`${totalExpPct.toFixed(1)}, 100`}
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                {/* Savings Ring overlay (if positive savings) */}
                {savingsPct > 0 && (
                  <path
                    className="text-emerald-400/90 transition-all duration-1000 ease-out"
                    strokeWidth="3.5"
                    strokeDasharray={`${savingsPct.toFixed(1)}, 100`}
                    strokeDashoffset={`-${totalExpPct.toFixed(1)}`}
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                )}
              </svg>
              {/* Inner Text */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-2xl font-black text-bank-textActive">
                  {savingsPct > 0 ? `+${savingsPct.toFixed(0)}%` : `${savingsPct.toFixed(0)}%`}
                </span>
                <span className="text-[10px] text-bank-textMuted uppercase font-bold tracking-wider mt-0.5">
                  {savingsPct > 0 ? "Savings Rate" : "Deficit Rate"}
                </span>
              </div>
            </div>
            
            <div className="flex gap-4 mt-6 text-xs font-semibold">
              <div className="flex items-center gap-1.5 text-rose-400">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
                <span>Expenses: {totalExpPct.toFixed(0)}%</span>
              </div>
              <div className="flex items-center gap-1.5 text-emerald-400">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" />
                <span>Savings: {savingsPct > 0 ? savingsPct.toFixed(0) : 0}%</span>
              </div>
            </div>
          </div>

          {/* Categorical Linear Progress Bars */}
          <div className="lg:col-span-2 space-y-4 bg-bank-bg/40 border border-bank-cardBorder/60 p-6 rounded-2xl justify-center flex flex-col">
            <h4 className="text-xs font-bold text-bank-textMuted uppercase tracking-wider mb-2">Category Breakdown (Percentage of Income)</h4>
            
            {/* Rent Expense */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-bank-textActive">Rent & Housing</span>
                <span className="text-bank-textMuted">₹{inputData.rent_expense.toLocaleString('en-IN')} ({rentPct.toFixed(0)}%)</span>
              </div>
              <div className="h-2 w-full bg-bank-cardBorder rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-1000 ${rentPct > 35 ? 'bg-rose-500' : 'bg-blue-400'}`} 
                  style={{ width: `${Math.min(rentPct, 100)}%` }}
                />
              </div>
            </div>

            {/* Food Expense */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-bank-textActive">Food & Groceries</span>
                <span className="text-bank-textMuted">₹{inputData.food_expense.toLocaleString('en-IN')} ({foodPct.toFixed(0)}%)</span>
              </div>
              <div className="h-2 w-full bg-bank-cardBorder rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-1000 ${foodPct > 20 ? 'bg-amber-500' : 'bg-emerald-400'}`} 
                  style={{ width: `${Math.min(foodPct, 100)}%` }}
                />
              </div>
            </div>

            {/* Shopping Expense */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-bank-textActive">Shopping & Retail</span>
                <span className="text-bank-textMuted">₹{inputData.shopping_expense.toLocaleString('en-IN')} ({shoppingPct.toFixed(0)}%)</span>
              </div>
              <div className="h-2 w-full bg-bank-cardBorder rounded-full overflow-hidden">
                <div 
                  className="h-full bg-pink-400 rounded-full transition-all duration-1000" 
                  style={{ width: `${Math.min(shoppingPct, 100)}%` }}
                />
              </div>
            </div>

            {/* Travel Expense */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-bank-textActive">Travel & Commute</span>
                <span className="text-bank-textMuted">₹{inputData.travel_expense.toLocaleString('en-IN')} ({travelPct.toFixed(0)}%)</span>
              </div>
              <div className="h-2 w-full bg-bank-cardBorder rounded-full overflow-hidden">
                <div 
                  className="h-full bg-indigo-400 rounded-full transition-all duration-1000" 
                  style={{ width: `${Math.min(travelPct, 100)}%` }}
                />
              </div>
            </div>

            {/* Entertainment Expense */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-bank-textActive">Entertainment & Leisure</span>
                <span className="text-bank-textMuted">₹{inputData.entertainment_expense.toLocaleString('en-IN')} ({entPct.toFixed(0)}%)</span>
              </div>
              <div className="h-2 w-full bg-bank-cardBorder rounded-full overflow-hidden">
                <div 
                  className="h-full bg-yellow-400 rounded-full transition-all duration-1000" 
                  style={{ width: `${Math.min(entPct, 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Controller */}
      <div className="flex overflow-x-auto pb-1 gap-2 border-b border-bank-cardBorder/60 scrollbar-none">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold rounded-xl transition whitespace-nowrap ${
                isActive 
                  ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400' 
                  : 'bg-bank-card/40 border border-transparent text-bank-textMuted hover:text-bank-textActive hover:bg-bank-card/60'
              }`}
            >
              {Icon && <Icon className="w-4 h-4" />}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Grid of Advice Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Card: Spending Analysis */}
        {(activeTab === 'all' || activeTab === 'budget') && (
          <div className="glass-panel p-6 sm:p-8 flex flex-col justify-between border-t-2 border-t-blue-500/40 relative group hover:border-t-blue-500 transition-all duration-300">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-bank-textActive flex items-center gap-2.5">
                  <PieChart className="w-5 h-5 text-blue-400" /> Spending Architecture
                </h3>
                <span className="text-[10px] font-bold text-blue-400 tracking-widest uppercase bg-blue-500/5 px-2 py-0.5 rounded-full border border-blue-500/20">
                  Analysis
                </span>
              </div>
              <div className="mt-4">
                {formatAdviceText(advice.spending_analysis)}
              </div>
            </div>
            <div className="mt-6 pt-4 border-t border-bank-cardBorder/60 flex items-center justify-between text-xs text-bank-textMuted font-semibold">
              <span>Ratios Evaluated</span>
              <span className="text-bank-textActive font-bold">Total Expenses: ₹{totalExpenses.toLocaleString('en-IN')}/mo</span>
            </div>
          </div>
        )}

        {/* Card: Budgeting Advice */}
        {(activeTab === 'all' || activeTab === 'budget') && (
          <div className="glass-panel p-6 sm:p-8 flex flex-col justify-between border-t-2 border-t-emerald-500/40 relative group hover:border-t-emerald-500 transition-all duration-300">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-bank-textActive flex items-center gap-2.5">
                  <Wallet className="w-5 h-5 text-emerald-400" /> Budget Optimizations
                </h3>
                <span className="text-[10px] font-bold text-emerald-400 tracking-widest uppercase bg-emerald-500/5 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  Directives
                </span>
              </div>
              <div className="mt-4">
                {formatAdviceText(advice.budgeting_advice)}
              </div>
            </div>
            <div className="mt-6 pt-4 border-t border-bank-cardBorder/60 flex items-center justify-between text-xs text-bank-textMuted font-semibold">
              <span>Strategy Enforced</span>
              <span className="text-bank-textActive font-bold">50-30-20 Weighted</span>
            </div>
          </div>
        )}

        {/* Card: Savings Recommendations */}
        {(activeTab === 'all' || activeTab === 'savings') && (
          <div className="glass-panel p-6 sm:p-8 flex flex-col justify-between border-t-2 border-t-indigo-500/40 relative group hover:border-t-indigo-500 transition-all duration-300">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-bank-textActive flex items-center gap-2.5">
                  <PiggyBank className="w-5 h-5 text-indigo-400" /> Target Savings Engine
                </h3>
                <span className="text-[10px] font-bold text-indigo-400 tracking-widest uppercase bg-indigo-500/5 px-2 py-0.5 rounded-full border border-indigo-500/20">
                  Accumulation
                </span>
              </div>
              <div className="mt-4">
                {formatAdviceText(advice.savings_recommendation)}
              </div>
            </div>
            <div className="mt-6 pt-4 border-t border-bank-cardBorder/60 flex items-center justify-between text-xs text-bank-textMuted font-semibold">
              <span>Monthly Rate Required</span>
              <span className="text-indigo-400 font-bold">₹{targetMonthlySavings.toLocaleString('en-IN', { maximumFractionDigits: 0 })}/mo</span>
            </div>
          </div>
        )}

        {/* Card: Emergency Fund Recommendation */}
        {(activeTab === 'all' || activeTab === 'savings') && (
          <div className="glass-panel p-6 sm:p-8 flex flex-col justify-between border-t-2 border-t-yellow-500/40 relative group hover:border-t-yellow-500 transition-all duration-300">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-bank-textActive flex items-center gap-2.5">
                  <ShieldAlert className="w-5 h-5 text-yellow-400" /> Capital Reserve Lock
                </h3>
                <span className="text-[10px] font-bold text-yellow-400 tracking-widest uppercase bg-yellow-500/5 px-2 py-0.5 rounded-full border border-yellow-500/20">
                  Risk Mitigation
                </span>
              </div>
              <div className="mt-4">
                {formatAdviceText(advice.emergency_fund_recommendation)}
              </div>
            </div>
            <div className="mt-6 pt-4 border-t border-bank-cardBorder/60 flex items-center justify-between text-xs text-bank-textMuted font-semibold">
              <span>Safety Benchmarks</span>
              <span className="text-yellow-400 font-bold">3-6 Month Expenses</span>
            </div>
          </div>
        )}

        {/* Card: Investment Suggestion */}
        {(activeTab === 'all' || activeTab === 'investments') && (
          <div className="glass-panel p-6 sm:p-8 md:col-span-2 flex flex-col justify-between border-t-2 border-t-teal-500/40 relative group hover:border-t-teal-500 transition-all duration-300">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-bank-textActive flex items-center gap-2.5">
                  <TrendingUp className="w-5 h-5 text-teal-400" /> Asset Allocation & Wealth Growth
                </h3>
                <span className="text-[10px] font-bold text-teal-400 tracking-widest uppercase bg-teal-500/5 px-2 py-0.5 rounded-full border border-teal-500/20">
                  Growth Ratios
                </span>
              </div>
              <div className="mt-4">
                {formatAdviceText(advice.investment_suggestion)}
              </div>
            </div>
            <div className="mt-6 pt-4 border-t border-bank-cardBorder/60 flex items-center justify-between text-xs text-bank-textMuted font-semibold">
              <span>Suggested Vehicles</span>
              <span className="text-teal-400 font-bold">HYSA, Index Funds, ETFs</span>
            </div>
          </div>
        )}

      </div>

      {/* NEW FEATURE: Follow-up Financial Chatbot */}
      <div className="glass-panel p-6 sm:p-8 space-y-4">
        <h3 className="text-lg font-bold text-bank-textActive flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-emerald-400" /> Chat with your AI Financial Advisor
        </h3>
        <p className="text-xs text-bank-textMuted">
          Got follow-up questions? Ask details like "How can I reduce my food costs?", "Should I pay off debt or save?", or "Suggest a Vanguard index fund."
        </p>

        {/* Chatbox Container */}
        <div className="border border-bank-cardBorder/80 rounded-2xl overflow-hidden bg-bank-bg/50 flex flex-col h-[350px]">
          {/* Scrollable messages panel */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4 scrollbar-thin">
            {chatMessages.map((msg, index) => {
              const isUser = msg.role === 'user';
              return (
                <div 
                  key={index} 
                  className={`flex items-start gap-2.5 max-w-[85%] ${isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
                >
                  {/* Chat Avatar */}
                  <div className={`p-1.5 rounded-xl border flex-shrink-0 ${
                    isUser 
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                      : 'bg-bank-cardBorder border-transparent text-bank-textActive'
                  }`}>
                    {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                  </div>

                  {/* Chat Bubble */}
                  <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    isUser 
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-tr-none font-medium' 
                      : 'bg-bank-card/80 text-bank-textMuted rounded-tl-none border border-bank-cardBorder/60'
                  }`}>
                    {msg.content.split('\n').map((line, lIdx) => {
                      const trimmedLine = line.trim();
                      if (trimmedLine.startsWith('-') || trimmedLine.startsWith('*')) {
                        const cleanText = trimmedLine.replace(/^[-*]\s*/, '');
                        return (
                          <div key={lIdx} className="flex items-start gap-2 my-1 text-bank-textActive">
                            <span className="text-emerald-400 mt-1.5 flex-shrink-0 text-[10px]">●</span>
                            <span>{cleanText}</span>
                          </div>
                        );
                      }
                      return <div key={lIdx} className={trimmedLine.length > 0 ? "mb-1" : "h-2"} >{line}</div>;
                    })}
                  </div>

                </div>
              );
            })}

            {chatLoading && (
              <div className="flex items-start gap-2.5 max-w-[85%] mr-auto">
                <div className="p-1.5 rounded-xl bg-bank-cardBorder text-bank-textActive flex-shrink-0">
                  <Bot className="w-4 h-4 animate-bounce" />
                </div>
                <div className="px-4 py-2.5 rounded-2xl rounded-tl-none bg-bank-card/80 text-bank-textMuted border border-bank-cardBorder/60 text-xs italic flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  Advisor is evaluating numbers...
                </div>
              </div>
            )}

            {chatError && (
              <div className="text-center p-2 text-xs text-rose-400 bg-rose-500/5 border border-rose-500/20 rounded-xl max-w-sm mx-auto">
                {chatError}
              </div>
            )}
            
            <div ref={chatEndRef} />
          </div>

          {/* Form Input Footer */}
          <form onSubmit={handleSendChatMessage} className="border-t border-bank-cardBorder/80 p-3 bg-bank-card/40 flex items-center gap-2">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Ask your follow-up financial question..."
              disabled={chatLoading}
              className="flex-1 bg-bank-bg/80 border border-bank-cardBorder hover:border-bank-cardBorder/80 focus:border-emerald-500/80 rounded-xl px-4 py-3 text-sm text-bank-textActive placeholder-bank-textMuted outline-none transition duration-150 disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={chatLoading || !chatInput.trim()}
              className="p-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white rounded-xl shadow-glow-emerald disabled:opacity-50 transition duration-150 flex items-center justify-center flex-shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>

      {/* Action Items List */}
      <div className="glass-panel p-6 sm:p-8 space-y-4">
        <h3 className="text-lg font-bold text-bank-textActive flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-emerald-400" /> Immediate Strategic Implementations
        </h3>
        <p className="text-sm text-bank-textMuted">
          Advisors highly recommend taking these procedural actions right away to optimize current status:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <div className="bg-bank-bg border border-bank-cardBorder p-4 rounded-xl flex flex-col justify-between">
            <div>
              <div className="text-xs text-bank-textMuted font-bold uppercase tracking-wider mb-1">Step 01</div>
              <div className="text-sm font-bold text-bank-textActive">Deploy Liquid Reserves</div>
              <p className="text-xs text-bank-textMuted mt-1 leading-normal">Setup automated savings transfers into a High-Yield Savings Account (HYSA).</p>
            </div>
            <a href="https://www.bankrate.com/banking/savings/best-high-yield-savings-accounts/" target="_blank" rel="noreferrer" className="text-xs font-bold text-emerald-400 hover:text-emerald-300 mt-4 flex items-center gap-1">
              Compare HYSAs <ArrowUpRight className="w-3 h-3" />
            </a>
          </div>
          <div className="bg-bank-bg border border-bank-cardBorder p-4 rounded-xl flex flex-col justify-between">
            <div>
              <div className="text-xs text-bank-textMuted font-bold uppercase tracking-wider mb-1">Step 02</div>
              <div className="text-sm font-bold text-bank-textActive">Consolidate Overhead</div>
              <p className="text-xs text-bank-textMuted mt-1 leading-normal">Filter monthly recurring subscriptions and trim food expenditures by 15%.</p>
            </div>
            <span className="text-xs font-semibold text-bank-textMuted mt-4 block">Calculated Savings: ₹8,000+/mo</span>
          </div>
          <div className="bg-bank-bg border border-bank-cardBorder p-4 rounded-xl flex flex-col justify-between">
            <div>
              <div className="text-xs text-bank-textMuted font-bold uppercase tracking-wider mb-1">Step 03</div>
              <div className="text-sm font-bold text-bank-textActive">Automate Investments</div>
              <p className="text-xs text-bank-textMuted mt-1 leading-normal">Establish a monthly deposit into low-cost Vanguard or Fidelity index mutual funds.</p>
            </div>
            <a href="https://investor.vanguard.com/" target="_blank" rel="noreferrer" className="text-xs font-bold text-emerald-400 hover:text-emerald-300 mt-4 flex items-center gap-1">
              Explore Vanguard Funds <ArrowUpRight className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>

    </div>
  );
}
