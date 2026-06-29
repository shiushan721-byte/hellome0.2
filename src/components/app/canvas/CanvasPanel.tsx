import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Sparkles, Activity } from 'lucide-react';
import type { AgentChatConfig, WorkflowPhase } from '../../../types/agentChatConfig';
import CanvasResultView from './CanvasResultView';
import type { TaskRun } from '../../../pages/app/AgentChatCanvasPage';

interface Props {
  config: AgentChatConfig;
  phase: WorkflowPhase;
  runs: TaskRun[];
}

export default function CanvasPanel({ config, phase, runs }: Props) {
  const { canvas } = config;
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Transform State
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const lastMousePos = useRef({ x: 0, y: 0 });

  // Handle Zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (!containerRef.current) return;
    
    // Determine if it's a pinch-zoom or a regular scroll wheel
    const isTouchpad = Math.abs(e.deltaX) !== 0 || Math.abs(e.deltaY) < 40;
    
    if (e.ctrlKey || e.metaKey || isTouchpad) {
      // Zoom
      e.preventDefault();
      const zoomSensitivity = 0.005;
      const delta = -e.deltaY * zoomSensitivity;
      const newScale = Math.min(Math.max(transform.scale * (1 + delta), 0.2), 3);
      
      const rect = containerRef.current.getBoundingClientRect();
      const cursorX = e.clientX - rect.left;
      const cursorY = e.clientY - rect.top;

      const scaleRatio = newScale / transform.scale;
      setTransform(prev => ({
        x: cursorX - (cursorX - prev.x) * scaleRatio,
        y: cursorY - (cursorY - prev.y) * scaleRatio,
        scale: newScale
      }));
    } else {
      // Pan
      setTransform(prev => ({
        ...prev,
        x: prev.x - e.deltaX,
        y: prev.y - e.deltaY
      }));
    }
  }, [transform]);

  // Handle Pan
  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0 && e.button !== 1) return;
    const target = e.target as HTMLElement;
    if (target.closest('.canvas-node')) return;

    setIsDragging(true);
    lastMousePos.current = { x: e.clientX, y: e.clientY };
    target.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - lastMousePos.current.x;
    const dy = e.clientY - lastMousePos.current.y;
    lastMousePos.current = { x: e.clientX, y: e.clientY };
    setTransform(prev => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setIsDragging(false);
    const target = e.target as HTMLElement;
    target.releasePointerCapture(e.pointerId);
  };

  // Center view smoothly
  const centerView = () => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    // Move slightly up and left so the first run is nicely centered
    setTransform({
      x: rect.width / 2 + 100,
      y: rect.height / 2 + 50,
      scale: 0.85
    });
  };

  // Auto-center on initial render or when a new run is added
  useEffect(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    // If runs exist, center on the latest run
    if (runs.length > 0) {
      const latestRunIndex = runs.length - 1;
      const yOffset = latestRunIndex * 600;
      setTransform({
        x: rect.width / 2 + 100,
        y: rect.height / 2 + 50 - yOffset * 0.85,
        scale: 0.85
      });
    } else {
      centerView();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runs.length]);

  // Grid Background Pattern
  const gridBackground = {
    backgroundImage: `radial-gradient(circle at 1.5px 1.5px, rgba(0,0,0,0.15) 1.5px, transparent 0)`,
    backgroundSize: `${32 * transform.scale}px ${32 * transform.scale}px`,
    backgroundPosition: `${transform.x}px ${transform.y}px`,
  };

  return (
    <div 
      ref={containerRef}
      className="w-full h-full relative overflow-hidden bg-[#090A0B] select-none touch-none cursor-grab active:cursor-grabbing"
      onWheel={handleWheel}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <div className="absolute inset-0 z-0 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.05) 1px, transparent 0)', backgroundSize: '32px 32px' }} />
      
      {/* UI Controls overlay (MUST be outside the zoomed canvas) */}
      <div className="absolute bottom-6 right-6 z-50 flex gap-2">
        <button 
          onClick={centerView}
          className="px-4 py-2 bg-white/5 border border-white/10 rounded-full shadow-sm text-[12px] font-medium text-white/60 hover:bg-white/10 transition-colors backdrop-blur-md"
        >
          居中最新版本
        </button>
      </div>

      <div 
        className={`absolute inset-0 origin-top-left z-10 ${isDragging ? '' : 'transition-transform duration-500 ease-out'}`}
        style={{ transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})` }}
      >
        
        {/* Node: Idle/Welcome (Center) */}
        {runs.length === 0 && (
          <div className="absolute canvas-node" style={{ transform: 'translate(-50%, -50%)' }}>
            <div className="w-[360px] bg-white/5 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/10 p-8 text-center flex flex-col items-center">
              <div className="h-20 w-20 bg-white/10 rounded-3xl flex items-center justify-center text-4xl mb-4 shadow-inner">
                {config.icon}
              </div>
              <h2 className="text-[20px] font-semibold text-white/90">
                {config.name}
              </h2>
              <p className="mt-2 text-[14px] leading-relaxed text-white/50">
                {config.description}
              </p>
              <div className="mt-6 flex items-center gap-2 opacity-50 bg-white/5 px-4 py-2 rounded-full border border-white/5">
                <Sparkles className="h-4 w-4 text-[#00F0FF]" />
                <span className="text-[12px] font-medium uppercase tracking-widest text-white/70">Waiting for Input</span>
              </div>
            </div>
          </div>
        )}

        {/* Runs Iteration */}
        {runs.map((run, index) => {
          const runYOffset = index * 600;
          const isLatest = index === runs.length - 1;

          return (
            <React.Fragment key={run.taskId}>
              
              {/* Revision Connectors: Connect from prev Result to current Logs */}
              {index > 0 && (
                <svg className="absolute overflow-visible pointer-events-none" style={{ left: '-200px', top: `${runYOffset - 350}px` }}>
                  <path 
                    d={`M 520 150 C 520 300, 0 300, 0 450`} 
                    fill="none" 
                    stroke="rgba(255,255,255,0.1)" 
                    strokeWidth="3" 
                  />
                  <rect x="-40" y="280" width="80" height="24" rx="12" fill="#141517" stroke="rgba(255,255,255,0.1)" />
                  <text x="0" y="296" fontSize="10" fill="rgba(255,255,255,0.5)" textAnchor="middle" fontWeight="bold">修改 v{index + 1}</text>
                </svg>
              )}

              {/* Node: Event Logs (Left Side) */}
              <div className="absolute canvas-node transition-all duration-500" style={{ transform: `translate(-400px, ${-250 + runYOffset}px)` }}>
                <div className={`w-[320px] bg-white/5 backdrop-blur-2xl rounded-[24px] shadow-2xl border border-white/10 overflow-hidden flex flex-col h-[500px] ${!isLatest ? 'opacity-60 scale-95 origin-top-left' : 'shadow-[0_0_40px_rgba(0,240,255,0.05)]'}`}>
                  <div className="px-5 py-4 border-b border-white/10 bg-white/5 shrink-0 flex justify-between items-center">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#00F0FF]/10 border border-[#00F0FF]/20 text-[#00F0FF] text-[11px] font-bold tracking-wider uppercase">
                      <Activity className="h-3.5 w-3.5" />
                      Execution Logs v{index + 1}
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-4 relative">
                    <div className="absolute left-[39px] top-5 bottom-5 w-px bg-gradient-to-b from-transparent via-white/10 to-transparent pointer-events-none" />
                    {run.events.length === 0 ? (
                      <div className="text-center py-10 text-sm text-white/30 animate-pulse">
                        等待底层日志回传...
                      </div>
                    ) : (
                      run.events.map((event, i) => (
                        <div key={event.id || i} className="relative z-10 flex items-start gap-3">
                          <div className="mt-0.5 flex shrink-0 h-8 w-8 items-center justify-center rounded-full bg-[#0A0A0B] border border-white/10 shadow-sm text-white/40">
                            <span className={`w-1.5 h-1.5 rounded-full ${run.status === 'running' && i === run.events.length - 1 ? 'bg-[#00F0FF] animate-pulse shadow-[0_0_10px_#00F0FF]' : 'bg-white/30'}`} />
                          </div>
                          <div className="flex-1 bg-white/5 rounded-xl border border-white/5 p-3 shadow-sm backdrop-blur-md">
                            <p className="text-[13px] text-white/80 font-medium leading-relaxed">{event.message}</p>
                            <p className="text-[10px] text-white/30 mt-1.5 font-mono">{new Date(event.createdAt).toLocaleTimeString()} · {event.type || 'Sys'}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Connection Line (Logs to Result) */}
              <svg className="absolute overflow-visible pointer-events-none" style={{ left: '-80px', top: `${runYOffset}px` }}>
                <defs>
                  <linearGradient id={`grad-${index}`} x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#00F0FF" />
                    <stop offset="100%" stopColor="#7000FF" />
                  </linearGradient>
                  <filter id="glow">
                    <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                    <feMerge>
                      <feMergeNode in="coloredBlur"/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
                </defs>
                <path 
                  d="M 0 0 C 100 0, 100 0, 200 0" 
                  fill="none" 
                  stroke={run.status === 'running' ? `url(#grad-${index})` : "rgba(255,255,255,0.1)"} 
                  strokeWidth={run.status === 'running' ? "3" : "2"} 
                  strokeDasharray="8 8"
                  filter={run.status === 'running' ? "url(#glow)" : ""}
                  className={run.status === 'running' ? 'animate-[dash_1s_linear_infinite]' : ''}
                />
              </svg>

              {/* Node: Result View (Right Side) */}
              <div className="absolute canvas-node transition-all duration-500" style={{ transform: `translate(120px, ${-200 + runYOffset}px)` }}>
                <div className={`transition-all duration-700 ${run.status === 'running' ? 'opacity-40 blur-sm scale-95' : 'opacity-100 scale-100'}`}>
                  <div className={`w-[400px] ${!isLatest && run.status !== 'running' ? 'opacity-80' : ''}`}>
                    <CanvasResultView 
                      type={canvas.resultType}
                      title={`${canvas.resultTitle} v${index + 1}`}
                      description={canvas.resultDescription}
                      artifacts={run.artifacts}
                    />
                  </div>
                </div>
              </div>

            </React.Fragment>
          );
        })}

      </div>
    </div>
  );
}
