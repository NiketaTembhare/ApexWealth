import React, { useState, useEffect } from 'react';
import { getAdviceHistory } from '../services/api';
import { Clock, FileText, CheckCircle, AlertTriangle, ChevronRight, Activity } from 'lucide-react';

export default function HistoryView() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAdviceHistory().then(data => {
      setHistory(data || []);
      setLoading(false);
    }).catch(err => {
      console.error("Failed to load history:", err);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return <div className="p-10 text-center text-bank-textMuted">Loading history...</div>;
  }

  if (history.length === 0) {
    return (
      <div className="glass-panel p-16 text-center space-y-4">
        <Clock className="w-12 h-12 text-bank-textMuted mx-auto" />
        <p className="text-bank-textMuted font-semibold">No historical analyses found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="glass-panel-glow p-5 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-bank-textActive flex items-center gap-2">
            <Clock className="w-5 h-5 text-cyan-400" /> Historical Analysis
          </h2>
          <p className="text-xs text-bank-textMuted mt-0.5">Review your past financial intelligence reports</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {history.map((report) => (
          <div key={report.id} className="glass-panel p-5 flex flex-col md:flex-row gap-6 hover:border-cyan-500/30 transition group">
            
            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-bank-bg rounded-lg">
                  <FileText className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-bank-textActive">{report.filename || 'Financial Analysis'}</h3>
                  <p className="text-xs text-bank-textMuted">{new Date(report.generated_at).toLocaleString()}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-bank-bg border border-bank-cardBorder rounded-xl p-3">
                  <p className="text-[10px] text-bank-textMuted uppercase font-bold tracking-wider mb-1">Risk Score</p>
                  <p className={`text-xl font-black ${report.risk_score > 80 ? 'text-rose-400' : report.risk_score > 50 ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {report.risk_score || 0}%
                  </p>
                </div>
                <div className="bg-bank-bg border border-bank-cardBorder rounded-xl p-3">
                  <p className="text-[10px] text-bank-textMuted uppercase font-bold tracking-wider mb-1">Confidence</p>
                  <p className={`text-xl font-black ${report.confidence_score >= 90 ? 'text-emerald-400' : report.confidence_score >= 70 ? 'text-amber-400' : 'text-rose-400'}`}>
                    {report.confidence_score || 0}%
                  </p>
                </div>
              </div>

              <div className="bg-bank-bg/50 p-3 rounded-xl border border-bank-cardBorder/50">
                <p className="text-[10px] text-bank-textMuted uppercase font-bold tracking-wider mb-1 flex items-center gap-1">
                  <Activity className="w-3 h-3" /> Executive Summary
                </p>
                <p className="text-sm text-bank-textActive line-clamp-2">
                  {report.summary}
                </p>
              </div>
            </div>

            <div className="w-full md:w-64 flex flex-col justify-between border-t md:border-t-0 md:border-l border-bank-cardBorder pt-4 md:pt-0 md:pl-6 space-y-4">
              <div>
                <p className="text-[10px] text-bank-textMuted uppercase font-bold tracking-wider mb-2">Timeline Highlights</p>
                <div className="space-y-2">
                  {(report.timeline || []).slice(0, 3).map((t, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs">
                      <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-1.5 flex-shrink-0" />
                      <span className="text-bank-textActive line-clamp-1">{t.event || t.label || t.name || t.description || 'Event'}</span>
                    </div>
                  ))}
                  {report.timeline && report.timeline.length > 3 && (
                    <p className="text-[10px] text-bank-textMuted pl-3.5">+{report.timeline.length - 3} more events...</p>
                  )}
                </div>
              </div>
            </div>
            
          </div>
        ))}
      </div>
    </div>
  );
}
