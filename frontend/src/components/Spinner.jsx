import React from 'react';
import { Landmark, TrendingUp, Sparkles, Brain } from 'lucide-react';

export default function Spinner() {
  return (
    <div className="fixed inset-0 bg-bank-bg/85 backdrop-blur-md flex flex-col items-center justify-center z-50 animate-fade-in">
      <div className="relative flex flex-col items-center max-w-sm px-6 text-center">
        
        {/* Animated Visual Core */}
        <div className="relative w-28 h-28 mb-8">
          {/* Glowing outer rings */}
          <div className="absolute inset-0 rounded-full border-4 border-emerald-500/10 border-t-emerald-500 animate-spin" />
          <div className="absolute inset-2 rounded-full border-4 border-blue-500/10 border-b-blue-400 animate-spin [animation-duration:1.5s]" />
          <div className="absolute inset-4 rounded-full border-2 border-slate-500/5 border-r-slate-300/30 animate-spin [animation-duration:3s]" />
          
          {/* Central floating bank node */}
          <div className="absolute inset-6 bg-gradient-to-br from-bank-card to-bank-bg rounded-full border border-bank-cardBorder flex items-center justify-center shadow-glow-emerald">
            <Landmark className="w-8 h-8 text-emerald-400 animate-pulse" />
          </div>
        </div>

        {/* Text descriptions */}
        <h3 className="text-xl font-bold text-bank-textActive mb-2 tracking-tight">
          Consulting AI Wealth Engine
        </h3>
        <p className="text-sm text-bank-textMuted leading-relaxed mb-6">
          Analyzing spending ratios, calculating savings rates, and structuring personalized wealth recommendations...
        </p>

        {/* Multi-step loading badges */}
        <div className="grid grid-cols-2 gap-2.5 w-full">
          <div className="bg-bank-card/50 border border-bank-cardBorder px-3 py-2 rounded-xl flex items-center gap-2 text-xs text-bank-textMuted justify-center shadow-inner">
            <Brain className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span>AI Reasoning</span>
          </div>
          <div className="bg-bank-card/50 border border-bank-cardBorder px-3 py-2 rounded-xl flex items-center gap-2 text-xs text-bank-textMuted justify-center shadow-inner">
            <TrendingUp className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
            <span>Growth Modeling</span>
          </div>
        </div>

      </div>
    </div>
  );
}
