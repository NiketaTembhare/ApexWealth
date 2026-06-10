import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Network, RefreshCw, HelpCircle, Info, Database, Zap } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const NODE_COLORS = {
  User: { fill: '#3b82f6', border: '#1d4ed8', text: '#93c5fd' },
  Transaction: { fill: '#8b5cf6', border: '#6d28d9', text: '#c084fc' },
  Vendor: { fill: '#f59e0b', border: '#b45309', text: '#fcd34d' },
  ComplianceRule: { fill: '#ef4444', border: '#b91c1c', text: '#fca5a5' }
};

export default function GraphVisualizer() {
  const [data, setData] = useState({ nodes: [], edges: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [nodes, setNodes] = useState([]);
  
  const requestRef = useRef();
  const nodesRef = useRef([]);
  const containerRef = useRef();

  const fetchGraph = async () => {
    try {
      const token = localStorage.getItem('apex_token');
      const response = await axios.get(`${API_BASE_URL}/graph/elements`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const graphData = response.data;
      setData(graphData);
      
      // Initialize node positions randomly within bounds
      const width = 600;
      const height = 400;
      const initializedNodes = graphData.nodes.map((node, i) => {
        // Place User in the center, others spread out
        const isUser = node.type === 'User';
        return {
          ...node,
          x: isUser ? width / 2 : width / 2 + (Math.random() - 0.5) * 200,
          y: isUser ? height / 2 : height / 2 + (Math.random() - 0.5) * 150,
          vx: 0,
          vy: 0,
          fx: isUser ? width / 2 : null, // Pin user to center
          fy: isUser ? height / 2 : null
        };
      });
      
      nodesRef.current = initializedNodes;
      setNodes(initializedNodes);
      setLoading(false);
    } catch (err) {
      console.error("Failed to fetch graph data:", err);
      setError(err.message);
      setLoading(false);
    }
  };

  // ── Physics Force-Directed Engine ──────────
  useEffect(() => {
    if (loading || data.nodes.length === 0) return;
    
    const width = 600;
    const height = 400;
    const k = 0.05;       // Spring constant for links
    const rep = 800;     // Repulsion constant between nodes
    const friction = 0.85;
    const centerGravity = 0.01;
    
    const updatePhysics = () => {
      const currentNodes = [...nodesRef.current];
      const edges = data.edges;
      
      if (currentNodes.length === 0) return;

      // 1. Repulsion between all nodes
      for (let i = 0; i < currentNodes.length; i++) {
        const n1 = currentNodes[i];
        for (let j = i + 1; j < currentNodes.length; j++) {
          const n2 = currentNodes[j];
          const dx = n2.x - n1.x;
          const dy = n2.y - n1.y;
          const distSq = dx * dx + dy * dy + 0.1;
          const dist = Math.sqrt(distSq);
          
          if (dist < 150) {
            const force = rep / distSq;
            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;
            
            if (n1.fx === null) { n1.vx -= fx; n1.vy -= fy; }
            if (n2.fx === null) { n2.vx += fx; n2.vy += fy; }
          }
        }
      }

      // 2. Attraction along edges (Spring force)
      edges.forEach(edge => {
        const sNode = currentNodes.find(n => n.id === edge.source);
        const tNode = currentNodes.find(n => n.id === edge.target);
        
        if (sNode && tNode) {
          const dx = tNode.x - sNode.x;
          const dy = tNode.y - sNode.y;
          const dist = Math.sqrt(dx * dx + dy * dy) + 0.1;
          const targetDist = 70; // preferred spring length
          const force = k * (dist - targetDist);
          
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          
          if (sNode.fx === null) { sNode.vx += fx; sNode.vy += fy; }
          if (tNode.fx === null) { tNode.vx -= fx; tNode.vy -= fy; }
        }
      });

      // 3. Gravity pulling toward center & Update positions
      currentNodes.forEach(node => {
        if (node.fx !== null) {
          node.x = node.fx;
          node.y = node.fy;
          return;
        }
        
        // Gravity
        const dx = width / 2 - node.x;
        const dy = height / 2 - node.y;
        node.vx += dx * centerGravity;
        node.vy += dy * centerGravity;
        
        // Update velocity and position
        node.vx *= friction;
        node.vy *= friction;
        node.x += node.vx;
        node.y += node.vy;
        
        // Bound checks
        node.x = Math.max(20, Math.min(width - 20, node.x));
        node.y = Math.max(20, Math.min(height - 20, node.y));
      });

      nodesRef.current = currentNodes;
      setNodes([...currentNodes]);
      requestRef.current = requestAnimationFrame(updatePhysics);
    };

    requestRef.current = requestAnimationFrame(updatePhysics);
    return () => cancelAnimationFrame(requestRef.current);
  }, [loading, data]);

  useEffect(() => {
    fetchGraph();
  }, []);

  if (loading) {
    return (
      <div className="glass-panel p-16 text-center space-y-4">
        <RefreshCw className="w-12 h-12 text-cyan-400 animate-spin mx-auto" />
        <p className="text-bank-textMuted font-semibold">Traversing Knowledge Graph relations...</p>
      </div>
    );
  }

  if (error || data.nodes.length === 0) {
    return (
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="glass-panel p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h4 className="text-sm font-bold text-bank-textActive flex items-center gap-2">
              <Network className="w-4 h-4 text-cyan-400" /> Relational Financial Knowledge Graph
            </h4>
            <p className="text-xs text-bank-textMuted mt-1">
              Upload a bank statement to map transactions, vendors, and risk signals into a live graph.
            </p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 border border-amber-500/25 rounded-full flex-shrink-0">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest">Awaiting Data</span>
          </div>
        </div>

        {/* Preview of what will appear */}
        <div className="glass-panel p-8">
          <p className="text-xs font-bold text-bank-textMuted uppercase tracking-wider text-center mb-6">
            Once your statement is uploaded, this graph will map:
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { type: 'User', colors: NODE_COLORS.User, label: 'Your Account', desc: 'Central identity node' },
              { type: 'Transaction', colors: NODE_COLORS.Transaction, label: 'Transactions', desc: 'Every debit & credit row' },
              { type: 'Vendor', colors: NODE_COLORS.Vendor, label: 'Vendors', desc: 'Payees & merchants detected' },
              { type: 'ComplianceRule', colors: NODE_COLORS.ComplianceRule, label: 'Risk Signals', desc: 'RBI / SEBI policy flags' },
            ].map(({ type, colors, label, desc }) => (
              <div key={type} className="flex flex-col items-center gap-3 p-4 bg-bank-bg/40 rounded-2xl border border-bank-cardBorder/40 hover:border-cyan-500/20 transition">
                <div className="w-10 h-10 rounded-full border-2 flex items-center justify-center"
                  style={{ backgroundColor: colors.fill + '33', borderColor: colors.border }}>
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: colors.fill }} />
                </div>
                <div className="text-center">
                  <p className="text-xs font-bold" style={{ color: colors.text }}>{label}</p>
                  <p className="text-[10px] text-bank-textMuted/70 mt-0.5 leading-tight">{desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 flex items-center gap-2 justify-center text-[10px] text-bank-textMuted/60 font-medium">
            <Info className="w-3.5 h-3.5" />
            Relationships between nodes are computed by the AI after each document upload.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="glass-panel p-5 relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h4 className="text-sm font-bold text-bank-textActive flex items-center gap-2">
            <Network className="w-4 h-4 text-cyan-400" /> Relational Financial Knowledge Graph
          </h4>
          <p className="text-xs text-bank-textMuted mt-1">
            Dynamic node-link map showing links between your identity, transactions, vendors, and compliance guidelines.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* User Data badge — this graph is always populated from real DB data */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/25 rounded-full">
            <Database className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">User Data</span>
          </div>
          <button onClick={fetchGraph} className="px-3 py-1.5 text-xs font-bold border border-bank-cardBorder text-bank-textMuted hover:text-white rounded-xl transition flex items-center gap-1">
            <RefreshCw className="w-3 h-3" /> Refresh Layout
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Graph SVG canvas */}
        <div className="lg:col-span-3 glass-panel p-4 flex items-center justify-center bg-bank-bg/40 relative">
          <svg viewBox="0 0 600 400" className="w-full h-auto max-h-[380px] select-none" ref={containerRef}>
            
            {/* Draw edge lines */}
            {data.edges.map((edge, idx) => {
              const srcNode = nodes.find(n => n.id === edge.source);
              const tgtNode = nodes.find(n => n.id === edge.target);
              if (!srcNode || !tgtNode) return null;
              
              return (
                <g key={idx}>
                  <line 
                    x1={srcNode.x} y1={srcNode.y}
                    x2={tgtNode.x} y2={tgtNode.y}
                    stroke="#26354D" strokeWidth="1.5" opacity="0.6"
                  />
                  {/* Small link descriptor label */}
                  <text 
                    x={(srcNode.x + tgtNode.x) / 2} 
                    y={(srcNode.y + tgtNode.y) / 2 - 4} 
                    fill="#94A3B8" fontSize="8" textAnchor="middle" opacity="0.4"
                  >
                    {edge.relation}
                  </text>
                </g>
              );
            })}

            {/* Draw node circles */}
            {nodes.map(node => {
              const style = NODE_COLORS[node.type] || { fill: '#64748b', border: '#475569', text: '#cbd5e1' };
              const isUser = node.type === 'User';
              const radius = isUser ? 14 : node.type === 'ComplianceRule' ? 12 : 9;
              
              return (
                <g key={node.id} className="cursor-pointer group">
                  <circle
                    cx={node.x} cy={node.y} r={radius}
                    fill={style.fill} stroke={style.border} strokeWidth="2"
                    className="transition-all duration-300 group-hover:r-[12] group-hover:stroke-white/40"
                  />
                  <text
                    x={node.x} y={node.y + radius + 12}
                    fill="#F8FAFC" fontSize="8" fontWeight="bold" textAnchor="middle"
                    className="opacity-80 group-hover:opacity-100 filter drop-shadow-md pointer-events-none"
                  >
                    {node.label}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Legend Sidebar */}
        <div className="lg:col-span-1 glass-panel p-5 flex flex-col justify-start space-y-4">
          <h5 className="text-xs font-bold text-bank-textActive uppercase tracking-wider border-b border-white/5 pb-2">
            Graph Legend
          </h5>
          
          <div className="space-y-3 text-xs">
            {Object.entries(NODE_COLORS).map(([type, colors]) => {
              const count = nodes.filter(n => n.type === type).length;
              return (
                <div key={type} className="flex items-center gap-3">
                  <span className="w-3.5 h-3.5 rounded-full border flex-shrink-0" style={{ backgroundColor: colors.fill, borderColor: colors.border }} />
                  <div className="flex-1">
                    <p className="font-bold text-bank-textActive flex items-center justify-between">
                      {type.replace('ComplianceRule', 'Compliance Rule')}
                      {count > 0 && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: colors.fill + '22', color: colors.text }}>{count}</span>}
                    </p>
                    <p className="text-[10px] text-bank-textMuted">
                      {type === 'User' ? 'Entity node representing user account' :
                       type === 'Transaction' ? 'Parsed statement ledger row' :
                       type === 'Vendor' ? 'Normalized payee recipient link' :
                       'RBI / SEBI regulatory policy benchmark'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Graph stats */}
          <div className="pt-3 border-t border-white/5 space-y-2">
            <div className="flex justify-between text-[10px]">
              <span className="text-bank-textMuted">Total Nodes</span>
              <span className="font-bold text-bank-textActive">{nodes.length}</span>
            </div>
            <div className="flex justify-between text-[10px]">
              <span className="text-bank-textMuted">Relationships</span>
              <span className="font-bold text-bank-textActive">{data.edges.length}</span>
            </div>
          </div>

          <div className="p-3 bg-cyan-500/5 border border-cyan-500/10 rounded-xl flex items-start gap-2 text-[10px] text-cyan-400 font-semibold leading-relaxed pt-3">
            <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
            Physics forces pull transactions closer to common vendors and flag rule violations dynamically.
          </div>
        </div>
      </div>
    </div>
  );
}
