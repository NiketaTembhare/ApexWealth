import React, { useState, useEffect } from 'react';
import { 
  getAdviceHistory, 
  getSimulationHistory, 
  getBoardroomSessions, 
  getBoardroomSessionDetails,
  populateSampleHistory,
  deleteAdviceReport,
  deleteSimulation,
  deleteObservatorySession
} from '../services/api';
import { 
  Clock, FileText, CheckCircle, AlertTriangle, ChevronRight, 
  Activity, Sliders, Cpu, Zap, Brain, ShieldAlert, User, Bot, HelpCircle, RefreshCw, Trash2
} from 'lucide-react';

export default function HistoryView() {
  const [activeTab, setActiveTab] = useState('reports');
  const [reports, setReports] = useState([]);
  const [simulations, setSimulations] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);

  const handlePopulateSamples = async () => {
    setLoading(true);
    try {
      await populateSampleHistory();
      // Refetch all histories to refresh state
      const rep = await getAdviceHistory();
      setReports(rep || []);
      const sim = await getSimulationHistory();
      setSimulations(sim || []);
      const sess = await getBoardroomSessions();
      setSessions(sess || []);
    } catch (err) {
      console.error("Failed to populate mock history database:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteReport = async (e, reportId) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this wealth report from history?")) return;
    try {
      await deleteAdviceReport(reportId);
      setReports(prev => prev.filter(r => r.id !== reportId));
    } catch (err) {
      console.error("Failed to delete report:", err);
    }
  };

  const handleDeleteSimulation = async (e, simId) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this simulation run from history?")) return;
    try {
      await deleteSimulation(simId);
      setSimulations(prev => prev.filter(s => s.id !== simId));
    } catch (err) {
      console.error("Failed to delete simulation:", err);
    }
  };

  const handleDeleteSession = async (e, sessionId) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this courtroom session?")) return;
    try {
      await deleteObservatorySession(sessionId);
      setSessions(prev => prev.filter(s => s.analysis_session_id !== sessionId));
    } catch (err) {
      console.error("Failed to delete session:", err);
    }
  };

  const renderEmptyState = (title, description, icon) => {
    const EmptyIcon = icon || HelpCircle;
    return (
      <div className="glass-panel p-8 text-center max-w-xl mx-auto my-6 space-y-5 border border-dashed border-bank-cardBorder/80">
        <div className="p-3 bg-bank-bg rounded-full w-fit mx-auto border border-bank-cardBorder">
          <EmptyIcon className="w-8 h-8 text-cyan-400" />
        </div>
        <div className="space-y-2">
          <h4 className="text-sm font-bold text-bank-textActive">{title}</h4>
          <p className="text-xs text-bank-textMuted leading-relaxed">
            {description}
          </p>
        </div>
        
        <div className="pt-2">
          <button 
            onClick={handlePopulateSamples}
            disabled={loading}
            className="px-5 py-2.5 text-xs font-bold bg-gradient-to-r from-cyan-500 to-purple-600 hover:opacity-90 text-white rounded-xl transition-all shadow-md flex items-center gap-2 mx-auto disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Generate Sample History Logs</span>
          </button>
          <p className="text-[10px] text-bank-textMuted mt-2">
            This will populate your account database with realistic wealth assessments, Monte Carlo tests, and courtroom debates.
          </p>
        </div>
      </div>
    );
  };

  // Load active tab data
  useEffect(() => {
    setLoading(true);
    if (activeTab === 'reports') {
      getAdviceHistory()
        .then(data => {
          setReports(data || []);
          setLoading(false);
        })
        .catch(err => {
          console.error("Failed to load advice reports:", err);
          setLoading(false);
        });
    } else if (activeTab === 'simulations') {
      getSimulationHistory()
        .then(data => {
          setSimulations(data || []);
          setLoading(false);
        })
        .catch(err => {
          console.error("Failed to load simulations:", err);
          setLoading(false);
        });
    } else if (activeTab === 'boardroom') {
      getBoardroomSessions()
        .then(data => {
          setSessions(data || []);
          setLoading(false);
        })
        .catch(err => {
          console.error("Failed to load boardroom sessions:", err);
          setLoading(false);
        });
    }
  }, [activeTab]);

  const handleSelectSession = async (sessionId) => {
    setDetailLoading(true);
    try {
      const details = await getBoardroomSessionDetails(sessionId);
      setSelectedSession(details);
    } catch (err) {
      console.error("Failed to load boardroom session details:", err);
    } finally {
      setDetailLoading(false);
    }
  };

  const renderTabContent = () => {
    if (loading) {
      return <div className="p-10 text-center text-bank-textMuted animate-pulse">Loading history logs...</div>;
    }

    if (activeTab === 'reports') {
      return (
        <div className="space-y-4 animate-fade-in">
          <div className="glass-panel p-4 flex gap-3 items-center border border-purple-500/10 bg-purple-500/5">
            <FileText className="w-5 h-5 text-purple-400 flex-shrink-0" />
            <div>
              <h4 className="text-xs font-bold text-bank-textActive">Wealth Advisory Archives</h4>
              <p className="text-[10px] text-bank-textMuted mt-0.5">Permanent record of generated wealth audit reports. Useful for tracking your financial trajectory, risk score history, and active recommendations over time.</p>
            </div>
          </div>
          
          {reports.length === 0 ? (
            renderEmptyState(
              "No historical wealth reports found",
              "You haven't run any bank statement analyses or advice audits yet. Generate sample history logs to load standard reports into your profile, or upload a statement in the main dashboard.",
              FileText
            )
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {reports.map((report) => (
                <div key={report.id} className="glass-panel p-5 flex flex-col md:flex-row gap-6 hover:border-cyan-500/30 transition group">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-bank-bg rounded-lg">
                          <FileText className="w-5 h-5 text-purple-400" />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-bank-textActive">{report.filename || 'Financial Analysis'}</h3>
                          <p className="text-xs text-bank-textMuted">{new Date(report.generated_at).toLocaleString()}</p>
                        </div>
                      </div>
                      <button 
                        onClick={(e) => handleDeleteReport(e, report.id)}
                        className="p-2 text-bank-textMuted hover:text-rose-400 rounded-lg hover:bg-rose-500/10 transition-colors"
                        title="Delete from history"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
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
                        <Activity className="w-3.5 h-3.5 text-cyan-400" /> Executive Summary
                      </p>
                      <p className="text-xs text-bank-textActive leading-relaxed">
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
          )}
        </div>
      );
    }

    if (activeTab === 'simulations') {
      return (
        <div className="space-y-4 animate-fade-in">
          <div className="glass-panel p-4 flex gap-3 items-center border border-cyan-500/10 bg-cyan-500/5">
            <Sliders className="w-5 h-5 text-cyan-400 flex-shrink-0" />
            <div>
              <h4 className="text-xs font-bold text-bank-textActive">Monte Carlo Projection Logs</h4>
              <p className="text-[10px] text-bank-textMuted mt-0.5">Audit trail of saved stress test scenarios. The <strong>Digital Twin</strong> on the navigation bar represents your active builder workspace, while this history tab represents your <strong>archived simulations ledger</strong> for comparison and review.</p>
            </div>
          </div>

          {simulations.length === 0 ? (
            renderEmptyState(
              "No historical digital twin stress simulations found",
              "This section stores archived records of past Monte Carlo stress tests. The Digital Twin tab on the navbar represents your live sandbox, whereas this section is your archived audit trail. Generate sample logs to explore standard simulation reports.",
              Sliders
            )
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {simulations.map((sim) => (
                <div key={sim.id} className="glass-panel p-5 flex flex-col gap-4 hover:border-cyan-500/30 transition group">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-bank-textActive flex items-center gap-2">
                      <Sliders className="w-4 h-4 text-purple-400" /> {sim.name || 'Digital Twin Projection'}
                    </h3>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] text-bank-textMuted font-semibold">{new Date(sim.simulated_at).toLocaleString()}</span>
                      <button 
                        onClick={(e) => handleDeleteSimulation(e, sim.id)}
                        className="p-1.5 text-bank-textMuted hover:text-rose-400 rounded-lg hover:bg-rose-500/10 transition-colors"
                        title="Delete simulation"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  
                  {/* Simulation params */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-bank-bg/40 p-3 rounded-xl border border-bank-cardBorder/30 text-[10px]">
                    <div>
                      <span className="text-bank-textMuted uppercase font-bold tracking-wider">Income:</span> <strong className="text-bank-textActive">₹{sim.parameters.monthly_income?.toLocaleString('en-IN')}</strong>
                    </div>
                    <div>
                      <span className="text-bank-textMuted uppercase font-bold tracking-wider">Savings:</span> <strong className="text-bank-textActive">₹{sim.parameters.current_savings?.toLocaleString('en-IN')}</strong>
                    </div>
                    <div>
                      <span className="text-bank-textMuted uppercase font-bold tracking-wider">Discretionary Cut:</span> <strong className="text-bank-textActive">{sim.parameters.discretionary_reduction_pct}%</strong>
                    </div>
                    <div>
                      <span className="text-bank-textMuted uppercase font-bold tracking-wider">SIP Addition:</span> <strong className="text-bank-textActive">₹{sim.parameters.sip_addition?.toLocaleString('en-IN')}</strong>
                    </div>
                    <div>
                      <span className="text-bank-textMuted uppercase font-bold tracking-wider">Market Path:</span> <strong className="text-bank-textActive capitalize">{sim.parameters.market_return_type}</strong>
                    </div>
                    <div>
                      <span className="text-bank-textMuted uppercase font-bold tracking-wider">Inflation:</span> <strong className="text-bank-textActive">{sim.parameters.inflation_rate_annual}%</strong>
                    </div>
                    <div>
                      <span className="text-bank-textMuted uppercase font-bold tracking-wider">Timeline:</span> <strong className="text-bank-textActive">{sim.parameters.timeline_months} Months</strong>
                    </div>
                    <div>
                      <span className="text-bank-textMuted uppercase font-bold tracking-wider">Target Goal:</span> <strong className="text-bank-textActive">₹{sim.parameters.target_goal?.toLocaleString('en-IN')}</strong>
                    </div>
                  </div>
                  
                  {/* Monte Carlo output metrics */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center mt-1">
                    <div className="bg-bank-bg/30 border border-bank-cardBorder rounded-xl p-3">
                      <p className="text-[9px] text-bank-textMuted uppercase font-bold tracking-wider">Ending Balance (Median)</p>
                      <p className="text-md font-black text-cyan-400 mt-1">₹{sim.results.metrics?.ending_balance?.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
                    </div>
                    <div className="bg-bank-bg/30 border border-bank-cardBorder rounded-xl p-3">
                      <p className="text-[9px] text-bank-textMuted uppercase font-bold tracking-wider">Total Capital Invested</p>
                      <p className="text-md font-black text-purple-400 mt-1">₹{sim.results.metrics?.total_invested?.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
                    </div>
                    <div className="bg-bank-bg/30 border border-bank-cardBorder rounded-xl p-3 flex flex-col justify-center">
                      <p className="text-[9px] text-bank-textMuted uppercase font-bold tracking-wider">Resilience Score</p>
                      <p className={`text-xs font-black mt-1 ${sim.results.metrics?.resilience_status === 'High' ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {sim.results.metrics?.resilience_status || 'Medium'}
                      </p>
                    </div>
                    <div className="bg-bank-bg/30 border border-bank-cardBorder rounded-xl p-3">
                      <p className="text-[9px] text-bank-textMuted uppercase font-bold tracking-wider">Goal Timeline Status</p>
                      <p className="text-md font-black text-emerald-400 mt-1">
                        {sim.results.metrics?.goal_achieved_month > 0 ? `Month ${sim.results.metrics.goal_achieved_month}` : 'Not Achieved'}
                      </p>
                    </div>
                  </div>

                  <div className="bg-bank-bg/50 border border-bank-cardBorder/50 p-3.5 rounded-xl text-xs text-bank-textMuted italic flex items-start gap-2">
                    <Zap className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0 animate-pulse" />
                    <span>{sim.results.advisory_summary}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    if (activeTab === 'boardroom') {
      if (selectedSession) {
        return (
          <div className="glass-panel p-6 space-y-5 animate-fade-in">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div>
                <h3 className="text-sm font-bold text-bank-textActive flex items-center gap-2">
                  <Brain className="w-4 h-4 text-purple-400" /> Courtroom Debate Trace: {selectedSession.analysis_session_id}
                </h3>
                <p className="text-[10px] text-bank-textMuted mt-0.5">Session date: {new Date(selectedSession.deliberations[0]?.timestamp).toLocaleString()}</p>
              </div>
              <button 
                onClick={() => setSelectedSession(null)} 
                className="px-4 py-2 text-xs font-bold bg-bank-bg border border-bank-cardBorder text-bank-textMuted hover:text-white rounded-xl transition-all duration-200"
              >
                Back to Session History
              </button>
            </div>
            
            {/* Telemetry Summary Card */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-bank-bg/40 border border-bank-cardBorder/50 p-4 rounded-2xl">
              <div>
                <p className="text-[9px] text-bank-textMuted uppercase font-bold tracking-wider">Total LLM Tokens</p>
                <p className="text-lg font-black text-cyan-400 mt-0.5">{(selectedSession.total_tokens || 0).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-[9px] text-bank-textMuted uppercase font-bold tracking-wider">Prompt Tokens</p>
                <p className="text-lg font-black text-purple-400 mt-0.5">{(selectedSession.prompt_tokens || 0).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-[9px] text-bank-textMuted uppercase font-bold tracking-wider">Completion Tokens</p>
                <p className="text-lg font-black text-indigo-400 mt-0.5">{(selectedSession.completion_tokens || 0).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-[9px] text-bank-textMuted uppercase font-bold tracking-wider">Debate Duration</p>
                <p className="text-lg font-black text-emerald-400 mt-0.5">{((selectedSession.total_duration_ms || 0) / 1000).toFixed(2)}s</p>
              </div>
            </div>

            {/* Message Log */}
            <div className="space-y-4 max-h-[450px] overflow-y-auto pr-2 scrollbar-thin">
              {selectedSession.deliberations.map((d, idx) => (
                <div key={idx} className="bg-bank-bg/40 border border-bank-cardBorder/40 p-4 rounded-xl space-y-2 hover:border-cyan-500/25 transition">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-white/5 pb-1.5">
                    <div>
                      <span className="text-xs font-bold text-bank-textActive">{d.agent_name} Agent</span>
                      <span className="text-[9px] text-bank-textMuted ml-2 font-medium">({d.role})</span>
                    </div>
                    <div className="flex items-center gap-2 text-[9px] text-bank-textMuted font-mono">
                      <span>Model: <strong className="text-cyan-400">{d.model_name || 'local'}</strong></span>
                      <span>•</span>
                      <span>Tokens: <strong className="text-purple-400">{d.total_tokens || 0}</strong></span>
                      <span>•</span>
                      <span>Latency: <strong className="text-emerald-400">{d.execution_time_ms}ms</strong></span>
                    </div>
                  </div>
                  <p className="text-xs text-bank-textMuted leading-relaxed">{d.message}</p>
                </div>
              ))}
            </div>
          </div>
        );
      }

      return (
        <div className="space-y-4 animate-fade-in">
          <div className="glass-panel p-4 flex gap-3 items-center border border-emerald-500/10 bg-emerald-500/5">
            <Cpu className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            <div>
              <h4 className="text-xs font-bold text-bank-textActive">Multi-Agent Courtroom Telemetry</h4>
              <p className="text-[10px] text-bank-textMuted mt-0.5">Observatory archive of multi-agent debate logs. Inspect total token consumption, prompt/completion ratios, and execution latency details for past debates.</p>
            </div>
          </div>

          {sessions.length === 0 ? (
            renderEmptyState(
              "No historical agent courtroom boardroom sessions found",
              "This section stores archived transcripts, LLM latencies, and token logs of courtroom debates. To see a detailed telemetry trace, generate sample logs or execute a new boardroom debate with transactions.",
              Cpu
            )
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {sessions.map((sess) => (
                <div 
                  key={sess.analysis_session_id} 
                  onClick={() => handleSelectSession(sess.analysis_session_id)}
                  className="glass-panel p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-bank-cardBorder hover:border-cyan-500/30 cursor-pointer transition group"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-bank-bg rounded-xl border border-bank-cardBorder group-hover:border-cyan-500/20 transition flex-shrink-0">
                      <Cpu className="w-6 h-6 text-cyan-400 group-hover:animate-pulse" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-bank-textActive group-hover:text-cyan-400 transition-colors">
                        Boardroom Debate session: {sess.analysis_session_id.replace('session_', '').substring(0, 12)}
                      </h4>
                      <p className="text-xs text-bank-textMuted mt-0.5">{new Date(sess.session_date).toLocaleString()}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-[9px] text-bank-textMuted uppercase font-bold tracking-wider">Total Tokens</p>
                      <p className="text-sm font-black text-purple-400">{(sess.total_tokens || 0).toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] text-bank-textMuted uppercase font-bold tracking-wider">Duration</p>
                      <p className="text-sm font-black text-emerald-400">{(sess.total_duration_ms / 1000).toFixed(1)}s</p>
                    </div>
                    <button 
                      onClick={(e) => handleDeleteSession(e, sess.analysis_session_id)}
                      className="p-1.5 text-bank-textMuted hover:text-rose-400 rounded-lg hover:bg-rose-500/10 transition-colors"
                      title="Delete debate session"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <ChevronRight className="w-5 h-5 text-bank-textMuted group-hover:text-white group-hover:translate-x-1 transition-all" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header section */}
      <div className="glass-panel-glow p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-bank-textActive flex items-center gap-2">
            <Clock className="w-5 h-5 text-cyan-400" /> Historical Intelligence Ledger
          </h2>
          <p className="text-xs text-bank-textMuted mt-0.5">Review your past wealth reports, digital twin stress simulator logs, and boardroom telemetry traces.</p>
        </div>
        
        {/* Detail view Back button override */}
        {activeTab === 'boardroom' && selectedSession && (
          <button 
            onClick={() => setSelectedSession(null)} 
            className="px-3.5 py-1.5 text-xs font-semibold border border-bank-cardBorder text-bank-textMuted hover:text-white rounded-xl transition"
          >
            ← Back
          </button>
        )}
      </div>

      {/* Primary Tab Selectors */}
      {!selectedSession && (
        <div className="flex border-b border-bank-cardBorder/60 pb-1 gap-2 overflow-x-auto scrollbar-none">
          {[
            { id: 'reports', label: 'Wealth Reports', icon: FileText },
            { id: 'simulations', label: 'Digital Twins', icon: Sliders },
            { id: 'boardroom', label: 'Agent Verdicts', icon: Cpu },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setSelectedSession(null);
                }}
                className={`flex items-center gap-2 px-5 py-3 text-sm font-bold rounded-xl transition whitespace-nowrap ${
                  isActive 
                    ? 'bg-cyan-500/10 border border-cyan-500/20 text-cyan-400' 
                    : 'bg-bank-card/40 border border-transparent text-bank-textMuted hover:text-bank-textActive hover:bg-bank-card/60'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Main rendering panel */}
      {detailLoading ? (
        <div className="p-16 text-center text-bank-textMuted animate-pulse flex flex-col items-center justify-center gap-3">
          <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
          <span>Ingesting courtroom trace logs and compiling real-time telemetry metrics...</span>
        </div>
      ) : (
        renderTabContent()
      )}
    </div>
  );
}
