
import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { NodeData, Connection, NodeType, ConnectionType } from './types';
import { BaseNode, getTypeLabel } from './components/nodes/BaseNode';
import { SidePanel } from './components/SidePanel';
import { Visualizer } from './components/nodes/Visualizer';
import { 
  Plus, Settings, Command, Monitor, Trash2, X, MousePointer2, ZoomIn, ZoomOut, Move, Unplug, 
  CheckSquare, Square, Sun, Moon, Grid3X3, Grid, Box, Sliders, Hash, ToggleLeft, Copy, 
  Link as LinkIcon, Info, Unlink, Maximize, Scan, Undo, Redo, Clipboard
} from 'lucide-react';

const NEON_PALETTE = ['#00FFFF', '#FF00FF', '#00FF00', '#FFFF00', '#FF3333', '#FFA500', '#8A2BE2'];
const SNAP_SIZE = 20;

type GridType = 'DOTS' | 'LINES' | 'CROSS';

// History State Interface
interface HistoryState {
    nodes: NodeData[];
    connections: Connection[];
}

export default function App() {
  // --- STATE ---
  const [nodes, setNodes] = useState<NodeData[]>([
     { id: 'init_lfo', type: NodeType.OSCILLATOR, label: 'Master LFO', position: { x: 100, y: 100 }, config: { frequency: 1, amplitude: 1 } },
  ]);
  const [connections, setConnections] = useState<Connection[]>([]);
  
  // Selection & Clipboard
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [clipboard, setClipboard] = useState<NodeData[]>([]);

  // History
  const [history, setHistory] = useState<HistoryState[]>([{ nodes: [
     { id: 'init_lfo', type: NodeType.OSCILLATOR, label: 'Master LFO', position: { x: 100, y: 100 }, config: { frequency: 1, amplitude: 1 } },
  ], connections: [] }]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Appearance
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [gridType, setGridType] = useState<GridType>('CROSS');

  // Menus & Modals
  const [activeMenu, setActiveMenu] = useState<'MAIN' | 'CONNECTION' | 'DISCONNECT' | 'PORT' | null>(null);
  const [menuData, setMenuData] = useState<any>(null);
  const [isNodePickerOpen, setIsNodePickerOpen] = useState(false);
  const [pickerCounts, setPickerCounts] = useState<Record<string, number>>({});

  // Canvas
  const [viewport, setViewport] = useState({ x: 0, y: 0, zoom: 1 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Interaction
  const [dragState, setDragState] = useState<{ 
      nodeIds: string[], 
      startPositions: Record<string, {x: number, y: number}>,
      mouseStartX: number, 
      mouseStartY: number 
  } | null>(null);
  
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0, mouseX: 0, mouseY: 0 });

  // Wiring
  const [tempWire, setTempWire] = useState<{ startId: string, startType: 'input' | 'output', mouseX: number, mouseY: number, isHot?: boolean } | null>(null);
  const [propertyTeleportBuffer, setPropertyTeleportBuffer] = useState<{ nodeId: string, propKey: string } | null>(null);
  const [propertyContextMenu, setPropertyContextMenu] = useState<{ x: number, y: number, propKey: string, nodeId: string } | null>(null);

  // Update HTML class for Tailwind dark mode
  useEffect(() => {
    if (isDarkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [isDarkMode]);

  // --- HISTORY MANAGEMENT ---
  const pushHistory = (newNodes: NodeData[], newConnections: Connection[]) => {
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push({ nodes: newNodes, connections: newConnections });
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
  };

  const handleUndo = () => {
      if (historyIndex > 0) {
          const prev = history[historyIndex - 1];
          setNodes(prev.nodes);
          setConnections(prev.connections);
          setHistoryIndex(historyIndex - 1);
          // Update selection if selected nodes don't exist anymore
          setSelectedIds(new Set()); 
      }
  };

  const handleRedo = () => {
      if (historyIndex < history.length - 1) {
          const next = history[historyIndex + 1];
          setNodes(next.nodes);
          setConnections(next.connections);
          setHistoryIndex(historyIndex + 1);
          setSelectedIds(new Set());
      }
  };

  // --- MATH UTILS ---
  const getRayBoxIntersection = (x1: number, y1: number, x2: number, y2: number, boxW: number, boxH: number, margin: number) => {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const slope = dy / dx;
    const cx = x2;
    const cy = y2;
    const hw = boxW / 2;
    const hh = boxH / 2;
    let ix, iy;

    if (Math.abs(dx) > 0.001) {
        const signX = dx > 0 ? 1 : -1;
        ix = signX * hw;
        iy = slope * ix;
        if (Math.abs(iy) <= hh) return { x: cx - (ix + signX * margin), y: cy - iy };
    }
    if (Math.abs(dy) > 0.001) {
        const signY = dy > 0 ? 1 : -1;
        iy = signY * hh;
        ix = iy / slope;
        if (Math.abs(ix) <= hw) return { x: cx - ix, y: cy - (iy + signY * margin) };
    }
    return { x: cx, y: cy };
  };

  const screenToWorld = useCallback((screenX: number, screenY: number) => {
      return { x: (screenX - viewport.x) / viewport.zoom, y: (screenY - viewport.y) / viewport.zoom };
  }, [viewport]);

  const getNodePosition = useCallback((id: string) => {
      // If dragging, return tentative position
      if (dragState && dragState.nodeIds.includes(id)) {
          const startPos = dragState.startPositions[id];
          if (startPos) {
             const deltaX = (dragState.mouseStartX - dragState.mouseStartX) / viewport.zoom; // Wait, this is 0. 
             // We need current mouse pos. But we don't have it in callback.
             // Actually, we update nodes in real-time during drag? 
             // No, App_OLD updated dragState.currentX/Y.
             // Here we have multiple nodes.
             // Let's use the node's position from state, which we update during drag.
             const node = nodes.find(n => n.id === id);
             return node ? node.position : { x: 0, y: 0 };
          }
      }
      const node = nodes.find(n => n.id === id);
      return node ? node.position : { x: 0, y: 0 };
  }, [nodes, dragState]);

  // --- FOCUS LOGIC ---
  const fitView = (targetIds: string[] = []) => {
      const targets = targetIds.length > 0 
          ? nodes.filter(n => targetIds.includes(n.id))
          : nodes;
      
      if (targets.length === 0) return;

      const padding = 100;
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

      targets.forEach(n => {
          minX = Math.min(minX, n.position.x);
          minY = Math.min(minY, n.position.y);
          maxX = Math.max(maxX, n.position.x + 256); // Width
          maxY = Math.max(maxY, n.position.y + 128); // Height
      });

      const width = maxX - minX;
      const height = maxY - minY;
      const screenW = window.innerWidth;
      const screenH = window.innerHeight;

      const zoomX = (screenW - padding * 2) / width;
      const zoomY = (screenH - padding * 2) / height;
      const newZoom = Math.min(Math.max(Math.min(zoomX, zoomY), 0.2), 2);

      const centerX = minX + width / 2;
      const centerY = minY + height / 2;

      setViewport({
          x: screenW / 2 - centerX * newZoom,
          y: screenH / 2 - centerY * newZoom,
          zoom: newZoom
      });
  };

  // --- KEYBOARD SHORTCUTS ---
  useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
          // Focus
          if (e.key.toLowerCase() === 'f') {
              if (e.shiftKey) fitView([]); // Focus All
              else fitView(Array.from(selectedIds)); // Focus Selected
          }

          // Undo/Redo
          if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
              e.preventDefault();
              handleUndo();
          }
          if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
              e.preventDefault();
              handleRedo();
          }

          // Copy/Paste
          if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
              const selected = nodes.filter(n => selectedIds.has(n.id));
              if (selected.length > 0) setClipboard(selected);
          }
          if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
              if (clipboard.length > 0) {
                  const newNodes: NodeData[] = [];
                  const idMap = new Map<string, string>();
                  
                  // Calculate center of clipboard nodes
                  let minX = Infinity, minY = Infinity;
                  clipboard.forEach(n => { minX = Math.min(minX, n.position.x); minY = Math.min(minY, n.position.y); });
                  
                  // Paste at mouse position? Or center of screen? Center of screen for now.
                  const center = screenToWorld(window.innerWidth/2, window.innerHeight/2);
                  const offsetX = center.x - minX - 100; // Offset slightly
                  const offsetY = center.y - minY - 100;

                  clipboard.forEach(node => {
                      const newId = `n_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                      idMap.set(node.id, newId);
                      newNodes.push({
                          ...node,
                          id: newId,
                          position: { x: node.position.x + offsetX, y: node.position.y + offsetY },
                          label: node.label + ' (Copy)',
                          // Clear bindings on paste
                          boundProps: {} 
                      });
                  });

                  const updatedNodes = [...nodes, ...newNodes];
                  setNodes(updatedNodes);
                  setSelectedIds(new Set(newNodes.map(n => n.id)));
                  pushHistory(updatedNodes, connections);
              }
          }

          if (e.shiftKey && e.key === 'Tab') {
              e.preventDefault();
              setIsNodePickerOpen(prev => !prev);
              setPickerCounts({});
          }
          if (e.key === 'Delete' || e.key === 'Backspace') {
             if (selectedIds.size > 0) {
                 const newNodes = nodes.filter(n => !selectedIds.has(n.id));
                 const newConnections = connections.filter(c => !selectedIds.has(c.source) && !selectedIds.has(c.target));
                 setNodes(newNodes);
                 setConnections(newConnections);
                 setSelectedIds(new Set());
                 pushHistory(newNodes, newConnections);
             }
          }
          if (e.key === 'Escape') {
              setSelectedIds(new Set());
              if (tempWire?.isHot) setTempWire(null);
              setActiveMenu(null);
              setIsNodePickerOpen(false);
          }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIds, clipboard, nodes, connections, historyIndex, viewport]);

  // --- NODE OPERATIONS ---
  const addNode = (type: NodeType, x?: number, y?: number) => {
      const center = screenToWorld(window.innerWidth/2, window.innerHeight/2);
      const newNode: NodeData = {
           id: `n_${Date.now()}_${Math.random()}`,
           type,
           label: `New ${getTypeLabel(type)}`,
           position: { x: x ?? center.x - 128, y: y ?? center.y - 50 },
           config: type === NodeType.PICKER ? { src: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop' } : { min: 0, max: 100, step: 1, value: 50, enabled: true }
      };
      const newNodes = [...nodes, newNode];
      setNodes(newNodes);
      pushHistory(newNodes, connections);
      return newNode;
  };

  const handleNodePickerAdd = () => {
      const startX = viewport.x * -1 + 100;
      const startY = viewport.y * -1 + 100;
      let offset = 0;
      const newNodes = [...nodes];
      Object.entries(pickerCounts).forEach(([type, count]) => {
          for(let i=0; i<(count as number); i++) {
              newNodes.push({
                  id: `n_${Date.now()}_${Math.random()}`,
                  type: type as NodeType,
                  label: `New ${getTypeLabel(type as NodeType)}`,
                  position: { x: startX + offset * 50, y: startY + offset * 50 },
                  config: type === NodeType.PICKER ? { src: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop' } : { min: 0, max: 100, step: 1, value: 50, enabled: true }
              });
              offset++;
          }
      });
      setNodes(newNodes);
      pushHistory(newNodes, connections);
      setIsNodePickerOpen(false);
  };

  const handleBindProp = (nodeId: string, propKey: string, action: 'SEND' | 'RECEIVE' | 'UNBIND') => {
      if (action === 'SEND') {
          setPropertyTeleportBuffer({ nodeId, propKey });
      } else if (action === 'RECEIVE' && propertyTeleportBuffer) {
          const targetNode = nodes.find(n => n.id === nodeId);
          if (!targetNode) return;

          // Store original value for restoration
          const originalValue = targetNode.config[propKey];

          const connId = `c_tele_${Date.now()}`;
          const newConnections = [...connections, { id: connId, source: propertyTeleportBuffer.nodeId, target: nodeId, type: ConnectionType.STRAIGHT }];
          
          const newNodes = nodes.map(n => n.id === nodeId ? { 
              ...n, 
              boundProps: { 
                  ...n.boundProps, 
                  [propKey]: { 
                      targetNodeId: propertyTeleportBuffer.nodeId, 
                      targetProp: propertyTeleportBuffer.propKey,
                      originalValue: originalValue // Save original
                  } 
              } 
          } : n);

          setConnections(newConnections);
          setNodes(newNodes);
          pushHistory(newNodes, newConnections);
          setPropertyTeleportBuffer(null);

      } else if (action === 'UNBIND') {
          const targetNode = nodes.find(n => n.id === nodeId);
          if (!targetNode || !targetNode.boundProps?.[propKey]) return;

          const binding = targetNode.boundProps[propKey];
          
          // Restore original value
          const restoredConfig = { ...targetNode.config };
          if (binding.originalValue !== undefined) {
              restoredConfig[propKey] = binding.originalValue;
          }

          const { [propKey]: removed, ...remainingProps } = targetNode.boundProps;
          
          const newNodes = nodes.map(n => n.id === nodeId ? { 
              ...n, 
              config: restoredConfig,
              boundProps: remainingProps 
          } : n);

          // Remove telepathic connection
          const newConnections = connections.filter(c => !(c.type === ConnectionType.STRAIGHT && c.target === nodeId && c.source === binding.targetNodeId));

          setNodes(newNodes);
          setConnections(newConnections);
          pushHistory(newNodes, newConnections);
      }
  };

  // --- WIRING HANDLERS ---
  const handlePortDown = (id: string, type: 'input' | 'output', e: React.MouseEvent) => {
      e.stopPropagation();

      // Check if we are COMPLETING a hot wire
      if (tempWire && tempWire.isHot) {
          if (tempWire.startId !== id && tempWire.startType !== type) {
               const sourceId = tempWire.startType === 'output' ? tempWire.startId : id;
               const targetId = tempWire.startType === 'input' ? tempWire.startId : id;
               setMenuData({ source: sourceId, target: targetId, x: e.clientX, y: e.clientY });
               setActiveMenu('CONNECTION');
               setTempWire(null);
          }
          return;
      }

      if (e.shiftKey) {
          const worldPos = screenToWorld(e.clientX, e.clientY);
          setTempWire({ startId: id, startType: type, mouseX: worldPos.x, mouseY: worldPos.y, isHot: true });
          return;
      }
      const worldPos = screenToWorld(e.clientX, e.clientY);
      setTempWire({ startId: id, startType: type, mouseX: worldPos.x, mouseY: worldPos.y, isHot: false });
  };

  const handlePortUp = (id: string, type: 'input' | 'output', e: React.MouseEvent) => {
      e.stopPropagation();
      if (!tempWire) return;
      if (tempWire.startId === id || tempWire.startType === type) {
          if (!tempWire.isHot) setTempWire(null);
          return;
      }
      // Valid connection attempt
      const sourceId = tempWire.startType === 'output' ? tempWire.startId : id;
      const targetId = tempWire.startType === 'input' ? tempWire.startId : id;
      
      // Check if connection already exists
      if (connections.some(c => c.source === sourceId && c.target === targetId)) {
          setTempWire(null);
          return;
      }

      setMenuData({ source: sourceId, target: targetId, x: e.clientX, y: e.clientY });
      setActiveMenu('CONNECTION'); 
      setTempWire(null);
  };

  const nodeColors = useMemo(() => {
    const map = new Map<string, string>();
    const visited = new Set<string>();
    const traverse = (nodeId: string, color: string) => {
        if (visited.has(nodeId)) return;
        visited.add(nodeId);
        map.set(nodeId, color);
        connections.filter(c => c.source === nodeId).map(c => c.target).forEach(childId => traverse(childId, color));
    };
    let colorIndex = 0;
    nodes.filter(n => n.type === NodeType.PICKER).forEach(picker => {
        traverse(picker.id, NEON_PALETTE[colorIndex % NEON_PALETTE.length]);
        colorIndex++;
    });
    return map;
  }, [nodes, connections]);

  const activeChainIds = useMemo(() => {
    const chain = new Set<string>();
    const primarySelected = Array.from(selectedIds).pop();
    if (!primarySelected) return chain;
    const primaryId = primarySelected as string;
    
    const findParents = (id: string) => { if(chain.has(id)) return; chain.add(id); connections.filter(c => c.target === id).forEach(c => findParents(c.source)); };
    const findChildren = (id: string) => { if(chain.has(id)) return; chain.add(id); connections.filter(c => c.source === id).forEach(c => findChildren(c.target)); };
    
    findParents(primaryId);
    chain.clear(); chain.add(primaryId);
    connections.filter(c => c.target === primaryId).forEach(c => findParents(c.source));
    connections.filter(c => c.source === primaryId).forEach(c => findChildren(c.target));
    return chain;
  }, [selectedIds, connections]);

  // Synchronize property values for telepathic connections
  useEffect(() => {
      let changed = false;
      const newNodes = nodes.map(targetNode => {
          if (!targetNode.boundProps) return targetNode;
          
          const updatedConfig = { ...targetNode.config };
          let nodeChanged = false;

          Object.entries(targetNode.boundProps).forEach(([propKey, binding]: [string, any]) => {
              const sourceNode = nodes.find(n => n.id === binding.targetNodeId);
              if (sourceNode) {
                  let sourceValue = sourceNode.config[binding.targetProp];
                  
                  // Boolean/Decimal -> Percentage Logic
                  const maxVal = targetNode.config.max ?? 100;
                  const isPercentageTarget = 
                      (targetNode.type === NodeType.SLIDER && maxVal === 100) ||
                      (targetNode.type === NodeType.TRANSFORM && propKey === 'scale');

                  if (isPercentageTarget) {
                      if (typeof sourceValue === 'boolean') {
                          sourceValue = sourceValue ? 100 : 0;
                      } else if (typeof sourceValue === 'number' && sourceValue >= 0 && sourceValue <= 1) {
                          sourceValue = sourceValue * 100;
                      }
                  } else if (typeof sourceValue === 'boolean') {
                      sourceValue = sourceValue ? 1 : 0;
                  }

                  if (updatedConfig[propKey] !== sourceValue) {
                      updatedConfig[propKey] = sourceValue;
                      nodeChanged = true;
                  }
              }
          });
          
          if (nodeChanged) {
              changed = true;
              return { ...targetNode, config: updatedConfig };
          }
          return targetNode;
      });

      if (changed) {
          setNodes(newNodes);
      }
  }, [nodes]);

  const renderNodeContent = (node: NodeData) => {
      const updateConfig = (key: string, val: any) => {
          const newNodes = nodes.map(n => n.id === node.id ? { ...n, config: { ...n.config, [key]: val } } : n);
          setNodes(newNodes);
          // Don't push history on every keystroke/slide, maybe debounce? For now, just direct update.
          // Ideally we push history on blur or mouse up.
      };
      switch(node.type) {
          case NodeType.OSCILLATOR:
              return <Visualizer type="sine" frequency={node.config.frequency || 1} amplitude={node.config.amplitude || 1} active={true} isDarkMode={isDarkMode} />;
          case NodeType.PICKER:
              return (
                  <div className="w-full aspect-video bg-neutral-900 rounded-lg overflow-hidden relative group">
                       {node.config.src ? <img src={node.config.src} alt="Asset" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-neutral-700">No Asset</div>}
                  </div>
              );
          case NodeType.SLIDER:
              return (
                  <div className="pt-2">
                      <div className="flex justify-between text-xs font-mono mb-1 opacity-70">
                          <span>{node.config.min || 0}</span><span className="text-accent-red font-bold">{node.config.value}</span><span>{node.config.max || 100}</span>
                      </div>
                      <input type="range" min={node.config.min} max={node.config.max} step={node.config.step} value={node.config.value} onChange={(e) => updateConfig('value', parseFloat(e.target.value))} onMouseUp={() => pushHistory(nodes, connections)} className="w-full h-1 bg-neutral-200 dark:bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-accent-red" onMouseDown={(e) => e.stopPropagation()} />
                  </div>
              );
          case NodeType.NUMBER:
              return (
                  <div className="pt-1"><input type="number" value={node.config.value} onChange={(e) => updateConfig('value', parseFloat(e.target.value))} onBlur={() => pushHistory(nodes, connections)} className={`w-full bg-transparent border-b ${isDarkMode ? 'border-white/20 text-white' : 'border-black/20 text-black'} font-mono text-lg focus:outline-none focus:border-accent-red transition-colors`} onMouseDown={(e) => e.stopPropagation()} /></div>
              );
          case NodeType.BOOLEAN:
              return (
                  <div className="flex items-center justify-between pt-1" onMouseDown={(e) => e.stopPropagation()}>
                      <span className="text-xs font-mono opacity-50">{node.config.enabled ? 'ON' : 'OFF'}</span>
                      <button onClick={() => { updateConfig('enabled', !node.config.enabled); pushHistory(nodes, connections); }} className={`w-10 h-5 rounded-full relative transition-colors ${node.config.enabled ? 'bg-accent-red' : (isDarkMode ? 'bg-neutral-700' : 'bg-neutral-300')}`}><div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${node.config.enabled ? 'left-6' : 'left-1'}`} /></button>
                  </div>
              );
          case NodeType.CLONE:
              return <div className="h-8 flex items-center justify-center gap-2 opacity-50"><Copy size={12} /><span className="text-xs font-mono">Linked Instance</span></div>;
          default: return <div className="h-8 flex items-center justify-center text-xs opacity-30 font-mono uppercase">{node.type}</div>;
      }
  };

  return (
    <div 
      id="canvas-bg"
      className={`w-full h-screen overflow-hidden select-none relative ${isDarkMode ? 'bg-black text-white' : 'bg-[#F5F5F5] text-neutral-900'}`}
      onMouseMove={(e) => {
          // PANNING
          if (isPanning) {
              const dx = e.clientX - panStartRef.current.mouseX;
              const dy = e.clientY - panStartRef.current.mouseY;
              setViewport(prev => ({
                  ...prev,
                  x: panStartRef.current.x + dx,
                  y: panStartRef.current.y + dy
              }));
          }
          // DRAGGING NODES
          if (dragState) {
              const dx = (e.clientX - dragState.mouseStartX) / viewport.zoom;
              const dy = (e.clientY - dragState.mouseStartY) / viewport.zoom;
              
              setNodes(prev => prev.map(n => {
                  if (dragState.nodeIds.includes(n.id)) {
                      const start = dragState.startPositions[n.id];
                      return { ...n, position: { x: start.x + dx, y: start.y + dy } };
                  }
                  return n;
              }));
          }
          // WIRING
          if (tempWire) {
              const worldPos = screenToWorld(e.clientX, e.clientY);
              setTempWire(prev => prev ? { ...prev, mouseX: worldPos.x, mouseY: worldPos.y } : null);
          }
      }}
      onMouseUp={(e) => {
          if (isPanning) {
             const dist = Math.sqrt(Math.pow(e.clientX - panStartRef.current.mouseX, 2) + Math.pow(e.clientY - panStartRef.current.mouseY, 2));
             if (dist < 5) setSelectedIds(new Set());
          }
          setIsPanning(false);
          
          if (dragState) {
              // Snap all dragged nodes
              const newNodes = nodes.map(n => {
                  if (dragState.nodeIds.includes(n.id)) {
                      return { 
                          ...n, 
                          position: { 
                              x: Math.round(n.position.x / SNAP_SIZE) * SNAP_SIZE, 
                              y: Math.round(n.position.y / SNAP_SIZE) * SNAP_SIZE 
                          } 
                      };
                  }
                  return n;
              });
              setNodes(newNodes);
              pushHistory(newNodes, connections);
              setDragState(null);
          }
          if (tempWire && !tempWire.isHot) setTempWire(null);
      }}
      onWheel={(e) => {
        if (e.shiftKey) { setViewport(prev => ({ ...prev, x: prev.x - e.deltaY, y: prev.y - e.deltaX })); return; }
        const zoomSensitivity = 0.001;
        const delta = -e.deltaY * zoomSensitivity;
        const newZoom = Math.min(Math.max(viewport.zoom + delta, 0.2), 3);
        const worldX = (e.clientX - viewport.x) / viewport.zoom;
        const worldY = (e.clientY - viewport.y) / viewport.zoom;
        const newX = e.clientX - worldX * newZoom;
        const newY = e.clientY - worldY * newZoom;
        setViewport({ x: newX, y: newY, zoom: newZoom });
      }}
      onMouseDown={(e) => {
          setPropertyContextMenu(null);
          if (!dragState) {
              setIsPanning(true); 
              panStartRef.current = { x: viewport.x, y: viewport.y, mouseX: e.clientX, mouseY: e.clientY }; 
          }
      }}
    >
        {/* GRID BACKGROUND */}
        <div className="absolute inset-0 pointer-events-none opacity-20" style={{ backgroundPosition: `${viewport.x}px ${viewport.y}px`, backgroundSize: `${SNAP_SIZE * viewport.zoom}px ${SNAP_SIZE * viewport.zoom}px`, backgroundImage: gridType === 'DOTS' ? `radial-gradient(${isDarkMode ? '#444' : '#999'} 2px, transparent 2px)` : `linear-gradient(${isDarkMode ? '#333' : '#BBB'} 1.5px, transparent 1.5px), linear-gradient(90deg, ${isDarkMode ? '#333' : '#BBB'} 1.5px, transparent 1.5px)` }} />

      <div ref={containerRef} className="absolute inset-0 z-10 origin-top-left pointer-events-none" style={{ transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})` }}>
        {/* WIRES */}
        <svg className="absolute left-0 top-0 overflow-visible pointer-events-none z-10">
            <defs>
                 <marker id="arrow-head" markerWidth="6" markerHeight="6" refX="0" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill={isDarkMode ? "#666" : "#999"} /></marker>
            </defs>
            {connections.map(conn => {
                const s = getNodePosition(conn.source);
                const t = getNodePosition(conn.target);
                let d = "";
                let strokeWidth = Math.max(1.5, Math.min(6, 2 / viewport.zoom));
                let strokeDash = "none";
                let markerEnd = "none";
                let strokeColor = isDarkMode ? "#666" : "#999";

                // Telepathic Arrow
                if (conn.type === ConnectionType.STRAIGHT) {
                    const sw = 256; const sh = 100; const scx = s.x + sw/2; const scy = s.y + sh/2; const tcx = t.x + sw/2; const tcy = t.y + sh/2;
                    const end = getRayBoxIntersection(scx, scy, tcx, tcy, 256, 128, 5 / viewport.zoom);
                    const start = getRayBoxIntersection(tcx, tcy, scx, scy, 256, 128, 5 / viewport.zoom);
                    d = `M ${start.x} ${start.y} L ${end.x} ${end.y}`;
                    strokeWidth = Math.max(1, 1.5 / viewport.zoom);
                    strokeDash = `${5/viewport.zoom} ${5/viewport.zoom}`;
                    markerEnd = "url(#arrow-head)";
                
                // Orthogonal Step
                } else if (conn.type === ConnectionType.STEP) {
                    const sx = s.x + 272; const sy = s.y + 40; const tx = t.x - 16; const ty = t.y + 40;
                    const midX = sx + (tx - sx) / 2;
                    d = `M ${sx} ${sy} L ${midX} ${sy} L ${midX} ${ty} L ${tx} ${ty}`;
                
                // Dotted Bezier
                } else if (conn.type === ConnectionType.DOTTED) {
                    d = `M ${s.x + 272} ${s.y + 40} C ${s.x + 272 + 100} ${s.y + 40} ${t.x - 16 - 100} ${t.y + 40} ${t.x - 16} ${t.y + 40}`;
                    strokeDash = `${10/viewport.zoom} ${10/viewport.zoom}`;
                
                // Default & Double
                } else {
                    d = `M ${s.x + 272} ${s.y + 40} C ${s.x + 272 + 100} ${s.y + 40} ${t.x - 16 - 100} ${t.y + 40} ${t.x - 16} ${t.y + 40}`;
                }

                const isDouble = conn.type === ConnectionType.DOUBLE;

                return (
                    <g key={conn.id}>
                        <path d={d} stroke="transparent" strokeWidth={15 / viewport.zoom} fill="none" className="pointer-events-auto cursor-pointer" onClick={(e) => { if(e.altKey) { setConnections(prev => prev.filter(c => c.id !== conn.id)); pushHistory(nodes, connections.filter(c => c.id !== conn.id)); } }} />
                        {isDouble ? (
                            <>
                                <path d={d} stroke={strokeColor} strokeWidth={strokeWidth * 3} fill="none" strokeLinecap="round" className="pointer-events-none" />
                                <path d={d} stroke={isDarkMode ? '#000000' : '#F5F5F5'} strokeWidth={strokeWidth} fill="none" strokeLinecap="round" className="pointer-events-none" />
                            </>
                        ) : (
                            <path d={d} stroke={strokeColor} strokeWidth={strokeWidth} fill="none" strokeDasharray={strokeDash} markerEnd={markerEnd} strokeLinecap="round" className="pointer-events-none" />
                        )}
                    </g>
                )
            })}
             {tempWire && (
                <path d={`M ${tempWire.startType === 'output' ? getNodePosition(tempWire.startId).x + 272 : getNodePosition(tempWire.startId).x - 16} ${getNodePosition(tempWire.startId).y + 40} L ${tempWire.mouseX} ${tempWire.mouseY}`} stroke={isDarkMode ? "#666" : "#999"} strokeWidth={2 / viewport.zoom} strokeDasharray="5 5" fill="none" />
            )}
        </svg>

        {nodes.map(node => (
            <BaseNode 
                key={node.id} 
                data={node}
                isSelected={selectedIds.has(node.id)}
                isActiveChain={activeChainIds.has(node.id)}
                accentColor={nodeColors.get(node.id)}
                zoom={viewport.zoom}
                isDarkMode={isDarkMode}
                isHotConnectionSource={tempWire?.startId === node.id}
                onSelect={(id) => {
                    // Handled in onNodeDown mostly, but here for click
                    // If not dragging, this fires.
                    // But we handle selection in onNodeDown to allow drag-select.
                }}
                onToggleCollapse={(id) => setNodes(p => p.map(n => n.id === id ? { ...n, collapsed: !n.collapsed } : n))}
                onPortDown={handlePortDown}
                onPortUp={handlePortUp}
                onPortContextMenu={(id, type, e) => { setMenuData({ nodeId: id, type, x: e.clientX, y: e.clientY }); setActiveMenu('DISCONNECT'); }}
                onPortDoubleClick={(id, type, e) => { 
                    // FILTER LOGIC
                    // If Output -> Show only Inputs (exclude Picker, Oscillator, Slider, Number, Boolean)
                    // If Input -> Show only Outputs (exclude Output)
                    // Actually, let's just show all but filter visually or logically?
                    // User asked: "offer only nodes that have input/output"
                    // We'll pass a filterType to the menu
                    setMenuData({ nodeId: id, type, x: e.clientX, y: e.clientY }); 
                    setActiveMenu('PORT'); 
                }}
                onNodeDown={(e) => { 
                    e.stopPropagation(); 
                    
                    let newSelected = new Set(selectedIds);
                    if (e.shiftKey) {
                        if (newSelected.has(node.id)) newSelected.delete(node.id);
                        else newSelected.add(node.id);
                    } else {
                        if (!newSelected.has(node.id)) {
                            newSelected = new Set([node.id]);
                        }
                    }
                    setSelectedIds(newSelected);

                    // Alt+Drag: Duplicate
                    if (e.altKey) {
                        const nodesToDuplicate = nodes.filter(n => newSelected.has(n.id));
                        const newNodes: NodeData[] = [];
                        const idMap = new Map<string, string>();

                        nodesToDuplicate.forEach(n => {
                            const newId = `n_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                            idMap.set(n.id, newId);
                            newNodes.push({
                                ...n,
                                id: newId,
                                label: n.label + ' (Copy)',
                                position: { x: n.position.x + 50, y: n.position.y + 50 },
                                boundProps: { ...n.boundProps }
                            });
                        });

                        const updatedNodes = [...nodes, ...newNodes];
                        setNodes(updatedNodes);
                        
                        // Copy INPUT connections for duplicated nodes
                        const newConns: Connection[] = [];
                        nodesToDuplicate.forEach(n => {
                            const inputs = connections.filter(c => c.target === n.id);
                            inputs.forEach(c => {
                                newConns.push({
                                    ...c,
                                    id: `c_${Date.now()}_${Math.random()}`,
                                    target: idMap.get(n.id)!
                                });
                            });
                        });
                        
                        const updatedConns = [...connections, ...newConns];
                        setConnections(updatedConns);
                        pushHistory(updatedNodes, updatedConns);

                        const newSelection = new Set(newNodes.map(n => n.id));
                        setSelectedIds(newSelection);

                        // Start Dragging New Nodes
                        const startPositions: Record<string, {x: number, y: number}> = {};
                        newNodes.forEach(n => startPositions[n.id] = { x: n.position.x, y: n.position.y });
                        setDragState({ nodeIds: Array.from(newSelection), startPositions, mouseStartX: e.clientX, mouseStartY: e.clientY });

                    } else {
                        // Start Dragging Selected Nodes
                        const startPositions: Record<string, {x: number, y: number}> = {};
                        nodes.filter(n => newSelected.has(n.id)).forEach(n => startPositions[n.id] = { x: n.position.x, y: n.position.y });
                        setDragState({ nodeIds: Array.from(newSelected), startPositions, mouseStartX: e.clientX, mouseStartY: e.clientY });
                    }
                }}
            >
                {renderNodeContent(node)}
            </BaseNode>
        ))}
      </div>
      
      {/* UI HEADER */}
      <div className={`fixed top-0 left-0 right-0 h-14 border-b flex items-center justify-between px-4 z-50 backdrop-blur-md ${isDarkMode ? 'bg-black/80 border-white/10' : 'bg-white/80 border-neutral-200'}`} onMouseDown={e => e.stopPropagation()}>
          <div className="flex items-center gap-4">
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-accent-red animate-pulse" /><span className="font-bold tracking-tight">ANINODE</span><span className="text-xs font-mono opacity-50 border px-1 rounded">SYS.0.2</span></div>
              <div className={`h-6 w-px ${isDarkMode ? 'bg-white/10' : 'bg-neutral-300'}`} />
              <button onClick={() => { setIsNodePickerOpen(true); setPickerCounts({}); }} className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${isDarkMode ? 'hover:bg-white/10' : 'hover:bg-neutral-100'}`}><Plus size={14} /> Add Node</button>
              <div className={`h-6 w-px ${isDarkMode ? 'bg-white/10' : 'bg-neutral-300'}`} />
              <div className="flex items-center gap-1">
                  <button onClick={handleUndo} className={`p-1.5 rounded hover:bg-white/10 ${historyIndex === 0 ? 'opacity-30' : ''}`}><Undo size={14}/></button>
                  <button onClick={handleRedo} className={`p-1.5 rounded hover:bg-white/10 ${historyIndex === history.length - 1 ? 'opacity-30' : ''}`}><Redo size={14}/></button>
              </div>
          </div>
          <div className="flex items-center gap-2">
              <div className={`flex items-center p-1 rounded-lg border ${isDarkMode ? 'border-white/10 bg-black/50' : 'border-neutral-200 bg-neutral-50'}`}>
                   <button onClick={() => setGridType('DOTS')} className={`p-1.5 rounded ${gridType === 'DOTS' ? (isDarkMode ? 'bg-white/20' : 'bg-white shadow') : ''}`}><Grid3X3 size={14}/></button>
                   <button onClick={() => setGridType('LINES')} className={`p-1.5 rounded ${gridType === 'LINES' ? (isDarkMode ? 'bg-white/20' : 'bg-white shadow') : ''}`}><Grid size={14}/></button>
                   <button onClick={() => setGridType('CROSS')} className={`p-1.5 rounded ${gridType === 'CROSS' ? (isDarkMode ? 'bg-white/20' : 'bg-white shadow') : ''}`}><Plus size={14}/></button>
              </div>
              <button onClick={() => setIsDarkMode(!isDarkMode)} className={`p-2 rounded-lg border transition-colors ${isDarkMode ? 'border-white/10 hover:bg-white/10' : 'border-neutral-200 hover:bg-neutral-100'}`}>{isDarkMode ? <Moon size={16} /> : <Sun size={16} />}</button>
          </div>
      </div>

      {/* COMMAND LEGEND */}
      <div className={`fixed bottom-4 left-4 p-4 rounded-xl border backdrop-blur-sm z-40 pointer-events-none ${isDarkMode ? 'bg-black/50 border-white/10 text-neutral-400' : 'bg-white/50 border-neutral-200 text-neutral-600'}`}>
          <div className="text-[10px] font-mono space-y-1">
              <div className="flex items-center gap-2"><Command size={10} /> <span>SHIFT + TAB : Node Picker</span></div>
              <div className="flex items-center gap-2"><MousePointer2 size={10} /> <span>SHIFT + CLICK : Multi Select</span></div>
              <div className="flex items-center gap-2"><Move size={10} /> <span>DRAG BG : Pan Canvas</span></div>
              <div className="flex items-center gap-2"><Maximize size={10} /> <span>SHIFT + F : Focus All</span></div>
              <div className="flex items-center gap-2"><Scan size={10} /> <span>F : Focus Selected</span></div>
              <div className="flex items-center gap-2"><Copy size={10} /> <span>CTRL + C/V : Copy/Paste</span></div>
              <div className="flex items-center gap-2"><Undo size={10} /> <span>CTRL + Z/Y : Undo/Redo</span></div>
          </div>
      </div>

      {/* NODE PICKER MODAL */}
      {isNodePickerOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center" onMouseDown={e => e.stopPropagation()}>
              <div className={`w-[600px] h-[400px] rounded-2xl border shadow-2xl flex flex-col ${isDarkMode ? 'bg-neutral-900 border-white/10' : 'bg-white border-neutral-200'}`}>
                  <div className="p-6 border-b flex justify-between items-center">
                      <h2 className="text-xl font-bold tracking-tight">Add Nodes</h2>
                      <div className="flex gap-2">
                        {Object.keys(pickerCounts).length > 0 && <button onClick={handleNodePickerAdd} className="bg-accent-red text-white px-4 py-2 rounded text-xs font-bold">ADD SELECTED</button>}
                        <button onClick={() => setIsNodePickerOpen(false)}><X /></button>
                      </div>
                  </div>
                  <div className="grid grid-cols-4 gap-4 p-6 overflow-y-auto">
                      {Object.values(NodeType).map(type => (
                          <div key={type} className={`aspect-square rounded-xl border flex flex-col items-center justify-center cursor-pointer transition-all relative ${isDarkMode ? 'border-white/10 hover:bg-white/5' : 'border-neutral-200 hover:bg-neutral-50'}`} onClick={(e) => { if (e.shiftKey) { setPickerCounts(p => ({ ...p, [type]: (p[type] || 0) + 1 })); } else { addNode(type); setIsNodePickerOpen(false); } }}>
                              <Box size={24} className="mb-2 opacity-50" /><span className="text-xs font-mono font-bold">{getTypeLabel(type)}</span>
                              {pickerCounts[type] > 0 && <div className="absolute top-2 right-2 bg-accent-red text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">{pickerCounts[type]}</div>}
                          </div>
                      ))}
                  </div>
              </div>
          </div>
      )}
      
      {/* MENUS */}
      {activeMenu === 'PORT' && menuData && (
          <div className="fixed z-[100] w-48 bg-black border border-neutral-800 rounded-lg shadow-xl" style={{ left: menuData.x, top: menuData.y }} onMouseDown={e => e.stopPropagation()}>
              {Object.values(NodeType)
                .filter(type => {
                    // Filter logic:
                    // If source is Output, target must have Input.
                    // If source is Input, target must have Output.
                    if (menuData.type === 'output') {
                        // Exclude generators that typically don't have inputs (Picker, Oscillator, Slider, Number, Boolean)
                        // Include Transform, Logic, Output
                        return [NodeType.TRANSFORM, NodeType.LOGIC, NodeType.OUTPUT].includes(type);
                    } else {
                        // Exclude Output node (no output)
                        return type !== NodeType.OUTPUT;
                    }
                })
                .map(type => (
                  <button key={type} className="block w-full text-left px-4 py-2 text-xs text-white hover:bg-white/10" onClick={() => { 
                      const pos = getNodePosition(menuData.nodeId); 
                      // Place to Right if Output, Left if Input
                      const offset = menuData.type === 'output' ? 300 : -300;
                      const newNode = addNode(type, pos.x + offset, pos.y); 
                      
                      const newConns = [...connections, { 
                          id: `c_${Date.now()}`, 
                          source: menuData.type === 'output' ? menuData.nodeId : newNode.id, 
                          target: menuData.type === 'output' ? newNode.id : menuData.nodeId, 
                          type: ConnectionType.BEZIER 
                      }];
                      setConnections(newConns);
                      pushHistory([...nodes, newNode], newConns);
                      setActiveMenu(null); 
                  }}>
                      {getTypeLabel(type)}
                  </button>
              ))}
          </div>
      )}
      {activeMenu === 'DISCONNECT' && menuData && (
          <div className="fixed z-[100] w-56 bg-black border border-neutral-800 rounded-lg shadow-xl p-2" style={{ left: menuData.x, top: menuData.y }} onMouseDown={e => e.stopPropagation()}>
              <div className="text-xs font-bold text-neutral-500 mb-2 px-2 uppercase tracking-wider">Connected</div>
              {connections.filter(c => c.source === menuData.nodeId || c.target === menuData.nodeId).map(c => (<div key={c.id} className="flex items-center gap-2 px-2 py-1 hover:bg-white/10 rounded cursor-pointer" onClick={() => { 
                  const newConns = connections.filter(x => x.id !== c.id);
                  setConnections(newConns); 
                  pushHistory(nodes, newConns);
                  setActiveMenu(null); 
              }}><div className="w-3 h-3 border border-accent-red bg-accent-red rounded flex items-center justify-center"><X size={8} className="text-white" /></div><span className="text-xs font-mono text-white truncate flex-1">Wire {c.id.slice(-4)}</span></div>))}
          </div>
      )}
      {activeMenu === 'CONNECTION' && menuData && (
          <div className="fixed z-[100] w-40 bg-black border border-neutral-800 rounded-lg shadow-xl" style={{ left: menuData.x, top: menuData.y }} onMouseDown={e => e.stopPropagation()}>{Object.values(ConnectionType).map(type => (<button key={type} className="block w-full text-left px-4 py-2 text-xs text-white hover:bg-white/10" onClick={() => { 
              const newConns = [...connections, { id: `c_${Date.now()}`, source: menuData.source, target: menuData.target, type }];
              setConnections(newConns); 
              pushHistory(nodes, newConns);
              setActiveMenu(null); 
          }}>{type}</button>))}</div>
      )}

      <SidePanel 
        selectedNode={nodes.find(n => n.id === Array.from(selectedIds).pop()) || null} 
        onClose={() => setSelectedIds(new Set())} 
        onUpdate={(id, d) => {
            const newNodes = nodes.map(n => n.id === id ? { ...n, ...d } : n);
            setNodes(newNodes);
            // pushHistory? Maybe not on every update.
        }}
        onBindProp={handleBindProp}
        isDarkMode={isDarkMode}
        boundProps={nodes.find(n => n.id === Array.from(selectedIds).pop())?.boundProps || {}}
        onContextMenu={setPropertyContextMenu}
      />

      {/* Property Context Menu - Rendered at Root Level */}
      {propertyContextMenu && (() => {
        const selectedNode = nodes.find(n => n.id === propertyContextMenu.nodeId);
        const isBound = selectedNode?.boundProps?.[propertyContextMenu.propKey];
        const sourceBinding = isBound ? selectedNode.boundProps[propertyContextMenu.propKey] : null;
        
        return (
          <div 
            className={`fixed rounded-lg shadow-xl border overflow-hidden z-[200] min-w-[200px] ${isDarkMode ? 'bg-black border-neutral-800' : 'bg-white border-neutral-200'}`}
            style={{ left: propertyContextMenu.x, top: propertyContextMenu.y }}
            onClick={(e) => e.stopPropagation()}
            onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); }}
            onMouseDown={(e) => e.stopPropagation()}
          >
              <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider opacity-50 border-b border-white/10">Teleport Property</div>
              
              {isBound ? (
                <>
                  <div className="px-4 py-2 text-[10px] text-accent-red border-b border-white/5">
                    <div className="flex items-center gap-1">
                      <LinkIcon size={10} />
                      <span>Bound to: {sourceBinding?.targetProp}</span>
                    </div>
                  </div>
                  <button 
                    className={`flex items-center gap-2 w-full text-left px-4 py-2.5 text-xs font-mono hover:bg-red-600 hover:text-white transition-colors ${isDarkMode ? 'text-white' : 'text-neutral-900'}`}
                    onClick={(e) => { e.stopPropagation(); handleBindProp(propertyContextMenu.nodeId, propertyContextMenu.propKey, 'UNBIND'); setPropertyContextMenu(null); }}
                  >
                      <Unlink size={12} /> Unbind Property
                  </button>
                </>
              ) : (
                <>
                  <button 
                    className={`flex items-center gap-2 w-full text-left px-4 py-2.5 text-xs font-mono hover:bg-accent-red hover:text-white transition-colors ${isDarkMode ? 'text-white' : 'text-neutral-900'}`}
                    onClick={(e) => { e.stopPropagation(); handleBindProp(propertyContextMenu.nodeId, propertyContextMenu.propKey, 'SEND'); setPropertyContextMenu(null); }}
                  >
                      <LinkIcon size={12} /> Send "{propertyContextMenu.propKey}"
                  </button>
                  {propertyTeleportBuffer && (
                    <button 
                      className={`flex items-center gap-2 w-full text-left px-4 py-2.5 text-xs font-mono hover:bg-accent-red hover:text-white transition-colors ${isDarkMode ? 'text-white' : 'text-neutral-900'}`}
                      onClick={(e) => { e.stopPropagation(); handleBindProp(propertyContextMenu.nodeId, propertyContextMenu.propKey, 'RECEIVE'); setPropertyContextMenu(null); }}
                    >
                        <Unlink size={12} /> Receive "{propertyTeleportBuffer.propKey}" here
                    </button>
                  )}
                </>
              )}
          </div>
        );
      })()}
    </div>
  );
}
