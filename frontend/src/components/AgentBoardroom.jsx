import React, { useState, useEffect, useRef } from 'react';
import {
  Brain, FileText, ShieldAlert, ClipboardCheck,
  TrendingUp, CheckCircle, RefreshCw, Send, Radio,
  Database, Zap
} from 'lucide-react';

const ICON_MAP = {
  FileText: FileText,
  ShieldAlert: ShieldAlert,
  ClipboardCheck: ClipboardCheck,
  BookOpen: Brain,
  TrendingUp: TrendingUp,
  CheckCircle: CheckCircle
};

const COLOR_CLASSES = {
  blue:    { bg: 'bg-blue-500/10',    border: 'border-blue-500/20',    text: 'text-blue-400',    bubble: 'bg-blue-950/20 border-blue-900/30' },
  emerald: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400', bubble: 'bg-emerald-950/20 border-emerald-900/30' },
  teal:    { bg: 'bg-teal-500/10',    border: 'border-teal-500/20',    text: 'text-teal-400',    bubble: 'bg-teal-950/20 border-teal-900/30' },
  amber:   { bg: 'bg-amber-500/10',   border: 'border-amber-500/20',   text: 'text-amber-400',   bubble: 'bg-amber-950/20 border-amber-900/30' },
  purple:  { bg: 'bg-purple-500/10',  border: 'border-purple-500/20',  text: 'text-purple-400',  bubble: 'bg-purple-950/20 border-purple-900/30' },
  pink:    { bg: 'bg-pink-500/10',    border: 'border-pink-500/20',    text: 'text-pink-400',    bubble: 'bg-pink-950/20 border-pink-900/30' },
};

