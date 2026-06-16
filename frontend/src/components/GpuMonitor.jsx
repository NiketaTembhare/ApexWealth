import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Cpu, Zap, Gauge, Flame, Activity, Database,
  RefreshCw, CheckCircle, HelpCircle, AlertTriangle,
  Clock, Eye, Terminal, PlayCircle, Coins
} from 'lucide-react';

import { API_BASE_URL } from '../services/api';

export default function GpuMonitor() {
  const [activeTab, setActiveTab] = useState('hardware'); // 'hardware' | 'observatory'
  
  // Hardware metrics state
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState([]); // track utilization over time

  // Observatory metrics state
  const [sessions, setSessions] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [sessionDetails, setSessionDetails] = useState(null);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const fetchMetrics = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/hardware/metrics`);
      const data = response.data;
      setMetrics(data);
      
      setHistory(prev => {
        const next = [...prev, data.hardware.active_utilization_pct];
        if (next.length > 10) next.shift();
        return next;
      });
      
      setError(null);
    } catch (err) {
      console.error("Failed to query hardware telemetry:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchSessions = async () => {
    setLoadingSessions(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/agent-observatory/sessions`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('apex_token')}` }
      });
      setSessions(response.data);
      if (response.data.length > 0 && !selectedSessionId) {
        selectSession(response.data[0].analysis_session_id);
      }
    } catch (err) {
      console.error("Failed to fetch observatory sessions:", err);
    } finally {
      setLoadingSessions(false);
    }
  };

  const selectSession = async (sessionId) => {
    setSelectedSessionId(sessionId);
    setLoadingDetails(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/agent-observatory/${sessionId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('apex_token')}` }
      });
      setSessionDetails(response.data);
    } catch (err) {
      console.error("Failed to fetch session details:", err);
    } finally {
      setLoadingDetails(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (activeTab === 'observatory') {
      fetchSessions();
    }
  }, [activeTab]);

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* View Tabs */}
      <div className="flex border-b border-white/5 pb-0.5 gap-2">
        <button
          onClick={() => setActiveTab('hardware')}
          className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition flex items-center gap-1.5 ${
            activeTab === 'hardware'
              ? 'border-cyan-400 text-cyan-400'
              : 'border-transparent text-bank-textMuted hover:text-bank-textActive'
          }`}
        >
          <Cpu className="w-4 h-4" /> Hardware Telemetry
        </button>
        <button
          onClick={() => setActiveTab('observatory')}
          className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition flex items-center gap-1.5 ${
            activeTab === 'observatory'
              ? 'border-purple-400 text-purple-400'
              : 'border-transparent text-bank-textMuted hover:text-bank-textActive'
          }`}
        >
          <Eye className="w-4 h-4" /> Agent Observatory
        </button>
      </div>

      {/* RENDER HARDWARE TELEMETRY */}
      {activeTab === 'hardware' && (
        <div className="space-y-6 animate-fade-in">
          {loading && !metrics ? (
            <div className="glass-panel p-16 text-center space-y-4">
              <RefreshCw className="w-12 h-12 text-cyan-400 animate-spin mx-auto" />
              <p className="text-bank-textMuted font-semibold">Querying hardware telemetry...</p>
            </div>
          ) : error && !metrics ? (
            <div className="glass-panel p-8 text-center space-y-3">
              <HelpCircle className="w-12 h-12 text-rose-400 mx-auto" />
              <p className="text-rose-400 font-bold">Hardware Telemetry Offline</p>
              <p className="text-xs text-bank-textMuted leading-relaxed">
                Ensure the FastAPI backend is running and active on port 8000.
              </p>
            </div>
          ) : (
            <>
              {/* Telemetry Header */}
              <div className="glass-panel-glow p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold text-bank-textActive flex items-center gap-2">
                    <Cpu className="w-5 h-5 text-purple-400" /> AMD ROCm Hardware Acceleration Monitor
                  </h3>
                  <p className="text-xs text-bank-textMuted mt-0.5">
                    Active Backend: <strong className="text-purple-400">{metrics.hardware.backend}</strong> · Device: <strong className="text-bank-textActive">{metrics.hardware.device_name}</strong>
                  </p>
                </div>
                
                {metrics.is_simulated ? (
                  <div className="flex flex-col items-end gap-1.5">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 border border-amber-500/25 rounded-full">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                      <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest">Demo Metrics</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Live Hardware</span>
                  </div>
                )}
              </div>

              {/* Main Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="glass-panel p-5 relative overflow-hidden flex flex-col justify-between">
                  <div>
                    <p className="text-[10px] text-bank-textMuted font-bold uppercase tracking-wider">ROCm Speedup Gain</p>
                    <p className="text-3xl font-black text-cyan-400 mt-2">{metrics.benchmark.speedup_multiplier}x</p>
                  </div>
                  <p className="text-[10px] text-bank-textMuted mt-3">Faster embeddings encoding vs. CPU baseline</p>
                </div>
                
                <div className="glass-panel p-5 relative overflow-hidden flex flex-col justify-between">
                  <div>
                    <p className="text-[10px] text-bank-textMuted font-bold uppercase tracking-wider">GPU VRAM Allocated</p>
                    <p className="text-3xl font-black text-purple-400 mt-2">
                      {metrics.hardware.vram_allocated_mb.toLocaleString()} <span className="text-xs text-bank-textMuted">MB</span>
                    </p>
                  </div>
                  <p className="text-[10px] text-bank-textMuted mt-3">Reserved cache size: {metrics.hardware.vram_reserved_mb.toLocaleString()} MB</p>
                </div>
                
                <div className="glass-panel p-5 relative overflow-hidden flex flex-col justify-between">
                  <div>
                    <p className="text-[10px] text-bank-textMuted font-bold uppercase tracking-wider">GPU Core Load</p>
                    <p className="text-3xl font-black text-amber-400 mt-2">{metrics.hardware.active_utilization_pct}%</p>
                  </div>
                  <p className="text-[10px] text-bank-textMuted mt-3">Active processing load during boardroom debate reasoning</p>
                </div>
                
                <div className="glass-panel p-5 relative overflow-hidden flex flex-col justify-between">
                  <div>
                    <p className="text-[10px] text-bank-textMuted font-bold uppercase tracking-wider">GPU Junction Temp</p>
                    <p className="text-3xl font-black text-rose-400 mt-2">
                      {metrics.hardware.temperature_c > 0 ? `${metrics.hardware.temperature_c}°C` : <span className="text-bank-textMuted text-xl">N/A</span>}
                    </p>
                  </div>
                  <p className="text-[10px] text-bank-textMuted mt-3">Thermal operating limits maintained under load</p>
                </div>
              </div>

              {/* Latency Comparison */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 glass-panel p-6 space-y-6">
                  <h4 className="text-xs font-bold text-bank-textActive uppercase tracking-wider flex items-center gap-1.5">
                    <Gauge className="w-4 h-4 text-cyan-400" /> Sentence-Embeddings Latency Stress-Test (50 Queries)
                  </h4>
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-bank-textMuted">CPU Fallback Inference</span>
                        <span className="text-bank-textMuted font-mono">{metrics.benchmark.cpu_latency_ms.toFixed(1)} ms</span>
                      </div>
                      <div className="h-6 bg-bank-bg rounded-lg overflow-hidden border border-bank-cardBorder relative">
                        <div className="h-full bg-gradient-to-r from-slate-600 to-slate-500 rounded-lg w-full" />
                        <span className="absolute inset-0 flex items-center pl-3 text-[10px] font-bold text-slate-100 font-mono">Slow Bottleneck</span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-cyan-400 font-bold">AMD ROCm Accelerated GPU</span>
                        <span className="text-cyan-400 font-mono font-bold">{metrics.benchmark.gpu_latency_ms.toFixed(1)} ms</span>
                      </div>
                      <div className="h-6 bg-bank-bg rounded-lg overflow-hidden border border-cyan-500/20 relative">
                        <div className="h-full bg-gradient-to-r from-cyan-500 to-purple-600 rounded-lg"
                          style={{ width: `${(metrics.benchmark.gpu_latency_ms / metrics.benchmark.cpu_latency_ms) * 100}%`, minWidth: '4%' }} />
                        <span className="absolute inset-0 flex items-center pl-3 text-[10px] font-bold text-cyan-100 font-mono">
                          {metrics.benchmark.speedup_multiplier}x Faster with ROCm
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-1 glass-panel p-6 flex flex-col justify-between">
                  <h4 className="text-xs font-bold text-bank-textActive uppercase tracking-wider mb-4">Throughput Stats</h4>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center py-2 border-b border-white/5">
                      <span className="text-xs text-bank-textMuted">Avg Embedding Rate</span>
                      <span className="text-xs font-bold text-bank-textActive font-mono">{metrics.benchmark.avg_tokens_per_sec.toLocaleString()} tokens/sec</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-white/5">
                      <span className="text-xs text-bank-textMuted">Embedding Dimension</span>
                      <span className="text-xs font-bold text-bank-textActive font-mono">384 Dimensions</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-white/5">
                      <span className="text-xs text-bank-textMuted">Stress Batch Size</span>
                      <span className="text-xs font-bold text-bank-textActive font-mono">50 sentences</span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="text-xs text-bank-textMuted">Last Benchmarked</span>
                      <span className="text-xs font-mono text-cyan-400">{metrics.benchmark.benchmarked_at}</span>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* RENDER AGENT OBSERVATORY */}
      {activeTab === 'observatory' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 animate-fade-in">
          
          {/* Sessions List */}
          <div className="lg:col-span-1 glass-panel p-5 space-y-4 flex flex-col h-[550px]">
            <h4 className="text-xs font-bold text-bank-textActive uppercase tracking-wider flex items-center gap-1.5 border-b border-white/5 pb-3">
              <Terminal className="w-4 h-4 text-purple-400" /> Courtroom Debates
            </h4>
            
            <div className="flex-1 overflow-y-auto scrollbar-thin space-y-2 pr-1">
              {loadingSessions && sessions.length === 0 ? (
                <div className="text-center py-10">
                  <RefreshCw className="w-5 h-5 text-bank-textMuted animate-spin mx-auto" />
                  <p className="text-[10px] text-bank-textMuted mt-2">Loading sessions...</p>
                </div>
              ) : sessions.length === 0 ? (
                <p className="text-xs text-bank-textMuted text-center py-10">No sessions recorded yet. Run a boardroom debate first.</p>
              ) : (
                sessions.map((session) => (
                  <button
                    key={session.analysis_session_id}
                    onClick={() => selectSession(session.analysis_session_id)}
                    className={`w-full text-left p-3 rounded-xl border text-xs transition duration-200 ${
                      selectedSessionId === session.analysis_session_id
                        ? 'bg-purple-500/10 border-purple-500/30 text-purple-400 font-bold'
                        : 'bg-bank-bg/25 border-bank-cardBorder/30 text-bank-textMuted hover:border-white/10 hover:text-bank-textActive'
                    }`}
                  >
                    <p className="font-mono text-[10px] uppercase truncate">{session.analysis_session_id.replace('session_', 'ID: ')}</p>
                    <div className="flex justify-between items-center mt-2 text-[9px] text-bank-textMuted font-semibold">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {Math.round(session.total_duration_ms / 1000)}s</span>
                      <span className="flex items-center gap-1"><Coins className="w-3 h-3" /> {session.total_tokens.toLocaleString()} tokens</span>
                    </div>
                  </button>
                ))
              )}
            </div>
            
            <button onClick={fetchSessions} className="w-full py-2 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 rounded-lg text-[10px] font-bold uppercase transition flex items-center justify-center gap-1">
              <RefreshCw className="w-3 h-3" /> Sync History
            </button>
          </div>

          {/* Session Details */}
          <div className="lg:col-span-3 flex flex-col h-[550px] space-y-6 overflow-y-auto scrollbar-thin pr-1">
            {loadingDetails ? (
              <div className="glass-panel flex-1 flex flex-col items-center justify-center space-y-4">
                <RefreshCw className="w-10 h-10 text-purple-400 animate-spin" />
                <p className="text-xs text-bank-textMuted font-semibold">Fetching session telemetry...</p>
              </div>
            ) : !sessionDetails ? (
              <div className="glass-panel flex-1 flex flex-col items-center justify-center text-center p-8">
                <Eye className="w-12 h-12 text-bank-textMuted/40 mb-3" />
                <p className="text-xs text-bank-textActive font-bold">No Debate Session Selected</p>
                <p className="text-[10px] text-bank-textMuted mt-1">Select a debate run from the sidebar to inspect execution trace logs.</p>
              </div>
            ) : (
              <div className="space-y-6">
                
                {/* Session Header Card */}
                <div className="glass-panel-glow p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h3 className="text-sm font-bold text-bank-textActive flex items-center gap-2">
                      <PlayCircle className="w-4 h-4 text-purple-400" /> Active Session Details
                    </h3>
                    <p className="text-[10px] font-mono text-purple-400 mt-1 uppercase">
                      {sessionDetails.analysis_session_id}
                    </p>
                  </div>
                  <div className="flex gap-3 text-right">
                    <div>
                      <p className="text-[9px] text-bank-textMuted uppercase font-bold tracking-wider">Total Tokens</p>
                      <p className="text-base font-black text-cyan-400 font-mono mt-0.5">{sessionDetails.total_tokens.toLocaleString()}</p>
                    </div>
                    <div className="border-l border-white/5 pl-3">
                      <p className="text-[9px] text-bank-textMuted uppercase font-bold tracking-wider">Analysis Latency</p>
                      <p className="text-base font-black text-purple-400 font-mono mt-0.5">{(sessionDetails.total_duration_ms / 1000).toFixed(2)}s</p>
                    </div>
                  </div>
                </div>

                {/* Timeline Grid */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-bank-textActive uppercase tracking-wider">Agent Ingestion Timeline & Telemetry</h4>
                  
                  {sessionDetails.deliberations.map((d, i) => (
                    <div key={i} className="glass-panel p-4 space-y-3 border-l-2 hover:border-l-purple-500 transition duration-200">
                      
                      {/* Top metrics bar */}
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-white/5 pb-2.5">
                        <div>
                          <span className="text-xs font-bold text-bank-textActive">{d.agent_name}</span>
                          <span className="text-[9px] text-bank-textMuted ml-2 italic">({d.role})</span>
                        </div>
                        <div className="flex items-center gap-3 text-[10px] font-semibold text-bank-textMuted">
                          <span className="font-mono text-purple-400 truncate max-w-[150px]" title={d.model_name}>
                            {d.model_name}
                          </span>
                          <span className="border-l border-white/5 pl-2 font-mono flex items-center gap-1 text-cyan-400">
                            <Coins className="w-3.5 h-3.5" /> {d.total_tokens}
                          </span>
                          <span className="border-l border-white/5 pl-2 font-mono flex items-center gap-1 text-purple-400">
                            <Clock className="w-3.5 h-3.5" /> {d.execution_time_ms}ms
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase ${
                            d.status === 'completed' 
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25' 
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/25'
                          }`}>
                            {d.status}
                          </span>
                        </div>
                      </div>

                      {/* Speech bubble message content */}
                      <div className="bg-bank-bg/30 border border-bank-cardBorder/30 p-3 rounded-xl">
                        <p className="text-[11px] text-bank-textActive leading-relaxed font-sans">{d.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
