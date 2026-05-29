import React, { useState, useCallback } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { uploadStatement, getSyntheticData, parseRawTransactions } from '../services/api';
import {
  Upload, FileText, Zap, CheckCircle, AlertCircle, ChevronRight,
  Brain, Cpu, Database, BarChart2, Edit2, RefreshCw, X
} from 'lucide-react';

const CATEGORIES = [
  'Food & Dining','Shopping','Entertainment','Travel','Fuel',
  'Rent','Utilities','SIP / MF','Investment','Healthcare',
  'Education','EMI','Salary','Uncategorized'
];

const AI_STATES = [
  { msg: 'Reading bank statement…', icon: FileText },
  { msg: 'Extracting transaction history…', icon: Database },
  { msg: 'Detecting spending behavior…', icon: Cpu },
  { msg: 'Generating financial profile…', icon: Brain },
  { msg: 'AI analysis complete ✓', icon: CheckCircle },
];

const CONFIDENCE_COLOR = (c) =>
  c >= 85 ? 'text-emerald-400' : c >= 65 ? 'text-amber-400' : 'text-red-400';

const STEPS = ['Upload', 'Analyzing', 'Preview', 'Categories', 'Dashboard'];

export default function BankStatementUpload({ onDataLoaded }) {
  const [step, setStep] = useState(0); // 0=upload 1=analyzing 2=preview 3=cats 4=done
  const [tab, setTab] = useState('file'); // file | manual
  const [dragOver, setDragOver] = useState(false);
  const [aiStateIdx, setAiStateIdx] = useState(0);
  const [parsed, setParsed] = useState(null); // full parse result from backend
  const [transactions, setTransactions] = useState([]);
  const [editIdx, setEditIdx] = useState(null);
  const [error, setError] = useState('');
  const [manualText, setManualText] = useState('');
  const [backendAvailable, setBackendAvailable] = useState(true);

  // ── Animate AI states ──────────────────────
  const runAIAnimation = (callback) => {
    setStep(1);
    setAiStateIdx(0);
    let idx = 0;
    const interval = setInterval(() => {
      idx++;
      setAiStateIdx(idx);
      if (idx >= AI_STATES.length - 1) {
        clearInterval(interval);
        setTimeout(callback, 500);
      }
    }, 750);
  };

  // ── Process result from backend ──────────────
  const handleResult = (result) => {
    setParsed(result);
    setTransactions(result.transactions || []);
    setStep(2);
  };

  // ── Upload to backend (PDF/CSV/Excel/TXT) ────
  const handleFile = useCallback(async (file) => {
    if (!file) return;
    setError('');
    const ext = file.name.split('.').pop().toLowerCase();
    const supported = ['pdf','csv','xlsx','xls','txt'];
    if (!supported.includes(ext)) {
      setError(`Unsupported format ".${ext}". Use: PDF, CSV, XLSX, XLS, TXT`);
      return;
    }

    runAIAnimation(async () => {
      try {
        // Try backend first (required for PDF)
        const result = await uploadStatement(file);
        handleResult(result);
        setBackendAvailable(true);
      } catch (e) {
        // Fallback: client-side for CSV/Excel only
        if (ext === 'csv') {
          const text = await file.text();
          clientParseCSV(text);
        } else if (ext === 'xlsx' || ext === 'xls') {
          const buf = await file.arrayBuffer();
          clientParseExcel(buf);
        } else {
          setStep(0);
          setError(ext === 'pdf'
            ? 'PDF parsing requires the backend server. Please start the backend and try again.'
            : `Parsing failed: ${e.message}`);
        }
      }
    });
  }, []);

  // ── Client-side CSV fallback ─────────────────
  const clientParseCSV = (text) => {
    const result = Papa.parse(text.trim(), {
      header: true, skipEmptyLines: true,
      transformHeader: h => h.trim(),
      transform: v => v.trim(),
    });
    const txns = (result.data || []).map(r => ({
      date: r.Date || r.date || '',
      description: r.Description || r.Narration || r.description || '',
      category: r.Category || r.category || 'Uncategorized',
      amount: parseFloat(r.Amount || r.amount || 0),
      type: r.Type || r.type || 'Debit',
      confidence: 80,
      recurring: false,
      source: 'csv',
    })).filter(t => t.amount > 0 && t.description);
    handleResult({ transactions: txns, total_count: txns.length, source_type: 'CSV (client)', avg_confidence: 80, parse_warnings: [], recurring_payments: [] });
  };

  // ── Client-side Excel fallback ───────────────
  const clientParseExcel = (buf) => {
    const wb = XLSX.read(buf, { type: 'array' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(ws, { defval: '' });
    const txns = data.map(r => ({
      date: String(r.Date || r.date || ''),
      description: String(r.Description || r.Narration || r.description || ''),
      category: String(r.Category || r.category || 'Uncategorized'),
      amount: parseFloat(r.Amount || r.amount || 0),
      type: String(r.Type || r.type || 'Debit'),
      confidence: 80, recurring: false, source: 'excel',
    })).filter(t => t.amount > 0 && t.description);
    handleResult({ transactions: txns, total_count: txns.length, source_type: 'Excel (client)', avg_confidence: 80, parse_warnings: [], recurring_payments: [] });
  };

  // ── Demo data from backend ───────────────────
  const loadDemo = () => {
    runAIAnimation(async () => {
      try {
        const result = await getSyntheticData();
        handleResult(result);
      } catch {
        // Fallback to client-side synthetic
        const { generateSyntheticTransactions } = await import('../utils/syntheticData');
        const txns = generateSyntheticTransactions(65000);
        handleResult({ transactions: txns, total_count: txns.length, source_type: 'Demo', avg_confidence: 92, parse_warnings: [], recurring_payments: [] });
      }
    });
  };

  // ── Manual text parse ────────────────────────
  const parseManual = async () => {
    if (!manualText.trim()) return;
    runAIAnimation(async () => {
      try {
        // Try to parse as CSV via backend
        const blob = new Blob([manualText], { type: 'text/plain' });
        const file = new File([blob], 'manual.txt', { type: 'text/plain' });
        const result = await uploadStatement(file);
        handleResult(result);
      } catch {
        clientParseCSV(manualText);
      }
    });
  };

  // ── Inline category edit ─────────────────────
  const updateCategory = (idx, cat) => {
    setTransactions(prev => prev.map((t, i) => i === idx ? { ...t, category: cat, confidence: 99 } : t));
    setEditIdx(null);
  };

  // ── Proceed to dashboard ─────────────────────
  const goToDashboard = () => {
    setStep(4);
    onDataLoaded(transactions);
  };

  const AiIcon = AI_STATES[aiStateIdx]?.icon || Brain;

  // ─────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────
  return (
    <div className="space-y-6 animate-fade-in">

      {/* Step indicator */}
      <div className="glass-panel-glow p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-bank-textActive flex items-center gap-2">
            <Upload className="w-5 h-5 text-cyan-400" /> AI Document Intelligence
          </h2>
          <p className="text-xs text-bank-textMuted mt-0.5">Upload PDF, CSV, Excel or paste transactions</p>
        </div>
        <div className="flex items-center gap-1">
          {STEPS.map((s, i) => (
            <React.Fragment key={s}>
              <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold transition-all ${
                i === Math.min(step, 4)
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                  : i < step ? 'text-emerald-400' : 'text-bank-textMuted'
              }`}>
                {i < step && i < 4 ? '✓' : i + 1} {s}
              </div>
              {i < 4 && <div className={`w-3 h-px ${i < step ? 'bg-emerald-400' : 'bg-bank-cardBorder'}`} />}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 px-5 py-4 bg-red-500/5 border border-red-500/20 rounded-2xl text-sm text-red-400 font-semibold">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={() => setError('')}><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* ── STEP 0: UPLOAD ── */}
      {step === 0 && (
        <div className="space-y-4">
          {/* Tabs */}
          <div className="flex gap-2">
            {[{ id: 'file', label: 'File Upload' }, { id: 'manual', label: 'Paste Text' }].map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`px-4 py-2 text-sm font-semibold rounded-xl transition border ${
                  tab === t.id ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400' : 'bg-bank-card/40 border-transparent text-bank-textMuted hover:text-white'
                }`}>
                {t.label}
              </button>
            ))}
            <button onClick={loadDemo}
              className="ml-auto px-4 py-2 text-xs font-bold bg-gradient-to-r from-purple-600 to-cyan-600 text-white rounded-xl hover:opacity-90 transition flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5" /> Load 6-Month Demo
            </button>
          </div>

          {tab === 'file' ? (
            <div
              className={`glass-panel p-12 flex flex-col items-center text-center border-2 border-dashed cursor-pointer transition-all ${
                dragOver ? 'border-cyan-400 bg-cyan-500/5 scale-[1.01]' : 'border-bank-cardBorder'
              }`}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }}
              onClick={() => document.getElementById('stmt-input').click()}
            >
              <input id="stmt-input" type="file" accept=".pdf,.csv,.xlsx,.xls,.txt" className="hidden"
                onChange={e => handleFile(e.target.files[0])} />
              <div className={`p-5 rounded-full mb-4 transition ${dragOver ? 'bg-cyan-500/20' : 'bg-bank-card/60'}`}>
                <Upload className={`w-10 h-10 ${dragOver ? 'text-cyan-400' : 'text-bank-textMuted'}`} />
              </div>
              <p className="text-base font-bold text-bank-textActive">Drag & Drop your bank statement</p>
              <div className="flex gap-2 mt-4 flex-wrap justify-center">
                {['PDF','CSV','XLSX','XLS','TXT'].map(f => (
                  <span key={f} className="px-3 py-1 bg-bank-bg border border-bank-cardBorder text-xs text-cyan-400 font-bold rounded-full">{f}</span>
                ))}
              </div>
              <p className="text-xs text-bank-textMuted mt-3">or click to browse · max 20 MB</p>
            </div>
          ) : (
            <div className="glass-panel p-6 space-y-4">
              <label className="block text-xs font-bold text-bank-textMuted uppercase tracking-wider">
                Paste CSV-formatted transactions (Date, Description, Category, Amount, Type)
              </label>
              <textarea rows={8} value={manualText} onChange={e => setManualText(e.target.value)}
                placeholder={`Date,Description,Category,Amount,Type\n2026-05-01,Salary Credit,Salary,65000,Credit\n2026-05-10,Swiggy Order,Food & Dining,350,Debit`}
                className="w-full bg-bank-bg/80 border border-bank-cardBorder focus:border-cyan-500/60 rounded-xl px-4 py-3 text-sm text-bank-textActive placeholder-bank-textMuted outline-none font-mono resize-none transition" />
              <button onClick={parseManual} disabled={!manualText.trim()}
                className="px-6 py-3 text-sm font-bold bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl disabled:opacity-50 flex items-center gap-2 hover:opacity-90 transition">
                Parse with AI <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── STEP 1: AI ANALYZING ── */}
      {step === 1 && (
        <div className="glass-panel p-16 flex flex-col items-center text-center space-y-6">
          <div className="relative w-24 h-24">
            <div className="absolute inset-0 rounded-full bg-cyan-500/10 animate-ping" />
            <div className="absolute inset-2 rounded-full bg-purple-500/10 animate-ping" style={{ animationDelay: '300ms' }} />
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-cyan-500/20 to-purple-600/20 border border-cyan-500/30 flex items-center justify-center">
              <AiIcon className="w-10 h-10 text-cyan-400 animate-pulse" />
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-xl font-bold text-bank-textActive">{AI_STATES[aiStateIdx]?.msg}</p>
            <p className="text-sm text-bank-textMuted">AI is reading your financial data</p>
          </div>
          <div className="w-64 h-1.5 bg-bank-bg rounded-full overflow-hidden border border-bank-cardBorder">
            <div className="h-full bg-gradient-to-r from-cyan-500 to-purple-600 rounded-full transition-all duration-700"
              style={{ width: `${((aiStateIdx + 1) / AI_STATES.length) * 100}%` }} />
          </div>
          <div className="flex gap-3 flex-wrap justify-center">
            {AI_STATES.map((s, i) => {
              const Icon = s.icon;
              return (
                <div key={i} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold border transition-all ${
                  i < aiStateIdx ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                  i === aiStateIdx ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400 animate-pulse' :
                  'bg-bank-bg border-bank-cardBorder text-bank-textMuted'
                }`}>
                  <Icon className="w-3 h-3" />
                  {i < aiStateIdx ? '✓' : s.msg.replace('…','').split(' ').slice(0,2).join(' ')}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── STEP 2: PREVIEW TABLE ── */}
      {step === 2 && parsed && (
        <div className="space-y-4">
          {/* Stats bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Transactions', value: parsed.total_count, color: 'text-cyan-400' },
              { label: 'Total Credits', value: `₹${(parsed.total_credits||0).toLocaleString('en-IN')}`, color: 'text-emerald-400' },
              { label: 'Total Debits', value: `₹${(parsed.total_debits||0).toLocaleString('en-IN')}`, color: 'text-rose-400' },
              { label: 'AI Confidence', value: `${parsed.avg_confidence||0}%`, color: 'text-purple-400' },
            ].map(s => (
              <div key={s.label} className="glass-panel p-3 text-center">
                <p className="text-[10px] text-bank-textMuted font-bold uppercase tracking-wider">{s.label}</p>
                <p className={`text-lg font-black mt-0.5 ${s.color}`}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* Warnings */}
          {parsed.parse_warnings?.length > 0 && (
            <div className="flex items-start gap-3 px-4 py-3 bg-amber-500/5 border border-amber-500/20 rounded-2xl text-xs text-amber-400">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">AI confidence low for {parsed.low_confidence_count || parsed.parse_warnings.length} transactions — review below</p>
                <p className="text-amber-400/70 mt-0.5">{parsed.parse_warnings.join(' · ')}</p>
              </div>
            </div>
          )}

          {/* Table */}
          <div className="glass-panel overflow-hidden">
            <div className="p-4 border-b border-bank-cardBorder flex items-center justify-between">
              <h4 className="text-sm font-bold text-bank-textActive">Extracted Transactions — Click category to edit</h4>
              <span className="text-xs text-bank-textMuted">{transactions.length} rows</span>
            </div>
            <div className="overflow-x-auto max-h-[380px] overflow-y-auto scrollbar-thin">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-bank-card/95 border-b border-bank-cardBorder">
                  <tr>
                    {['Date','Description','Category','Amount','Type','Confidence'].map(h => (
                      <th key={h} className="px-4 py-3 text-left font-bold text-bank-textMuted uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((t, i) => (
                    <tr key={i} className="border-b border-bank-cardBorder/20 hover:bg-bank-card/30 transition">
                      <td className="px-4 py-2.5 font-mono text-bank-textMuted">{t.date}</td>
                      <td className="px-4 py-2.5 text-bank-textActive max-w-[180px]">
                        <div className="truncate">{t.description}</div>
                        {t.recurring && <span className="text-[9px] text-purple-400 font-bold uppercase">● Recurring</span>}
                      </td>
                      <td className="px-4 py-2.5">
                        {editIdx === i ? (
                          <select autoFocus defaultValue={t.category}
                            onChange={e => updateCategory(i, e.target.value)}
                            onBlur={() => setEditIdx(null)}
                            className="bg-bank-bg border border-cyan-500/40 text-cyan-400 rounded-lg px-2 py-1 text-[10px] outline-none">
                            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                        ) : (
                          <button onClick={() => setEditIdx(i)}
                            className="flex items-center gap-1 px-2 py-1 bg-bank-bg border border-bank-cardBorder rounded-lg hover:border-cyan-500/40 hover:text-cyan-400 transition group">
                            <span>{t.category}</span>
                            <Edit2 className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition" />
                          </button>
                        )}
                      </td>
                      <td className="px-4 py-2.5 font-bold text-bank-textActive">₹{t.amount?.toLocaleString('en-IN')}</td>
                      <td className={`px-4 py-2.5 font-bold ${t.type === 'Credit' ? 'text-emerald-400' : 'text-rose-400'}`}>{t.type}</td>
                      <td className={`px-4 py-2.5 font-bold ${CONFIDENCE_COLOR(t.confidence||0)}`}>
                        {t.confidence||0}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={() => { setStep(0); setError(''); }} className="px-5 py-3 text-sm font-bold border border-bank-cardBorder text-bank-textMuted hover:text-white rounded-xl transition flex items-center gap-2">
              <RefreshCw className="w-4 h-4" /> Re-upload
            </button>
            <button onClick={() => setStep(3)} className="flex-1 py-3 text-sm font-bold bg-gradient-to-r from-cyan-500 to-purple-600 text-white rounded-xl hover:opacity-90 transition flex items-center justify-center gap-2">
              Review Categories <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 3: CATEGORY SUMMARY ── */}
      {step === 3 && parsed && (
        <div className="space-y-4">
          <div className="glass-panel p-6 space-y-4">
            <h3 className="text-sm font-bold text-bank-textActive flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-cyan-400" /> Detected Spending Categories
            </h3>
            <div className="space-y-3">
              {Object.entries(parsed.category_summary || {}).map(([cat, amt]) => {
                const total = parsed.total_debits || 1;
                const pct = Math.round((amt / total) * 100);
                return (
                  <div key={cat} className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-bank-textActive">{cat}</span>
                      <span className="text-bank-textMuted">₹{amt.toLocaleString('en-IN')} ({pct}%)</span>
                    </div>
                    <div className="h-2 bg-bank-bg rounded-full overflow-hidden border border-bank-cardBorder">
                      <div className="h-full bg-gradient-to-r from-cyan-500 to-purple-600 rounded-full transition-all duration-1000"
                        style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recurring payments */}
          {parsed.recurring_payments?.length > 0 && (
            <div className="glass-panel p-5 space-y-3">
              <h4 className="text-sm font-bold text-bank-textActive flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-purple-400" /> Recurring Payments Detected
              </h4>
              <p className="text-xs text-bank-textMuted">
                You have <strong className="text-purple-400">{parsed.recurring_payments.length} recurring payments</strong> costing{' '}
                <strong className="text-rose-400">₹{parsed.recurring_payments.reduce((s,r)=>s+r.monthly_cost,0).toLocaleString('en-IN')}/month</strong>
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {parsed.recurring_payments.slice(0,6).map((r,i) => (
                  <div key={i} className="flex items-center justify-between px-3 py-2 bg-bank-bg border border-bank-cardBorder rounded-xl">
                    <div>
                      <p className="text-xs font-bold text-bank-textActive truncate max-w-[140px]">{r.name}</p>
                      <p className="text-[9px] text-bank-textMuted">{r.category} · {r.count}x detected</p>
                    </div>
                    <span className="text-xs font-bold text-rose-400">₹{r.monthly_cost.toLocaleString('en-IN')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button onClick={goToDashboard}
            className="w-full py-4 text-sm font-bold bg-gradient-to-r from-cyan-500 to-purple-600 text-white rounded-xl hover:opacity-90 transition flex items-center justify-center gap-2">
            <BarChart2 className="w-5 h-5" /> Generate AI Dashboard
          </button>
        </div>
      )}
    </div>
  );
}