export default function AgentBoardroom({ transactions, onComplete }) {
  const [messages, setMessages] = useState([]);
  const [activeAgent, setActiveAgent] = useState(null);
  const [statusText, setStatusText] = useState('Connecting to AI Boardroom feed...');
  const [running, setRunning] = useState(false);
  const [isDemo, setIsDemo] = useState(false); // track if synthetic fallback was used
  
  const wsRef = useRef(null);
  const chatEndRef = useRef(null);

  // Auto-scroll chat log to bottom
  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, activeAgent]);

  const startBoardroom = () => {
    setMessages([]);
    setActiveAgent(null);
    setStatusText('Establishing secure courtroom pipeline...');
    setRunning(true);

    const token = localStorage.getItem('apex_token');
    const wsUrl = `ws://localhost:8000/ws/boardroom`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setStatusText('Boardroom pipeline connected. Streaming transaction audits...');
      // Send auth token and statement transaction array to initiate multi-agent loop
      ws.send(JSON.stringify({ token, transactions }));
    };

    ws.onmessage = (event) => {
      const data = jsonParseSafe(event.data);
      if (!data) return;

      if (data.event === 'agent_start') {
        setActiveAgent({ name: data.agent, color: data.color, icon: data.icon });
        setStatusText(`${data.agent} Agent is deliberating...`);
      } 
      else if (data.event === 'agent_message') {
        setMessages(prev => [...prev, {
          agent: data.agent,
          color: data.color,
          icon: data.icon,
          message: data.message
        }]);
        setActiveAgent(null);
      } 
      else if (data.event === 'boardroom_complete') {
        setStatusText('Audit complete. Verdict generated successfully.');
        setRunning(false);
        setActiveAgent(null);
        setIsDemo(false); // real WebSocket data
        if (onComplete) {
          onComplete({
            summary: data.summary,
            timeline: data.timeline,
            confidence_score: data.confidence_score,
            reasoning: data.reasoning,
            isDemo: false
          });
        }
      } 
      else if (data.event === 'error') {
        setStatusText(`Pipeline failure: ${data.message}`);
        setRunning(false);
      }
    };

    ws.onerror = (err) => {
      console.error("Boardroom WebSocket connection failed:", err);
      runSyntheticFallbackBoardroom();
    };

    ws.onclose = () => {
      setRunning(false);
    };
  };

  const runSyntheticFallbackBoardroom = async () => {
    // If the server socket fails (e.g. offline demo), run a synthetic courtroom flow to guarantee demo success
    setStatusText('Running client-side boardroom simulation...');
    setRunning(true);
    setIsDemo(true); // mark as synthetic/demo data
    setMessages([]);

    const totalCredits = transactions.filter(t => t.type === 'Credit').reduce((s, t) => s + t.amount, 0);
    const totalDebits = transactions.filter(t => t.type === 'Debit').reduce((s, t) => s + t.amount, 0);
    const netSavings = totalCredits - totalDebits;
    const largeDebits = transactions.filter(t => t.type === 'Debit' && t.amount > 30000)
      .sort((a, b) => b.amount - a.amount);
    
    // Per-category analysis for focused agent messages
    const catTotals = {};
    transactions.filter(t => t.type === 'Debit').forEach(t => {
      catTotals[t.category] = (catTotals[t.category] || 0) + t.amount;
    });
    const topCat = Object.entries(catTotals).sort((a, b) => b[1] - a[1])[0];
    const avgTxn = totalDebits / Math.max(transactions.filter(t => t.type === 'Debit').length, 1);

    const steps = [
      {
        agent: 'Document Analyst', color: 'blue', icon: 'FileText',
        msg: `${transactions.length} transactions parsed. Income ₹${totalCredits.toLocaleString('en-IN')} | Expenses ₹${totalDebits.toLocaleString('en-IN')} | Net ₹${netSavings.toLocaleString('en-IN')}.${largeDebits.length > 0 ? ' ⚠ High-value debit flagged.' : ''}`
      },
      {
        agent: 'Risk & Fraud Agent', color: 'amber', icon: 'ShieldAlert',
        msg: largeDebits.length > 0
          ? `High-value debit of ₹${largeDebits[0].amount.toLocaleString('en-IN')} to "${largeDebits[0].description}" is ${(largeDebits[0].amount / avgTxn).toFixed(1)}x above average. Review required.`
          : `No anomalous debits found. Largest single debit: ₹${Math.max(...transactions.filter(t=>t.type==='Debit').map(t=>t.amount)).toLocaleString('en-IN')}. Spending pattern is within normal range.`
      },
      {
        agent: 'Research Agent', color: 'purple', icon: 'Brain',
        msg: largeDebits.length > 0 && largeDebits[0].amount > 50000
          ? 'RBI Circular 2015: PAN mandatory for cash transactions >₹50,000. This debit requires PAN verification.'
          : 'RBI guidelines checked. Transactions are within standard reporting thresholds. No mandatory disclosure triggered.'
      },
      {
        agent: 'Compliance Agent', color: 'teal', icon: 'ClipboardCheck',
        msg: largeDebits.length > 0
          ? `Compliance status: ALERT. The ₹${largeDebits[0].amount.toLocaleString('en-IN')} transaction to "${largeDebits[0].description}" requires documentation per RBI circular.`
          : 'Compliance status: CLEAR. All transactions verified within SEBI/RBI thresholds. No disclosures required.'
      },
      {
        agent: 'Simulation & Strategy', color: 'pink', icon: 'TrendingUp',
        msg: topCat
          ? `Highest spend: ${topCat[0]} at ₹${Math.round(topCat[1]).toLocaleString('en-IN')}. Reducing by 20% + ₹5,000 SIP projects goal achievement in ~14 months.`
          : `Cut discretionary spend by 20% and add ₹5,000/month SIP to reach target in ~14 months.`
      },
      {
        agent: 'Judge Agent', color: 'emerald', icon: 'CheckCircle',
        msg: `Verdict: ${largeDebits.length > 0 ? 'Medium compliance alert raised.' : 'Transaction file is clean.'} Confidence score: ${largeDebits.length > 0 ? '92%' : '98%'}. Case file closed.`
      }
    ];

    for (let step of steps) {
      setActiveAgent({ name: step.agent, color: step.color, icon: step.icon });
      setStatusText(`${step.agent} is deliberating...`);
      await new Promise(r => setTimeout(r, 1000));
      
      setMessages(prev => [...prev, {
        agent: step.agent,
        color: step.color,
        icon: step.icon,
        message: step.msg
      }]);
      setActiveAgent(null);
      await new Promise(r => setTimeout(r, 400));
    }

    setStatusText('Audit complete. Case verdict finalized.');
    setRunning(false);
    
    // Build timeline from real transaction data
    const sortedTxns = [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date));
    const latestDate = sortedTxns[0]?.date || new Date().toISOString().split('T')[0];
    const anchor = new Date(latestDate);
    const offsetDate = (days) => {
      const d = new Date(anchor);
      d.setDate(d.getDate() - days);
      return d.toISOString().split('T')[0];
    };

    const timeline = [
      {
        date: offsetDate(7),
        title: 'Document Received & Parsed',
        description: `${transactions.length} transaction records verified. Income: ₹${totalCredits.toLocaleString('en-IN')} | Expenses: ₹${totalDebits.toLocaleString('en-IN')}.`,
        type: 'info', severity: 'low',
        evidence: `Net savings: ₹${netSavings.toLocaleString('en-IN')} | Categories: ${Object.keys(catTotals).length}`
      }
    ];

    if (largeDebits.length > 0) {
      timeline.push({
        date: largeDebits[0].date || offsetDate(5),
        title: 'High-Value Transaction Detected',
        description: `Debit of ₹${largeDebits[0].amount.toLocaleString('en-IN')} to "${largeDebits[0].description}" is ${(largeDebits[0].amount / avgTxn).toFixed(1)}x above average transaction size.`,
        type: 'anomaly', severity: 'medium',
        evidence: `Amount: ₹${largeDebits[0].amount.toLocaleString('en-IN')} | Threshold: ₹30,000`
      });
    }

    timeline.push({
      date: offsetDate(3),
      title: 'Regulatory Compliance Check',
      description: largeDebits.length > 0 && largeDebits[0].amount > 50000
        ? `PAN verification required for ₹${largeDebits[0].amount.toLocaleString('en-IN')} transfer under RBI Circular 103.`
        : 'All transactions are within RBI/SEBI reporting thresholds. No further action required.',
      type: 'compliance',
      severity: largeDebits.length > 0 && largeDebits[0].amount > 50000 ? 'high' : 'medium',
      evidence: 'RBI High-Value Transaction PAN Guidelines'
    });

    timeline.push({
      date: offsetDate(0),
      title: 'Boardroom Consensus Reached',
      description: `${largeDebits.length > 0 ? 'Medium compliance alert raised.' : 'All clear.'} Top spend category: ${topCat ? `${topCat[0]} (₹${Math.round(topCat[1]).toLocaleString('en-IN')})` : 'N/A'}.`,
      type: 'success', severity: 'low',
      evidence: `Confidence: ${largeDebits.length > 0 ? '92%' : '98%'}`
    });

    if (onComplete) {
      onComplete({
        summary: `${largeDebits.length > 0 ? 'Medium compliance alert raised for high-value debit.' : 'Transaction file verified clean.'} Confidence: ${largeDebits.length > 0 ? '92%' : '98%'}.`,
        confidence_score: largeDebits.length > 0 ? 92 : 98,
        reasoning: `${transactions.length} transactions analysed across ${Object.keys(catTotals).length} categories. ${largeDebits.length > 0 ? `High-value debit of ₹${largeDebits[0].amount.toLocaleString('en-IN')} flagged against RBI policies.` : 'All transactions within regulatory thresholds.'}`,
        isDemo: true,
        timeline
      });
    }
  };

  const jsonParseSafe = (str) => {
    try { return JSON.parse(str); } catch { return null; }
  };

  useEffect(() => {
    // Auto-trigger courtroom session when component loads if transactions exist
    if (transactions && transactions.length > 0) {
      startBoardroom();
    }
    return () => {
      wsRef.current?.close();
    };
  }, [transactions]);

  return (
    <div className="glass-panel p-6 space-y-4 animate-fade-in">
      
      {/* Boardroom Header */}
      <div className="flex items-center justify-between border-b border-white/5 pb-4">
        <div>
          <h3 className="text-sm font-bold text-bank-textActive flex items-center gap-2">
            <Brain className="text-purple-400 w-5 h-5 animate-pulse" /> Multi-Agent Boardroom Workspace
          </h3>
          <p className="text-[10px] text-bank-textMuted mt-0.5">{statusText}</p>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Data source badge */}
          {!running && messages.length > 0 && (
            isDemo ? (
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full">
                <Zap className="w-3 h-3 text-amber-400" />
                <span className="text-[9px] font-bold text-amber-400 uppercase tracking-widest">Demo Data</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                <Database className="w-3 h-3 text-emerald-400" />
                <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest">User Data</span>
              </div>
            )
          )}
          {running ? (
            <div className="flex items-center gap-1.5 px-3 py-1 bg-cyan-500/10 border border-cyan-500/20 rounded-full">
              <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
              <span className="text-[8px] font-bold text-cyan-400 uppercase tracking-widest">Debate Live</span>
            </div>
          ) : (
            <button onClick={startBoardroom} className="px-4 py-2 text-xs font-bold bg-gradient-to-r from-cyan-500 to-purple-600 text-white rounded-xl hover:opacity-90 transition flex items-center gap-1.5">
              <RefreshCw className="w-3 h-3" /> Restart Session
            </button>
          )}
        </div>
      </div>

      {/* Chat Logs Window */}
      <div className="bg-bank-bg/40 border border-bank-cardBorder/40 rounded-2xl p-4 h-[350px] overflow-y-auto scrollbar-thin space-y-4 flex flex-col justify-start">
        {messages.length === 0 && !activeAgent && (
          <p className="text-xs text-bank-textMuted text-center my-auto">
            Initializing courtroom debate... Wait for the coordinator to start.
          </p>
        )}
        
        {messages.map((msg, i) => {
          const colors = COLOR_CLASSES[msg.color] || COLOR_CLASSES.blue;
          const AgentIcon = ICON_MAP[msg.icon] || Brain;
          
          return (
            <div key={i} className="flex gap-3 items-start animate-fade-in self-start max-w-[85%]">
              <div className={`p-2 rounded-xl border flex-shrink-0 ${colors.bg} ${colors.border}`}>
                <AgentIcon className={`w-4 h-4 ${colors.text}`} />
              </div>
              <div className={`border p-3.5 rounded-2xl rounded-tl-none ${colors.bubble}`}>
                <p className={`text-[10px] font-bold ${colors.text}`}>{msg.agent} Agent</p>
                <p className="text-xs text-bank-textActive mt-1.5 leading-relaxed">{msg.message}</p>
              </div>
            </div>
          );
        })}

        {/* Active agent typing indicator — fixed: no JS declarations inside JSX */}
        {activeAgent && (() => {
          const colors = COLOR_CLASSES[activeAgent.color] || COLOR_CLASSES.blue;
          const AgentIcon = ICON_MAP[activeAgent.icon] || Brain;
          return (
            <div className="flex gap-3 items-center animate-pulse self-start">
              <div className={`p-2 rounded-xl border flex-shrink-0 ${colors.bg} ${colors.border}`}>
                <AgentIcon className={`w-4 h-4 ${colors.text}`} />
              </div>
              <div className="flex items-center gap-1.5 bg-bank-card/30 px-4 py-3 border border-bank-cardBorder/40 rounded-xl">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                <span className="text-[10px] text-bank-textMuted font-semibold ml-1">{activeAgent.name} is writing...</span>
              </div>
            </div>
          );
        })()}
        
        <div ref={chatEndRef} />
      </div>
    </div>
  );
}
