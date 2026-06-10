import React from 'react';
import {
  FileText, ShieldAlert, ClipboardCheck, CheckCircle2,
  Calendar, Eye, HelpCircle, AlertTriangle, Database, Zap
} from 'lucide-react';

const SEVERITY_COLORS = {
    low: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
    medium: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
    high: 'bg-rose-500/10 border-rose-500/20 text-rose-400'
};

const ICON_MAP = {
    info: { icon: FileText, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
    anomaly: { icon: ShieldAlert, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
    compliance: { icon: ClipboardCheck, color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20' },
    success: { icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' }
};

export default function DetectiveTimeline({ timeline, confidenceScore, reasoning, isDemo }) {
  if (!timeline || timeline.length === 0) {
    return (
      <div className="glass-panel p-8 text-center space-y-3">
        <HelpCircle className="w-12 h-12 text-bank-textMuted mx-auto" />
        <p className="text-bank-textMuted font-semibold">No forensic investigation audit logs available.</p>
        <p className="text-xs text-bank-textMuted/60">Upload statement documents to run the boardroom audit.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Overview stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-panel p-5 flex flex-col justify-center">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] text-bank-textMuted font-bold uppercase tracking-wider">Forensic Audit Score</p>
            {/* Data source badge */}
            {isDemo ? (
              <div className="flex items-center gap-1.5 px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 rounded-full">
                <Zap className="w-2.5 h-2.5 text-amber-400" />
                <span className="text-[8px] font-bold text-amber-400 uppercase tracking-widest">Demo</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                <Database className="w-2.5 h-2.5 text-emerald-400" />
                <span className="text-[8px] font-bold text-emerald-400 uppercase tracking-widest">User Data</span>
              </div>
            )}
          </div>
          <div className="flex items-baseline gap-2">
            <span className={`text-4xl font-black ${confidenceScore >= 90 ? 'text-emerald-400' : 'text-amber-400'}`}>
              {confidenceScore}%
            </span>
            <span className="text-xs text-bank-textMuted font-semibold">Confidence Rating</span>
          </div>
        </div>
        
        <div className="md:col-span-2 glass-panel p-5">
          <p className="text-[10px] text-bank-textMuted font-bold uppercase tracking-wider flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" /> Lead Detective Reasoning Summary
          </p>
          <p className="text-xs text-bank-textMuted mt-2 leading-relaxed">
            {reasoning || "The multi-agent coordinator reviewed all transaction clusters and compiled the timeline below. Significant alerts have been flagged against SEBI/RBI risk metrics."}
          </p>
        </div>
      </div>

      {/* Vertical Timeline */}
      <div className="glass-panel p-6">
        <h3 className="text-sm font-bold text-bank-textActive mb-6 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-cyan-400" /> Chronological Case Files
        </h3>
        
        <div className="relative pl-6 border-l border-bank-cardBorder/60 space-y-8 ml-3">
          {timeline.map((item, idx) => {
            const style = ICON_MAP[item.type] || ICON_MAP.info;
            const ItemIcon = style.icon;
            
            return (
              <div key={idx} className="relative group animate-fade-in">
                {/* Connector point icon */}
                <div className={`absolute -left-[37px] top-1.5 p-1.5 rounded-full border ${style.bg} ${style.border} transition-transform duration-300 group-hover:scale-110 z-10 bg-bank-bg`}>
                  <ItemIcon className={`w-3.5 h-3.5 ${style.color}`} />
                </div>
                
                {/* Timeline Card */}
                <div className="glass-panel p-4 hover:border-cyan-500/30 transition-all duration-300 space-y-3 relative overflow-hidden">
                  {/* Decorative glowing gradient border */}
                  <div className={`absolute left-0 top-0 bottom-0 w-1 ${item.type === 'compliance' ? 'bg-rose-500' : item.type === 'anomaly' ? 'bg-amber-500' : item.type === 'success' ? 'bg-emerald-500' : 'bg-blue-500'}`} />
                  
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pl-2">
                    <span className="text-[10px] font-mono text-cyan-400 font-bold bg-cyan-500/5 px-2 py-0.5 rounded-md border border-cyan-500/10 self-start">
                      {item.date}
                    </span>
                    {item.severity && (
                      <span className={`text-[8px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border ${SEVERITY_COLORS[item.severity]}`}>
                        {item.severity} Severity
                      </span>
                    )}
                  </div>
                  
                  <div className="pl-2 space-y-1">
                    <h4 className="text-xs font-bold text-bank-textActive">{item.title}</h4>
                    <p className="text-xs text-bank-textMuted leading-relaxed">{item.description}</p>
                  </div>
                  
                  {item.evidence && (
                    <div className="pl-2 pt-2 border-t border-white/5 flex flex-col sm:flex-row sm:items-center gap-1.5 text-[10px] text-bank-textMuted">
                      <span className="font-bold text-bank-textActive flex items-center gap-1">
                        <Eye className="w-3 h-3 text-cyan-400" /> Evidence Logs:
                      </span>
                      <span className="font-mono text-cyan-400/80 bg-cyan-500/5 px-2 py-0.5 rounded border border-cyan-500/10 truncate max-w-full">
                        {item.evidence}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
