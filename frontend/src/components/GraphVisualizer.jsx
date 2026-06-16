import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Network, RefreshCw, HelpCircle, Info, Database, Zap, ZoomIn, ZoomOut, Move, Unlock } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 
  (typeof window !== 'undefined' ? `http://${window.location.hostname}:8000` : 'http://localhost:8000');

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
  
  // Pan and Zoom states
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [draggedNode, setDraggedNode] = useState(null);

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
      
      // Initialize node positions randomly within bounds (1000x700)
      const width = 1000;
      const height = 700;
      const initializedNodes = graphData.nodes.map((node, i) => {
        const isUser = node.type === 'User';
        return {
          ...node,
          x: isUser ? width / 2 : width / 2 + (Math.random() - 0.5) * 500,
          y: isUser ? height / 2 : height / 2 + (Math.random() - 0.5) * 350,
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
    
    const width = 1000;
    const height = 700;
    const k = 0.05;        // Spring constant for links
    const rep = 2500;      // Higher repulsion for spacing
    const friction = 0.85;
    const centerGravity = 0.008;
    
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
          
          if (dist < 280) { // expanded repulsion field
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
          const targetDist = 120; // larger spring length to prevent clumping
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
        
        // Bound checks within expanded coordinates
        node.x = Math.max(25, Math.min(width - 25, node.x));
        node.y = Math.max(25, Math.min(height - 25, node.y));
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

  // ── Drag & Zoom Handlers ──────────
  const handleMouseDown = (e) => {
    if (e.button !== 0) return; // Left click only
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e) => {
    if (draggedNode) {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      // Translate to SVG coordinate space (1000x700)
      const clientSvgX = (mouseX / rect.width) * 1000;
      const clientSvgY = (mouseY / rect.height) * 700;
      
      // Inverse transform pan & zoom
      const svgX = (clientSvgX - pan.x) / zoom;
      const svgY = (clientSvgY - pan.y) / zoom;
      
      const updatedNodes = nodesRef.current.map(n => {
        if (n.id === draggedNode) {
          n.fx = svgX;
          n.fy = svgY;
          n.x = svgX;
          n.y = svgY;
        }
        return n;
      });
      nodesRef.current = updatedNodes;
      setNodes(updatedNodes);
    } else if (isDragging) {
      setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    }
  };

  const handleMouseUp = () => {
    if (draggedNode) {
      const updatedNodes = nodesRef.current.map(n => {
        if (n.id === draggedNode) {
          // Release it back into force-field (unless it's the central user node)
          if (n.type !== 'User') {
            n.fx = null;
            n.fy = null;
          }
        }
        return n;
      });
      nodesRef.current = updatedNodes;
      setNodes(updatedNodes);
      setDraggedNode(null);
    }
    setIsDragging(false);
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const scale = 1.08;
    const newZoom = e.deltaY < 0 ? zoom * scale : zoom / scale;
    setZoom(Math.max(0.15, Math.min(newZoom, 6)));
  };

  const handleNodeMouseDown = (e, node) => {
    e.stopPropagation();
    setDraggedNode(node.id);
    node.fx = node.x;
    node.fy = node.y;
  };

  const handleResetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handleReleaseAll = () => {
    const updated = nodesRef.current.map(n => {
      if (n.type !== 'User') {
        n.fx = null;
        n.fy = null;
      }
      return n;
    });
    nodesRef.current = updated;
    setNodes(updated);
  };

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
            Dynamic node-link map showing links between your identity, transactions, vendors, and compliance guidelines. Use mouse scroll to Zoom, drag background to Pan.
          </p>
        </div>
        <div className="flex items-center gap-3">
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
        <div className="lg:col-span-3 glass-panel p-4 flex items-center justify-center bg-bank-bg/40 relative overflow-hidden h-[630px]">
          <svg 
            viewBox="0 0 1000 700" 
            className="w-full h-full select-none cursor-grab active:cursor-grabbing" 
            ref={containerRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
          >
            <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
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
                      stroke="#26354D" strokeWidth="1.5" opacity="0.65"
                    />
                    <text 
                      x={(srcNode.x + tgtNode.x) / 2} 
                      y={(srcNode.y + tgtNode.y) / 2 - 4} 
                      fill="#94A3B8" fontSize="7" fontWeight="medium" textAnchor="middle" opacity="0.5"
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
                const radius = isUser ? 16 : node.type === 'ComplianceRule' ? 13 : 10;
                const isDragged = draggedNode === node.id;
                
                return (
                  <g 
                    key={node.id} 
                    className="cursor-pointer group"
                    onMouseDown={(e) => handleNodeMouseDown(e, node)}
                  >
                    <circle
                      cx={node.x} cy={node.y} r={radius}
                      fill={style.fill} stroke={isDragged ? '#ffffff' : style.border} strokeWidth={isDragged ? 3 : 2}
                      className="transition-all duration-300 group-hover:r-[13] group-hover:stroke-white/40"
                    />
                    <text
                      x={node.x} y={node.y + radius + 11}
                      fill="#F8FAFC" fontSize="7.5" fontWeight="bold" textAnchor="middle"
                      className="opacity-95 group-hover:opacity-100 filter drop-shadow-md pointer-events-none"
                    >
                      {node.label}
                    </text>
                  </g>
                );
              })}
            </g>
          </svg>

          {/* Floating UI Control Pad */}
          <div className="absolute bottom-4 left-4 flex gap-2 z-10">
            <button 
              onClick={() => setZoom(z => Math.min(z * 1.2, 5))}
              title="Zoom In"
              className="p-2 bg-bank-card/90 border border-bank-cardBorder/80 hover:border-cyan-500/50 text-bank-textMuted hover:text-white rounded-lg transition shadow-md"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setZoom(z => Math.max(z / 1.2, 0.15))}
              title="Zoom Out"
              className="p-2 bg-bank-card/90 border border-bank-cardBorder/80 hover:border-cyan-500/50 text-bank-textMuted hover:text-white rounded-lg transition shadow-md"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button 
              onClick={handleResetView}
              title="Reset Zoom & Pan"
              className="p-2 bg-bank-card/90 border border-bank-cardBorder/80 hover:border-cyan-500/50 text-bank-textMuted hover:text-white rounded-lg transition shadow-md"
            >
              <Move className="w-4 h-4" />
            </button>
            <button 
              onClick={handleReleaseAll}
              title="Release Pinned Nodes"
              className="p-2 bg-bank-card/90 border border-bank-cardBorder/80 hover:border-cyan-500/50 text-bank-textMuted hover:text-white rounded-lg transition shadow-md"
            >
              <Unlock className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Legend Sidebar */}
        <div className="lg:col-span-1 glass-panel p-5 flex flex-col justify-start space-y-4 h-[630px] overflow-y-auto">
          <h5 className="text-xs font-bold text-bank-textActive uppercase tracking-wider border-b border-white/5 pb-2">
            Graph Legend
          </h5>
          
          <div className="space-y-4 text-xs">
            {Object.entries(NODE_COLORS).map(([type, colors]) => {
              const count = nodes.filter(n => n.type === type).length;
              return (
                <div key={type} className="flex items-center gap-3">
                  <span className="w-3.5 h-3.5 rounded-full border flex-shrink-0 animate-pulse" style={{ backgroundColor: colors.fill, borderColor: colors.border }} />
                  <div className="flex-1">
                    <p className="font-bold text-bank-textActive flex items-center justify-between">
                      {type.replace('ComplianceRule', 'Compliance Rule')}
                      {count > 0 && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-bank-bg border border-bank-cardBorder" style={{ color: colors.text }}>{count}</span>}
                    </p>
                    <p className="text-[10px] text-bank-textMuted leading-normal">
                      {type === 'User' ? 'Entity node representing user account' :
                       type === 'Transaction' ? 'Enriched statement ledger ledger row' :
                       type === 'Vendor' ? 'Normalized payee recipient link' :
                       'RBI / SEBI regulatory policy benchmark'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-3 border-t border-white/5 space-y-2">
            <div className="flex justify-between text-[10px]">
              <span className="text-bank-textMuted font-medium">Total Nodes</span>
              <span className="font-bold text-bank-textActive">{nodes.length}</span>
            </div>
            <div className="flex justify-between text-[10px]">
              <span className="text-bank-textMuted font-medium">Relationships</span>
              <span className="font-bold text-bank-textActive">{data.edges.length}</span>
            </div>
          </div>

          <div className="p-3 bg-cyan-500/5 border border-cyan-500/10 rounded-xl flex items-start gap-2 text-[10px] text-cyan-400 font-semibold leading-relaxed pt-3">
            <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>Interactive Zoom & Drag. Force-directed physics pulls related transactions together. Drag nodes to inspect specific clusters.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
