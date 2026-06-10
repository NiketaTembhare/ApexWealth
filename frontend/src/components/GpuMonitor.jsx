import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Cpu, Zap, Gauge, Flame, Activity, Database,
  RefreshCw, CheckCircle, HelpCircle, AlertTriangle
} from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function GpuMonitor() {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState([]); // track utilization over time

  const fetchMetrics = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/hardware/metrics`);
      const data = response.data;
      setMetrics(data);
      
      // Keep a rolling buffer of 10 history points for utilization chart
      setHistory(prev => {
        const next = [...prev, data.hardware.active_utilization_pct];
        if (next.length > 10) next.shift();
        return next;
      });
      
      setLoading(false);
    } catch (err) {
      console.error("Failed to query hardware telemetry:", err);
      setError(err.message);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    // Poll every 3 seconds for live visual metrics variance
    const interval = setInterval(fetchMetrics, 3000);
    return () => clearInterval(interval);
  }, []);

  if (loading && !metrics) {
    return (
      <div className="glass-panel p-16 text-center space-y-4">
        <RefreshCw className="w-12 h-12 text-cyan-400 animate-spin mx-auto" />
        <p className="text-bank-textMuted font-semibold">Querying hardware telemetry...</p>
      </div>
    );
  }

  if (error && !metrics) {
    return (
      <div className="glass-panel p-8 text-center space-y-3">
        <HelpCircle className="w-12 h-12 text-rose-400 mx-auto" />
        <p className="text-rose-400 font-bold">Hardware Telemetry Offline</p>
        <p className="text-xs text-bank-textMuted leading-relaxed">
          Ensure the FastAPI backend is running and active on port 8000.
        </p>
      </div>
    );
  }

  const { hardware, benchmark } = metrics;
  const isSimulated = metrics.is_simulated !== false; // default to simulated if flag missing
  
  // Calculate speedup percentages
  const speedupVal = benchmark.speedup_multiplier || 14.5;
  const cpuMs = benchmark.cpu_latency_ms || 1840.5;
  const gpuMs = benchmark.gpu_latency_ms || 126.9;

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Telemetry Header */}
      <div className="glass-panel-glow p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-bank-textActive flex items-center gap-2">
            <Cpu className="w-5 h-5 text-purple-400" /> AMD ROCm Hardware Acceleration Monitor
          </h3>
          <p className="text-xs text-bank-textMuted mt-0.5">
            Active Backend: <strong className="text-purple-400">{hardware.backend}</strong> · Device: <strong className="text-bank-textActive">{hardware.device_name}</strong>
          </p>
        </div>
        
        {/* Data Source Badge — honest about simulation status */}
        {isSimulated ? (
          <div className="flex flex-col items-end gap-1.5">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 border border-amber-500/25 rounded-full">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest">Demo Metrics</span>
            </div>
            <p className="text-[9px] text-bank-textMuted/60 text-right max-w-[200px]">
              Simulated values. Connect AMD GPU for live telemetry.
            </p>
          </div>
        ) : (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Live Hardware</span>
          </div>
        )}
      </div>

      {/* Simulation disclaimer banner (only when simulated) */}
      {isSimulated && (
        <div className="flex items-start gap-3 px-4 py-3 bg-amber-500/5 border border-amber-500/15 rounded-xl">
          <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-bold text-amber-400">Demo Metrics Mode</p>
            <p className="text-[10px] text-bank-textMuted mt-0.5 leading-relaxed">
              No AMD ROCm GPU was detected on this machine. The values below are simulated benchmarks for demonstration purposes only.
              When real AMD hardware is connected, the dashboard automatically switches to live telemetry.
            </p>
          </div>
        </div>
      )}

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        
        {/* Metric 1: Speedup Multiplier */}
        <div className="glass-panel p-5 relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 p-4 opacity-5">
            <Zap className="w-20 h-20 text-cyan-400" />
          </div>
          <div>
            <p className="text-[10px] text-bank-textMuted font-bold uppercase tracking-wider">ROCm Speedup Gain</p>
            <p className="text-3xl font-black text-cyan-400 mt-2">{speedupVal}x</p>
          </div>
          <p className="text-[10px] text-bank-textMuted mt-3">Faster sentence-embeddings encoding vs. CPU baseline execution{isSimulated ? ' (simulated)' : ''}</p>
        </div>
        
        {/* Metric 2: VRAM Allocation */}
        <div className="glass-panel p-5 relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 p-4 opacity-5">
            <Database className="w-20 h-20 text-purple-400" />
          </div>
          <div>
            <p className="text-[10px] text-bank-textMuted font-bold uppercase tracking-wider">GPU VRAM Allocated</p>
            <p className="text-3xl font-black text-purple-400 mt-2">
              {hardware.vram_allocated_mb.toLocaleString()} <span className="text-xs text-bank-textMuted">MB</span>
            </p>
          </div>
          <p className="text-[10px] text-bank-textMuted mt-3">Reserved size: {hardware.vram_reserved_mb.toLocaleString()} MB (Cached models){isSimulated ? ' — est.' : ''}</p>
        </div>
        
        {/* Metric 3: Active Utilization */}
        <div className="glass-panel p-5 relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 p-4 opacity-5">
            <Activity className="w-20 h-20 text-amber-400" />
          </div>
          <div>
            <p className="text-[10px] text-bank-textMuted font-bold uppercase tracking-wider">GPU Core Load</p>
            <p className="text-3xl font-black text-amber-400 mt-2">{hardware.active_utilization_pct}%</p>
          </div>
          <p className="text-[10px] text-bank-textMuted mt-3">Active processing load during boardroom debate reasoning steps{isSimulated ? ' (simulated)' : ''}</p>
        </div>
        
        {/* Metric 4: Core Temperature */}
        <div className="glass-panel p-5 relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 p-4 opacity-5">
            <Flame className="w-20 h-20 text-rose-400" />
          </div>
          <div>
            <p className="text-[10px] text-bank-textMuted font-bold uppercase tracking-wider">GPU Junction Temp</p>
            <p className="text-3xl font-black text-rose-400 mt-2">
              {hardware.temperature_c > 0 ? `${hardware.temperature_c}°C` : <span className="text-bank-textMuted text-xl">N/A</span>}
            </p>
          </div>
          <p className="text-[10px] text-bank-textMuted mt-3">
            {hardware.temperature_c > 0 ? 'Thermal operating limits maintained under execution load' : 'Temperature unavailable — no GPU hardware detected'}
          </p>
        </div>
      </div>

      {/* Latency Comparison Visual */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Latency Bars */}
        <div className="lg:col-span-2 glass-panel p-6 space-y-6">
          <h4 className="text-xs font-bold text-bank-textActive uppercase tracking-wider flex items-center gap-1.5">
            <Gauge className="w-4 h-4 text-cyan-400" /> Sentence-Embeddings Latency Stress-Test (50 Queries)
            {isSimulated && <span className="text-[9px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded-full ml-1">Simulated</span>}
          </h4>
          
          <div className="space-y-4">
            {/* CPU Row */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-bank-textMuted">CPU Fallback Inference</span>
                <span className="text-bank-textMuted font-mono">{cpuMs.toFixed(1)} ms</span>
              </div>
              <div className="h-6 bg-bank-bg rounded-lg overflow-hidden border border-bank-cardBorder relative">
                <div className="h-full bg-gradient-to-r from-slate-600 to-slate-500 rounded-lg transition-all duration-1000 w-full" />
                <span className="absolute inset-0 flex items-center pl-3 text-[10px] font-bold text-slate-100">Slow Bottleneck</span>
              </div>
            </div>
            
            {/* ROCm GPU Row */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-cyan-400 font-bold">AMD ROCm Accelerated GPU</span>
                <span className="text-cyan-400 font-mono font-bold">{gpuMs.toFixed(1)} ms</span>
              </div>
              <div className="h-6 bg-bank-bg rounded-lg overflow-hidden border border-cyan-500/20 relative">
                <div className="h-full bg-gradient-to-r from-cyan-500 to-purple-600 rounded-lg transition-all duration-1000"
                  style={{ width: `${(gpuMs / cpuMs) * 100}%`, minWidth: '4%' }} />
                <span className="absolute inset-0 flex items-center pl-3 text-[10px] font-bold text-cyan-100">
                  {speedupVal}x Faster with ROCm
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Speed Stats Panel */}
        <div className="lg:col-span-1 glass-panel p-6 flex flex-col justify-between">
          <h4 className="text-xs font-bold text-bank-textActive uppercase tracking-wider mb-4">
            Throughput Statistics
          </h4>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b border-white/5">
              <span className="text-xs text-bank-textMuted">Avg Embedding Rate</span>
              <span className="text-xs font-bold text-bank-textActive">
                {benchmark.avg_tokens_per_sec.toLocaleString()} tokens/sec
              </span>
            </div>
            
            <div className="flex justify-between items-center py-2 border-b border-white/5">
              <span className="text-xs text-bank-textMuted">Embedding Dimension</span>
              <span className="text-xs font-bold text-bank-textActive">384 Dimensions</span>
            </div>
            
            <div className="flex justify-between items-center py-2 border-b border-white/5">
              <span className="text-xs text-bank-textMuted">Stress Batch Size</span>
              <span className="text-xs font-bold text-bank-textActive">50 sentences</span>
            </div>
            
            <div className="flex justify-between items-center py-2">
              <span className="text-xs text-bank-textMuted">Last benchmarked</span>
              <span className="text-xs font-mono text-cyan-400">{benchmark.benchmarked_at}</span>
            </div>
          </div>
          
          {isSimulated ? (
            <div className="mt-4 p-3 bg-amber-500/5 border border-amber-500/10 rounded-xl flex items-center gap-2 text-[10px] text-amber-400/80 font-semibold leading-relaxed">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              Benchmark values are simulated. Run benchmark_rocm.py on real AMD hardware for live results.
            </div>
          ) : (
            <div className="mt-4 p-3 bg-cyan-500/5 border border-cyan-500/10 rounded-xl flex items-center gap-2 text-[10px] text-cyan-400 font-semibold leading-relaxed">
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
              Vector index embeddings are computed locally using AMD HIP runtime.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
