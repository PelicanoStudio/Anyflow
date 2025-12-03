import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { NodeData, Connection, NodeType, ConnectionType } from './types';
import { BaseNode } from './components/nodes/BaseNode';
import { SidePanel } from './components/SidePanel';
import { Visualizer } from './components/nodes/Visualizer';
import { Plus, Settings, Command, Monitor, Trash2, X, MousePointer2, ZoomIn, ZoomOut, Move, Unplug, CheckSquare, Square } from 'lucide-react';

// --- CONSTANTS & PALETTES ---

const NEON_PALETTE = [
    '#00FFFF', // Cyan
    '#FF00FF', // Magenta
    '#00FF00', // Lime
    '#FFFF00', // Yellow
    '#FF3333', // Red
    '#FFA500', // Orange
    '#8A2BE2', // BlueViolet
];

const INITIAL_NODES: NodeData[] = [
  {
    id: 'n1',
    type: NodeType.PICKER,
    label: 'Cyber Punk Asset',
    position: { x: 100, y: 300 },
    collapsed: false,
    config: { src: 'https://picsum.photos/id/237/400/400' }
  },
  {
    id: 'n2',
    type: NodeType.TRANSFORM,
    label: 'Scale Modifier',
    position: { x: 500, y: 300 },
    collapsed: false,
    config: { scale: 120, rotation: 15 }
  },
  {
    id: 'n3',
    type: NodeType.OSCILLATOR,
    label: 'Sine Wave LFO',
    position: { x: 500, y: 100 },
    collapsed: false,
    config: { type: 'sine', frequency: 1, amplitude: 1 }
  },
  {
    id: 'n4',
    type: NodeType.OUTPUT,
    label: 'Main Output',
    position: { x: 900, y: 300 },
    collapsed: false,
    config: {}
  }
];

const INITIAL_CONNECTIONS: Connection[] = [
  { id: 'c1', source: 'n1', target: 'n2', type: ConnectionType.DOUBLE },
  { id: 'c2', source: 'n2', target: 'n4', type: ConnectionType.BEZIER },
  { id: 'c3', source: 'n3', target: 'n2', type: ConnectionType.DOTTED },
];

const SNAP_SIZE = 20;

