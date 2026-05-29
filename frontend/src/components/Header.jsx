import React, { useEffect, useState } from 'react';
import { Landmark, ShieldCheck, RefreshCw, Cpu } from 'lucide-react';
import { checkBackendHealth } from '../services/api';

export default function Header() {
  const [status, setStatus] = useState({ online: false, checking: true });

  const verifyHealth = async () => {
    setStatus(prev => ({ ...prev, checking: true }));
    const health = await checkBackendHealth();
    if (health.status === 'healthy') {
      setStatus({ online: true, checking: false });
    } else {
      setStatus({ online: false, checking: false });
    }
  };

  useEffect(() => {
    verifyHealth();
    // Poll health status every 30 seconds
    const interval = setInterval(verifyHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="border-b border-bank-cardBorder bg-bank-card/40 backdrop-blur-md sticky top-0 z-40 transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        
        {/* Brand/Logo */}
        <div className="flex items-center gap-3 group">
          <div className="bg-gradient-to-tr from-emerald-500 to-blue-600 p-2.5 rounded-xl shadow-glow-emerald group-hover:scale-105 transition-transform duration-300">
            <Landmark className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-xl tracking-tight bg-gradient-to-r from-white via-slate-100 to-emerald-400 bg-clip-text text-transparent">
                ApexWealth
              </span>
              <span className="text-[10px] font-bold tracking-wider text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded-full bg-emerald-500/5">
                AI ADVANCED
              </span>
            </div>
            <p className="text-xs text-bank-textMuted font-medium">Personalized Financial Intelligence</p>
          </div>
        </div>

        {/* Navigation & Status */}
        <div className="flex items-center gap-6">
          <div className="hidden md:flex items-center gap-5 text-sm font-medium text-bank-textMuted">
            <span className="hover:text-bank-textActive cursor-pointer transition-colors">Portfolios</span>
            <span className="hover:text-bank-textActive cursor-pointer transition-colors">Markets</span>
            <span className="hover:text-bank-textActive cursor-pointer transition-colors">Advisory</span>
          </div>

          {/* Connection status indicator */}
          <div className="flex items-center gap-2 bg-bank-bg/80 border border-bank-cardBorder px-3.5 py-1.5 rounded-full text-xs font-semibold shadow-inner">
            {status.checking ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 text-blue-400 animate-spin" />
                <span className="text-blue-400">Verifying Nodes...</span>
              </>
            ) : status.online ? (
              <>
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Gemini Core Active</span>
              </>
            ) : (
              <>
                <Cpu className="w-3.5 h-3.5 text-bank-danger animate-pulse" />
                <span className="text-bank-danger">Backend Offline</span>
              </>
            )}
          </div>
        </div>

      </div>
    </header>
  );
}
