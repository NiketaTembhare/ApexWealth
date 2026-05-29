import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Bot, User, Sparkles, ChevronDown } from 'lucide-react';
import { sendChatMessage } from '../services/api';

const SUGGESTED_PROMPTS = [
  'How can I save more?',
  'Where am I overspending?',
  'Can I invest this month?',
  'Analyze my spending',
  'How financially healthy am I?',
];

export default function FloatingChatbot({ financialData, advice, analytics }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "👋 Hi! I'm your AI Finance Coach. Ask me anything about your spending, savings, or investments!",
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const send = async (text) => {
    const userMsg = text || input.trim();
    if (!userMsg) return;
    setInput('');
    setError('');

    const updated = [...messages, { role: 'user', content: userMsg }];
    setMessages(updated);
    setLoading(true);

    try {
      if (financialData && advice) {
        // Use backend AI
        const historyPayload = updated.slice(0, -1).map(m => ({ role: m.role, content: m.content }));
        const res = await sendChatMessage({ financial_data: financialData, advice, history: historyPayload, message: userMsg });
        setMessages(prev => [...prev, { role: 'assistant', content: res.response }]);
      } else {
        // Fallback local response based on analytics
        const fallback = generateLocalResponse(userMsg, analytics);
        setTimeout(() => {
          setMessages(prev => [...prev, { role: 'assistant', content: fallback }]);
          setLoading(false);
        }, 800);
        return;
      }
    } catch (e) {
      setError('Could not reach AI advisor. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const generateLocalResponse = (msg, analytics) => {
    const m = msg.toLowerCase();
    if (!analytics) return "Please upload your bank statement first so I can analyze your finances!";

    if (m.includes('save') || m.includes('saving')) {
      return `Based on your data, your current savings rate is **${analytics.savingsRatio}%**.\n\n- Target: 20%+ of income\n- Potential monthly savings: ₹${Math.round(analytics.savings).toLocaleString('en-IN')}\n- Tip: Reduce top spending category by 15%`;
    }
    if (m.includes('spend') || m.includes('over')) {
      const top = analytics.categoryData?.[0];
      return top ? `Your biggest expense is **${top.name}** at ₹${top.value.toLocaleString('en-IN')}.\n\n- Try to reduce it by 10-15%\n- Set a monthly cap for this category\n- Use cashback apps for purchases` : 'Upload transactions to see spending breakdown.';
    }
    if (m.includes('invest')) {
      return `With your current savings of ₹${analytics.savings.toLocaleString('en-IN')}, here's my suggestion:\n\n- **40%** → SIP in Nifty 50 Index Fund\n- **30%** → FD or PPF for safety\n- **20%** → Mid-cap growth fund\n- **10%** → Keep as liquid cash\n\n*Disclaimer: Educational advice only.*`;
    }
    if (m.includes('health') || m.includes('score')) {
      return `Your Financial Health Score is **${analytics.healthScore}/100**.\n\n${analytics.healthScore >= 70 ? '🟢 Great job! Keep maintaining this.' : analytics.healthScore >= 40 ? '🟡 You\'re doing okay but can improve. Focus on savings.' : '🔴 Needs attention. Reduce expenses and start SIPs.'}`;
    }
    return `I can help with:\n- Spending analysis\n- Savings tips\n- Investment advice\n- Financial health score\n\nYour total expenses this period: ₹${analytics.totalExpenses?.toLocaleString('en-IN') || 0}`;
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setOpen(o => !o)}
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 ${
          open
            ? 'bg-bank-card border border-bank-cardBorder text-bank-textMuted rotate-0'
            : 'bg-gradient-to-br from-cyan-500 to-purple-600 text-white hover:scale-110 animate-float'
        }`}
        title="AI Finance Assistant"
      >
        {open ? <ChevronDown className="w-6 h-6" /> : <MessageSquare className="w-6 h-6" />}
        {!open && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-400 rounded-full border-2 border-bank-bg animate-ping" />
        )}
      </button>

      {/* Chat Popup */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-80 sm:w-96 shadow-2xl animate-slide-up">
          <div className="glass-panel overflow-hidden flex flex-col" style={{ height: 460 }}>

            {/* Header */}
            <div className="p-4 bg-gradient-to-r from-cyan-600/20 to-purple-600/20 border-b border-bank-cardBorder flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-gradient-to-br from-cyan-500 to-purple-600 rounded-xl">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-xs font-bold text-bank-textActive">AI Finance Coach</p>
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[9px] text-emerald-400 font-bold">Online</span>
                  </div>
                </div>
              </div>
              <button onClick={() => setOpen(false)} className="text-bank-textMuted hover:text-white transition p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-thin">
              {messages.map((msg, i) => {
                const isUser = msg.role === 'user';
                return (
                  <div key={i} className={`flex items-end gap-2 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
                    <div className={`flex-shrink-0 p-1.5 rounded-xl border ${isUser ? 'bg-cyan-500/10 border-cyan-500/30' : 'bg-bank-card border-bank-cardBorder'}`}>
                      {isUser ? <User className="w-3 h-3 text-cyan-400" /> : <Bot className="w-3 h-3 text-bank-textActive" />}
                    </div>
                    <div className={`px-3 py-2 rounded-2xl text-xs leading-relaxed max-w-[80%] ${
                      isUser
                        ? 'bg-gradient-to-r from-cyan-600 to-purple-600 text-white rounded-br-none'
                        : 'bg-bank-card/80 text-bank-textMuted border border-bank-cardBorder rounded-bl-none'
                    }`}>
                      {msg.content.split('\n').map((line, li) => (
                        <span key={li} className="block">{line || '\u00A0'}</span>
                      ))}
                    </div>
                  </div>
                );
              })}

              {loading && (
                <div className="flex items-end gap-2">
                  <div className="flex-shrink-0 p-1.5 rounded-xl bg-bank-card border border-bank-cardBorder">
                    <Bot className="w-3 h-3 text-bank-textActive animate-bounce" />
                  </div>
                  <div className="px-4 py-3 rounded-2xl rounded-bl-none bg-bank-card/80 border border-bank-cardBorder flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-bank-textMuted animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-bank-textMuted animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-bank-textMuted animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}

              {error && <p className="text-[10px] text-red-400 text-center bg-red-500/5 border border-red-500/20 rounded-xl p-2">{error}</p>}
              <div ref={chatEndRef} />
            </div>

            {/* Suggested Prompts */}
            {messages.length <= 1 && (
              <div className="px-3 pb-2 flex gap-1.5 flex-wrap">
                {SUGGESTED_PROMPTS.map(p => (
                  <button
                    key={p}
                    onClick={() => send(p)}
                    className="px-2.5 py-1 text-[9px] font-semibold bg-bank-bg border border-bank-cardBorder text-bank-textMuted hover:text-cyan-400 hover:border-cyan-500/30 rounded-full transition"
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            <form onSubmit={(e) => { e.preventDefault(); send(); }} className="p-3 border-t border-bank-cardBorder flex gap-2">
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Ask your AI advisor..."
                disabled={loading}
                className="flex-1 bg-bank-bg border border-bank-cardBorder focus:border-cyan-500/60 rounded-xl px-3 py-2 text-xs text-bank-textActive placeholder-bank-textMuted outline-none transition"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="p-2.5 bg-gradient-to-r from-cyan-500 to-purple-600 text-white rounded-xl disabled:opacity-50 hover:opacity-90 transition flex-shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