export default function App() {
  // --- STATE ---
  const [nodes, setNodes] = useState<NodeData[]>(INITIAL_NODES);
  const [connections, setConnections] = useState<Connection[]>(INITIAL_CONNECTIONS);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  
  // Menu States
  const [activeMenu, setActiveMenu] = useState<'MAIN' | 'CONNECTION' | 'DISCONNECT' | null>(null);
  const [disconnectData, setDisconnectData] = useState<{ nodeId: string, type: 'input' | 'output', x: number, y: number } | null>(null);
  
  // Canvas State
  const [viewport, setViewport] = useState({ x: 0, y: 0, zoom: 1 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Interaction State
  const [dragState, setDragState] = useState<{
      nodeId: string;
      currentX: number;
      currentY: number;
      startX: number;
      startY: number;
      mouseStartX: number;
      mouseStartY: number;
  } | null>(null);

  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0, mouseX: 0, mouseY: 0 });

  // Wiring State
  const [tempWire, setTempWire] = useState<{ startId: string, startType: 'input' | 'output', mouseX: number, mouseY: number } | null>(null);
  const [pendingConnection, setPendingConnection] = useState<{ source: string, target: string, x: number, y: number } | null>(null);

  // --- UTILS ---

  const screenToWorld = useCallback((screenX: number, screenY: number) => {
      return {
          x: (screenX - viewport.x) / viewport.zoom,
          y: (screenY - viewport.y) / viewport.zoom
      };
  }, [viewport]);

  const getNodePosition = useCallback((id: string) => {
      if (dragState && dragState.nodeId === id) {
          return { x: dragState.currentX, y: dragState.currentY };
      }
      const node = nodes.find(n => n.id === id);
      return node ? node.position : { x: 0, y: 0 };
  }, [nodes, dragState]);

  // --- LOGIC: BRANCH COLORING ---

  const nodeColors = useMemo(() => {
    const colorMap = new Map<string, string>();
    const roots = nodes.filter(n => n.type === NodeType.PICKER);
    
    roots.forEach((root, index) => {
        const color = NEON_PALETTE[index % NEON_PALETTE.length];
        colorMap.set(root.id, color);
        
        const queue = [root.id];
        const visited = new Set<string>();

        while(queue.length > 0) {
            const currId = queue.shift()!;
            if (visited.has(currId)) continue;
            visited.add(currId);
            const children = connections.filter(c => c.source === currId).map(c => c.target);
            children.forEach(childId => {
                if (!colorMap.has(childId)) { 
                    colorMap.set(childId, color);
                    queue.push(childId);
                }
            });
        }
    });
    return colorMap;
  }, [nodes, connections]);

  const activeChainIds = useMemo(() => {
    if (!selectedId) return new Set<string>();
    const active = new Set<string>();
    
    const queueUp = [selectedId];
    while (queueUp.length > 0) {
        const curr = queueUp.pop()!;
        active.add(curr);
        const incoming = connections.filter(c => c.target === curr);
        incoming.forEach(c => {
            active.add(c.id);
            if (!active.has(c.source)) queueUp.push(c.source);
        });
    }

    const queueDown = [selectedId];
    while (queueDown.length > 0) {
        const curr = queueDown.pop()!;
        active.add(curr);
        const outgoing = connections.filter(c => c.source === curr);
        outgoing.forEach(c => {
            active.add(c.id);
            if (!active.has(c.target)) queueDown.push(c.target);
        });
    }
    return active;
  }, [selectedId, connections]);


  // --- KEYBOARD SHORTCUTS ---
  useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
          if (e.key === 'Delete' || e.key === 'Backspace') {
             if (selectedId) {
                 setNodes(prev => prev.filter(n => n.id !== selectedId));
                 setConnections(prev => prev.filter(c => c.source !== selectedId && c.target !== selectedId));
                 setSelectedId(null);
             }
          }
          if (e.key === 'Escape') {
              setSelectedId(null);
              setTempWire(null);
              setActiveMenu(null);
          }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedId]);


  // --- EVENT HANDLERS: VIEWPORT ---

  const handleWheel = (e: React.WheelEvent) => {
      e.stopPropagation();
      e.preventDefault();

      // Shift + Scroll = PAN
      if (e.shiftKey) {
          const panSpeed = 1;
          setViewport(prev => ({
              ...prev,
              x: prev.x - e.deltaY * panSpeed,
              y: prev.y - e.deltaX * panSpeed 
          }));
          return;
      }

      // Mouse-Centered Zoom
      const zoomSensitivity = 0.001;
      const newZoom = Math.min(Math.max(viewport.zoom - e.deltaY * zoomSensitivity, 0.2), 3);
      
      const worldPoint = screenToWorld(e.clientX, e.clientY);
      const newX = e.clientX - worldPoint.x * newZoom;
      const newY = e.clientY - worldPoint.y * newZoom;

      setViewport({
          x: newX,
          y: newY,
          zoom: newZoom
      });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
      if (e.button === 0) { // Left click Pan
        setIsPanning(true);
        panStartRef.current = {
            x: viewport.x,
            y: viewport.y,
            mouseX: e.clientX,
            mouseY: e.clientY
        };
        setSelectedId(null);
        setActiveMenu(null);
      }
      else if (e.button === 2) { // Right Click Menu
          e.preventDefault();
          setActiveMenu('MAIN');
      }
  };

  const handleNodeMouseDown = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      setActiveMenu(null);
      
      let targetId = id;

      // NODE DUPLICATION (Ctrl/Alt + Drag)
      if (e.ctrlKey || e.altKey) {
          const original = nodes.find(n => n.id === id);
          if (original) {
              const newId = `n_${Date.now()}`;
              const newNode = { 
                  ...original, 
                  id: newId, 
                  position: { x: original.position.x + 20, y: original.position.y + 20 },
                  label: original.label + ' Copy'
              };
              setNodes(prev => [...prev, newNode]);
              
              // Duplicate incoming connections
              const incoming = connections.filter(c => c.target === id);
              const newConnections = incoming.map(c => ({
                  ...c,
                  id: `c_${Date.now()}_${Math.random()}`,
                  target: newId
              }));
              setConnections(prev => [...prev, ...newConnections]);
              
              targetId = newId;
          }
      }

      const node = nodes.find(n => n.id === targetId) || nodes.find(n => n.id === id); // Fallback
      if (!node) return;

      setDragState({
          nodeId: targetId,
          currentX: node.position.x,
          currentY: node.position.y,
          startX: node.position.x,
          startY: node.position.y,
          mouseStartX: e.clientX,
          mouseStartY: e.clientY
      });
      setSelectedId(targetId);
  };

  // --- PORT HANDLING (DISCONNECT & WIRE) ---

  const handlePortContextMenu = (id: string, type: 'input' | 'output', e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDisconnectData({
          nodeId: id,
          type,
          x: e.clientX,
          y: e.clientY
      });
      setActiveMenu('DISCONNECT');
  };

  // --- GLOBAL MOTION ---

  const handleGlobalMove = (e: React.MouseEvent) => {
      if (isPanning) {
          const dx = e.clientX - panStartRef.current.mouseX;
          const dy = e.clientY - panStartRef.current.mouseY;
          setViewport(prev => ({
              ...prev,
              x: panStartRef.current.x + dx,
              y: panStartRef.current.y + dy
          }));
      }

      if (dragState) {
          const deltaX = (e.clientX - dragState.mouseStartX) / viewport.zoom;
          const deltaY = (e.clientY - dragState.mouseStartY) / viewport.zoom;
          
          setDragState(prev => prev ? {
              ...prev,
              currentX: prev.startX + deltaX,
              currentY: prev.startY + deltaY
          } : null);
      }

      if (tempWire) {
          const worldPos = screenToWorld(e.clientX, e.clientY);
          setTempWire(prev => prev ? { ...prev, mouseX: worldPos.x, mouseY: worldPos.y } : null);
      }
  };

  const handleGlobalUp = () => {
      if (dragState) {
          const snappedX = Math.round(dragState.currentX / SNAP_SIZE) * SNAP_SIZE;
          const snappedY = Math.round(dragState.currentY / SNAP_SIZE) * SNAP_SIZE;
          setNodes(prev => prev.map(n => n.id === dragState.nodeId ? { ...n, position: { x: snappedX, y: snappedY } } : n));
          setDragState(null);
      }
      setIsPanning(false);
      // Don't cancel tempWire here, it's handled in onPortUp or background click
      if (tempWire && !activeMenu) setTempWire(null);
  };

  // --- WIRING ---

  const handlePortDown = (id: string, type: 'input' | 'output', e: React.MouseEvent) => {
      e.stopPropagation();
      if (e.button !== 0) return;
      const worldPos = screenToWorld(e.clientX, e.clientY);
      setTempWire({ startId: id, startType: type, mouseX: worldPos.x, mouseY: worldPos.y });
  };

  const handlePortUp = (id: string, type: 'input' | 'output', e: React.MouseEvent) => {
      e.stopPropagation();
      if (!tempWire) return;
      
      // Validation: Can't connect Input-to-Input or Output-to-Output, or Self
      if (tempWire.startId === id) {
          setTempWire(null);
          return;
      }
      if (tempWire.startType === type) {
          setTempWire(null);
          return; 
      }

      const source = tempWire.startType === 'output' ? tempWire.startId : id;
      const target = tempWire.startType === 'output' ? id : tempWire.startId;

      setPendingConnection({ source, target, x: e.clientX, y: e.clientY });
      setTempWire(null);
      setActiveMenu('CONNECTION');
  };

  const confirmConnection = (type: ConnectionType) => {
      if (pendingConnection) {
          // Remove duplicates
          const filtered = connections.filter(c => !(c.source === pendingConnection.source && c.target === pendingConnection.target));
          setConnections([...filtered, {
              id: `c_${Date.now()}`,
              source: pendingConnection.source,
              target: pendingConnection.target,
              type: type
          }]);
      }
      setPendingConnection(null);
      setActiveMenu(null);
  };

  // --- RENDER WIRE ---
  const renderWire = (x1: number, y1: number, x2: number, y2: number, type: ConnectionType, color: string, active: boolean, id?: string) => {
      let d = '';
      
      // CLAMPED INVERSE SCALING
      const strokeWidth = Math.max(1.5, Math.min(6, 2 / viewport.zoom));
      const hitWidth = Math.max(10, 20 / viewport.zoom); // Increased hit area

      switch (type) {
          case ConnectionType.STRAIGHT: 
              // Vector Logic: Point to center of Target Node
              // Target is at x2 + 12 (port offset) + 128 (half node width) = x2 + 140
              // Target Y is at y2 + 0 (port y)
              // But visually x2 is already the edge.
              
              const dx = (x2 + 140) - x1; 
              const dy = y2 - y1;
              const dist = Math.sqrt(dx*dx + dy*dy);
              
              // We want the arrow to stop 130px short of the center (approx node radius)
              // t is the percentage of the line to draw
              const safeDist = Math.max(0, dist - 130);
              const t = dist > 0 ? safeDist / dist : 0;
              
              const endX = x1 + dx * t;
              const endY = y1 + dy * t;
              
              d = `M ${x1} ${y1} L ${endX} ${endY}`; 
              break;
          case ConnectionType.STEP:
              const midX = x1 + (x2 - x1) / 2;
              d = `M ${x1} ${y1} L ${midX} ${y1} L ${midX} ${y2} L ${x2} ${y2}`;
              break;
          default:
              const cp1x = x1 + Math.abs(x2 - x1) * 0.5;
              const cp2x = x2 - Math.abs(x2 - x1) * 0.5;
              d = `M ${x1} ${y1} C ${cp1x} ${y1} ${cp2x} ${y2} ${x2} ${y2}`;
      }

      const common = { fill: 'none', opacity: active ? 1 : 0.6 };

      const hitbox = id ? (
        <path d={d} stroke="transparent" strokeWidth={hitWidth} fill="none" className="cursor-pointer pointer-events-auto"
            onClick={(e) => { 
                if (e.altKey) { 
                    e.stopPropagation(); 
                    setConnections(prev => prev.filter(c => c.id !== id)); 
                } 
            }}
        />
      ) : null;

      if (type === ConnectionType.DOUBLE) {
          return (
              <g key={id || 'temp'}>
                  {hitbox}
                  <path d={d} {...common} stroke={color} strokeWidth={strokeWidth + (4/viewport.zoom)} />
                  <path d={d} stroke="black" strokeWidth={strokeWidth} fill="none" />
              </g>
          );
      }
      if (type === ConnectionType.DOTTED) {
           return (
              <g key={id || 'temp'}>
                  {hitbox}
                  <path d={d} {...common} stroke={color} strokeWidth={strokeWidth} strokeDasharray={`${6/viewport.zoom},${6/viewport.zoom}`} />
              </g>
           );
      }
      if (type === ConnectionType.STRAIGHT) {
           return (
               <g key={id || 'temp'}>
                   {hitbox}
                   <path d={d} {...common} stroke={color} strokeWidth={strokeWidth} markerEnd="url(#arrow)" />
               </g>
           )
      }

      return (
          <g key={id || 'temp'}>
              {hitbox}
              {active && <path d={d} stroke={color} strokeWidth={strokeWidth*2} opacity={0.3} filter="url(#glow)" fill="none" />}
              <path d={d} {...common} stroke={color} strokeWidth={strokeWidth} />
          </g>
      );
  };

  // --- DISCONNECT MENU COMPONENT ---
  const renderDisconnectMenu = () => {
      if (activeMenu !== 'DISCONNECT' || !disconnectData) return null;

      const wires = connections.filter(c => 
          disconnectData.type === 'output' 
              ? c.source === disconnectData.nodeId 
              : c.target === disconnectData.nodeId
      );

      const handleDelete = (wireIds: string[]) => {
          setConnections(prev => prev.filter(c => !wireIds.includes(c.id)));
          if (wires.length === wireIds.length) setActiveMenu(null);
      };

      if (wires.length === 0) return null;

      return (
          <div 
            className="absolute bg-neutral-900 border border-white/10 rounded-xl shadow-2xl p-2 z-50 min-w-[200px]"
            style={{ top: disconnectData.y, left: disconnectData.x }}
          >
              <div className="px-2 py-1 text-[10px] font-mono text-neutral-500 mb-2 uppercase border-b border-white/5 pb-2">
                  Disconnect {disconnectData.type}
              </div>
              <div className="flex flex-col gap-1">
                  {wires.map(wire => {
                      const otherNode = nodes.find(n => n.id === (disconnectData.type === 'output' ? wire.target : wire.source));
                      return (
                          <div key={wire.id} className="flex items-center justify-between p-2 hover:bg-white/5 rounded text-xs group">
                                <span className="text-neutral-300 font-mono truncate max-w-[120px]">
                                    {otherNode?.label || 'Unknown'}
                                </span>
                                <button 
                                    onClick={() => handleDelete([wire.id])}
                                    className="text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <Unplug size={14} />
                                </button>
                          </div>
                      );
                  })}
              </div>
              <button 
                onClick={() => handleDelete(wires.map(w => w.id))}
                className="w-full mt-2 py-1.5 text-xs text-red-500 bg-red-500/10 hover:bg-red-500/20 rounded border border-red-500/20"
              >
                  Disconnect All
              </button>
               <button 
                className="w-full text-center px-3 py-2 text-[10px] font-mono text-neutral-500 hover:text-white mt-1"
                onClick={() => setActiveMenu(null)}
              >
                  CLOSE
              </button>
          </div>
      );
  };

  return (
    <div className="w-screen h-screen bg-black overflow-hidden flex flex-col text-white font-sans select-none">
      
      {/* HEADER */}
      <div className="h-12 bg-neutral-900/90 border-b border-white/10 flex items-center px-4 justify-between z-50">
          <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-600 rounded-full shadow-[0_0_10px_red]" />
              <span className="font-bold tracking-widest text-sm text-neutral-200">ANINODE <span className="text-neutral-600 text-xs">DESIGN SYS</span></span>
          </div>
          <div className="flex gap-4">
              <button 
                onClick={() => setActiveMenu(activeMenu === 'MAIN' ? null : 'MAIN')}
                className="bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-full text-xs flex items-center gap-2 transition-colors"
              >
                  <Plus size={14} /> Add Node
              </button>
          </div>
      </div>

      {/* CANVAS */}
      <div 
        ref={containerRef}
        className="flex-1 relative overflow-hidden bg-neutral-950 cursor-crosshair"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleGlobalMove}
        onMouseUp={handleGlobalUp}
        onContextMenu={(e) => { e.preventDefault(); setActiveMenu('MAIN'); }}
      >
        <div 
            className="absolute inset-0 pointer-events-none opacity-20"
            style={{
                transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
                transformOrigin: '0 0',
                backgroundImage: 'linear-gradient(#222 1px, transparent 1px), linear-gradient(90deg, #222 1px, transparent 1px)',
                backgroundSize: `${40 * viewport.zoom}px ${40 * viewport.zoom}`,
                backgroundPosition: `${viewport.x}px ${viewport.y}px`
            }}
        />

        <div 
            className="absolute top-0 left-0 w-full h-full origin-top-left"
            style={{ transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})` }}
        >
            <svg className="overflow-visible absolute top-0 left-0 w-full h-full pointer-events-none">
                <defs>
                    <marker id="arrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
                        <path d="M0,0 L0,6 L9,3 z" fill="#444" />
                    </marker>
                    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
                        <feMerge>
                            <feMergeNode in="coloredBlur"/>
                            <feMergeNode in="SourceGraphic"/>
                        </feMerge>
                    </filter>
                </defs>
                {connections.map(conn => {
                    const srcPos = getNodePosition(conn.source);
                    const tgtPos = getNodePosition(conn.target);
                    // GEOMETRY FIX:
                    // Node Width: 256. Output Port Right: -24. Port Center: 256 + 12 = 268.
                    // Input Port Left: -24. Port Center: -12.
                    // Y: Top 28 + HalfHeight 12 = 40.
                    const x1 = srcPos.x + 268; 
                    const y1 = srcPos.y + 40; 
                    const x2 = tgtPos.x - 12;
                    const y2 = tgtPos.y + 40;

                    const color = nodeColors.get(conn.source) || '#444';
                    const isActive = activeChainIds.has(conn.id);
                    const finalColor = isActive ? (nodeColors.get(conn.source) || '#fff') : '#333';

                    return renderWire(x1, y1, x2, y2, conn.type, finalColor, isActive, conn.id);
                })}
                {tempWire && (
                    renderWire(
                        tempWire.startType === 'output' ? getNodePosition(tempWire.startId).x + 268 : tempWire.mouseX, 
                        tempWire.startType === 'output' ? getNodePosition(tempWire.startId).y + 40 : tempWire.mouseY,
                        tempWire.startType === 'input' ? getNodePosition(tempWire.startId).x - 12 : tempWire.mouseX, 
                        tempWire.startType === 'input' ? getNodePosition(tempWire.startId).y + 40 : tempWire.mouseY,
                        ConnectionType.BEZIER, 
                        '#fff', 
                        true
                    )
                )}
            </svg>

            {nodes.map(node => {
                const isActiveChain = activeChainIds.has(node.id);
                const color = nodeColors.get(node.id);
                const pos = getNodePosition(node.id);
                const renderNodeData = { ...node, position: pos };

                return (
                    <div 
                        key={node.id}
                        onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                    >
                        <BaseNode 
                            data={renderNodeData}
                            isSelected={selectedId === node.id}
                            isActiveChain={isActiveChain}
                            accentColor={color}
                            zoom={viewport.zoom}
                            onSelect={setSelectedId}
                            onToggleCollapse={(id) => setNodes(n => n.map(x => x.id === id ? {...x, collapsed: !x.collapsed} : x))}
                            onPortDown={handlePortDown}
                            onPortUp={handlePortUp}
                            onPortContextMenu={handlePortContextMenu}
                        >
                             {node.type === NodeType.OSCILLATOR && (
                                <Visualizer type={node.config.type} frequency={node.config.frequency} amplitude={node.config.amplitude} active={isActiveChain} />
                            )}
                            {node.type === NodeType.PICKER && (
                                <div className="rounded overflow-hidden border border-white/5 relative group">
                                    <img src={node.config.src} className="w-full h-32 object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                                    {isActiveChain && <div className="absolute inset-0 border-2 animate-pulse" style={{ borderColor: color }} />}
                                </div>
                            )}
                            {node.type === NodeType.TRANSFORM && (
                                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                                    <div className="bg-neutral-900 p-2 rounded border border-white/5">
                                        <div className="text-neutral-500 mb-1">SCALE</div>
                                        <div>{node.config.scale}%</div>
                                    </div>
                                    <div className="bg-neutral-900 p-2 rounded border border-white/5">
                                        <div className="text-neutral-500 mb-1">ROT</div>
                                        <div>{node.config.rotation}°</div>
                                    </div>
                                </div>
                            )}
                             {node.type === NodeType.OUTPUT && (
                                <div className="h-24 bg-neutral-900 border border-white/5 border-dashed rounded flex flex-col items-center justify-center text-neutral-600">
                                    <Monitor size={24} />
                                    <span className="text-[10px] mt-2 font-mono">RENDER TARGET</span>
                                </div>
                            )}
                        </BaseNode>
                    </div>
                );
            })}
        </div>
      </div>

      <div className="absolute bottom-6 right-6 bg-black/80 backdrop-blur border border-white/10 rounded-lg px-4 py-2 flex items-center gap-4 text-xs font-mono text-neutral-400">
          <div className="flex items-center gap-2">
              <Move size={12} />
              <span>{Math.round(viewport.x)}, {Math.round(viewport.y)}</span>
          </div>
          <div className="w-px h-4 bg-white/10" />
          <div className="flex items-center gap-2">
              <ZoomIn size={12} />
              <span>{Math.round(viewport.zoom * 100)}%</span>
          </div>
      </div>

      <div className="absolute bottom-6 left-6 flex flex-col gap-2 pointer-events-none opacity-50">
         <div className="flex items-center gap-2 text-[10px] font-mono bg-black/50 p-1.5 rounded"><MousePointer2 size={10} /> PAN: SHIFT+SCROLL / DRAG</div>
         <div className="flex items-center gap-2 text-[10px] font-mono bg-black/50 p-1.5 rounded"><ZoomOut size={10} /> ZOOM: SCROLL</div>
         <div className="flex items-center gap-2 text-[10px] font-mono bg-black/50 p-1.5 rounded"><Command size={10} /> ALT+CLICK WIRE: DELETE</div>
      </div>

      {activeMenu === 'MAIN' && (
          <div className="absolute top-14 left-4 w-56 bg-neutral-900 border border-white/10 rounded-xl shadow-2xl p-1 z-50 animate-in fade-in zoom-in-95">
              {[NodeType.PICKER, NodeType.TRANSFORM, NodeType.OSCILLATOR, NodeType.LOGIC, NodeType.OUTPUT].map(t => (
                  <button 
                    key={t}
                    className="w-full text-left px-3 py-2 text-xs font-mono text-neutral-400 hover:text-white hover:bg-white/5 rounded flex items-center gap-2"
                    onClick={() => {
                        const id = `n_${Date.now()}`;
                        setNodes([...nodes, {
                            id, type: t, label: 'New ' + t, position: { x: -viewport.x/viewport.zoom + 400, y: -viewport.y/viewport.zoom + 300 },
                            config: t === NodeType.PICKER ? { src: 'https://picsum.photos/400' } : { scale: 100 }
                        }]);
                        setActiveMenu(null);
                    }}
                  >
                      <div className="w-1.5 h-1.5 bg-neutral-600 rounded-full" /> {t}
                  </button>
              ))}
          </div>
      )}

      {activeMenu === 'CONNECTION' && pendingConnection && (
          <div 
            className="absolute bg-neutral-900 border border-white/10 rounded-xl shadow-2xl p-1 z-50 min-w-[150px]"
            style={{ top: pendingConnection.y, left: pendingConnection.x }}
          >
              <div className="px-3 py-2 text-[10px] font-mono text-neutral-500 border-b border-white/5 mb-1">CABLE TYPE</div>
              {Object.values(ConnectionType).map(t => (
                  <button
                    key={t}
                    className="w-full text-left px-3 py-2 text-xs font-mono text-neutral-400 hover:text-white hover:bg-white/5 rounded"
                    onClick={() => confirmConnection(t)}
                  >
                      {t}
                  </button>
              ))}
          </div>
      )}

      {renderDisconnectMenu()}

      <SidePanel 
        selectedNode={nodes.find(n => n.id === selectedId) || null}
        onClose={() => setSelectedId(null)}
        onUpdate={(id, data) => setNodes(nodes.map(n => n.id === id ? { ...n, ...data } : n))}
      />

    </div>
  );
}