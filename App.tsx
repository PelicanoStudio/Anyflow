import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useSnapshot } from 'valtio';
import { graphState, graphActions } from './src/core/store';
import { NodeData, Connection, NodeType, ConnectionType, GridType } from './types';
import { BaseNode } from './components/nodes/BaseNode';
import { getTypeLabel } from './src/utils/nodeUtils';
import { SidePanel } from './components/SidePanel';
import { isMobileOrTablet } from './utils/deviceDetection';
import { getRayBoxIntersection } from './utils/geometry';
import { getMenuPosition } from './utils/menuPosition';
import { ShortcutsPanel } from './components/ui/ShortcutsPanel';
import { Header } from './components/ui/Header';
import { NodePicker } from './components/ui/NodePicker';
import { CanvasBackground } from './components/canvas/CanvasBackground';
import { ConnectionLine } from './components/canvas/ConnectionLine';
// NodeContent is now internal to BaseNode, so we don't import it here
import { usePinchZoom } from './hooks/usePinchZoom';
import { Link as LinkIcon, Unlink } from 'lucide-react';
import { 
  getWire, 
  portLayout,
  zIndex,
  neonPalette,
  canvasLayout,
  nodeLayout
} from './src/tokens';

const NEON_PALETTE = neonPalette;
const SNAP_SIZE = canvasLayout.snapSize;

export default function App() {
  const snap = useSnapshot(graphState);
  
  // Local UI state
  const [activeMenu, setActiveMenu] = useState<'MAIN' | 'CONNECTION' | 'DISCONNECT' | 'PORT' | null>(null);
  const [menuData, setMenuData] = useState<any>(null);
  const [isNodePickerOpen, setIsNodePickerOpen] = useState(false);
  const [pickerCounts, setPickerCounts] = useState<Record<string, number>>({});
  
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0, mouseX: 0, mouseY: 0 });

  const [tempWire, setTempWire] = useState<{ startId: string, startType: 'input' | 'output', mouseX: number, mouseY: number, isHot?: boolean } | null>(null);
  const [propertyTeleportBuffer, setPropertyTeleportBuffer] = useState<{ nodeId: string, propKey: string } | null>(null);
  const [propertyContextMenu, setPropertyContextMenu] = useState<{ x: number, y: number, propKey: string, nodeId: string } | null>(null);

  // --- VIEWPORT CULLING ---
  const visibleNodes = useMemo(() => {
    const viewportW = window.innerWidth / snap.viewport.zoom;
    const viewportH = window.innerHeight / snap.viewport.zoom;
    const viewportX = -snap.viewport.x / snap.viewport.zoom;
    const viewportY = -snap.viewport.y / snap.viewport.zoom;
    const buffer = 500;

    return snap.nodes.filter(node => {
        const w = node.dimensions?.width || nodeLayout.width;
        const h = node.dimensions?.height || nodeLayout.defaultHeight;
        return (
            node.position.x + w > viewportX - buffer &&
            node.position.x < viewportX + viewportW + buffer &&
            node.position.y + h > viewportY - buffer &&
            node.position.y < viewportY + viewportH + buffer
        );
    });
  }, [snap.nodes, snap.viewport]);

  usePinchZoom(snap.viewport, graphActions.setViewport, containerRef);

  useEffect(() => {
    if (snap.isDarkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [snap.isDarkMode]);

  // --- STABLE HELPERS ---
  // Read directly from graphState to avoid dependencies used in Event Handlers
  const screenToWorld = useCallback((screenX: number, screenY: number) => {
      // Use latest state, not snapshot, to be safe in async/callbacks? 
      // Actually snapshot is fine for render, but for callbacks let's read proxy or assume consistency.
      const { x, y, zoom } = graphState.viewport;
      return { x: (screenX - x) / zoom, y: (screenY - y) / zoom };
  }, []);

  const getNodePosition = (id: string) => {
      const node = graphState.nodes.find(n => n.id === id);
      return node ? node.position : { x: 0, y: 0 };
  };

  const handleUndo = () => graphActions.undo();
  const handleRedo = () => graphActions.redo();

  // STABLE: addNode
  const addNode = useCallback((type: NodeType, x?: number, y?: number) => {
      const { x: vx, y: vy, zoom } = graphState.viewport;
      const center = { x: (window.innerWidth/2 - vx) / zoom, y: (window.innerHeight/2 - vy) / zoom };
      
      const newNode: NodeData = {
           id: `n_${Date.now()}_${Math.random()}`,
           type,
           label: `New ${getTypeLabel(type)}`,
           position: { x: x ?? center.x - 128, y: y ?? center.y - 50 },
           config: type === NodeType.PICKER ? { src: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop' } : { min: 0, max: 100, step: 1, value: 50, enabled: true }
      };
      graphState.nodes.push(newNode);
      graphActions.pushHistory();
      return newNode;
  }, []);

  // STABLE: handleNodeDown
  const handleNodeDown = useCallback((id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      let newSelected = new Set(graphState.selection);
      if (e.shiftKey) {
          if (newSelected.has(id)) newSelected.delete(id);
          else newSelected.add(id);
      } else {
          if (!newSelected.has(id)) newSelected = new Set([id]);
      }
      graphActions.setSelection(newSelected);

      if (e.altKey) {
          // Alt+Drag: Duplicate
          const nodesToDuplicate = graphState.nodes.filter(n => newSelected.has(n.id));
          const newNodes: NodeData[] = [];
          
          nodesToDuplicate.forEach(n => {
             const newNode = {
                 ...n,
                 id: `n_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                 label: n.label + ' (Copy)',
                 position: { x: n.position.x + 50, y: n.position.y + 50 },
                 // Deep copy boundProps if needed or reset
                 boundProps: n.boundProps ? { ...n.boundProps } : undefined,
                 dimensions: n.dimensions ? { ...n.dimensions } : undefined
             };
             // Push directly? or collect.
             graphState.nodes.push(newNode);
             newNodes.push(newNode);
          });
          
          // Select new nodes
          const newSelection = new Set(newNodes.map(n => n.id));
          graphActions.setSelection(newSelection);
          
          // Drag new nodes
          const startPositions: Record<string, {x: number, y: number}> = {};
          newNodes.forEach(n => startPositions[n.id] = { x: n.position.x, y: n.position.y });
          graphState.dragState = { nodeIds: Array.from(newSelection), startPositions, mouseStartX: e.clientX, mouseStartY: e.clientY };
          graphActions.pushHistory();

      } else {
          const startPositions: Record<string, {x: number, y: number}> = {};
          graphState.nodes.filter(n => newSelected.has(n.id)).forEach(n => startPositions[n.id] = { x: n.position.x, y: n.position.y });
          graphState.dragState = { nodeIds: Array.from(newSelected), startPositions, mouseStartX: e.clientX, mouseStartY: e.clientY };
      }
  }, []);

  // STABLE: handlePropertyContextMenu
  const handlePropertyContextMenu = useCallback((nodeId: string, propKey: string, x: number, y: number) => {
      setPropertyContextMenu({ nodeId, propKey, x, y });
  }, []);

  // SEMI-STABLE: handleBindProp
  // Still relies on setPropertyTeleportBuffer (local state).
  // But passed to SidePanel usually, or context menu.
  const handleBindProp = (nodeId: string, propKey: string, action: 'SEND' | 'RECEIVE' | 'UNBIND') => {
      if (action === 'SEND') {
          setPropertyTeleportBuffer({ nodeId, propKey });
      } else if (action === 'RECEIVE' && propertyTeleportBuffer) {
          const targetNode = graphState.nodes.find(n => n.id === nodeId);
          if (!targetNode) return;

          const originalValue = targetNode.config[propKey];
          const connId = `c_tele_${Date.now()}`;
          
          graphActions.addConnection({ id: connId, source: propertyTeleportBuffer.nodeId, target: nodeId, type: ConnectionType.STRAIGHT });
          
          if (!targetNode.boundProps) targetNode.boundProps = {};
          targetNode.boundProps[propKey] = {
              targetNodeId: propertyTeleportBuffer.nodeId, 
              targetProp: propertyTeleportBuffer.propKey,
              originalValue: originalValue
          };
          
          graphActions.pushHistory();
          setPropertyTeleportBuffer(null);

      } else if (action === 'UNBIND') {
          const targetNode = graphState.nodes.find(n => n.id === nodeId);
          if (!targetNode || !targetNode.boundProps?.[propKey]) return;

          const binding = targetNode.boundProps[propKey];
          
          const restoredConfig = { ...targetNode.config };
          if (binding.originalValue !== undefined) {
              restoredConfig[propKey] = binding.originalValue;
          }
          targetNode.config = restoredConfig;
          delete targetNode.boundProps[propKey];

          // Remove connection
          graphState.connections = graphState.connections.filter(c => !(c.type === ConnectionType.STRAIGHT && c.target === nodeId && c.source === binding.targetNodeId));

          graphActions.pushHistory();
      }
  };

  const activeChainIds = useMemo(() => {
    const chain = new Set<string>();
    const primarySelected = Array.from(snap.selection).pop();
    if (!primarySelected) return chain;
    
    // BFS/DFS (using proxy state for speed? or snapshot for render accuracy? Snapshot.)
    const findParents = (id: string) => { 
        if(chain.has(id)) return; 
        chain.add(id); 
        snap.connections.filter(c => c.target === id).forEach(c => findParents(c.source)); 
    };
    const findChildren = (id: string) => { 
        if(chain.has(id)) return; 
        chain.add(id); 
        snap.connections.filter(c => c.source === id).forEach(c => findChildren(c.target)); 
    };
    
    findParents(primarySelected);
    chain.clear(); chain.add(primarySelected);
    snap.connections.filter(c => c.target === primarySelected).forEach(c => findParents(c.source));
    snap.connections.filter(c => c.source === primarySelected).forEach(c => findChildren(c.target));
    return chain;
  }, [snap.selection, snap.connections]);

  const nodeColors = useMemo(() => {
    const map = new Map<string, string>();
    const visited = new Set<string>();
    const traverse = (nodeId: string, color: string) => {
        if (visited.has(nodeId)) return;
        visited.add(nodeId);
        map.set(nodeId, color);
        snap.connections.filter(c => c.source === nodeId).map(c => c.target).forEach(childId => traverse(childId, color));
    };
    let colorIndex = 0;
    snap.nodes.filter(n => n.type === NodeType.PICKER).forEach(picker => {
        traverse(picker.id, NEON_PALETTE[colorIndex % NEON_PALETTE.length]);
        colorIndex++;
    });
    return map;
  }, [snap.nodes, snap.connections]);

  // Telepathic Sync Effect
  useEffect(() => {
      // Pure mutation of proxy for performance
      graphState.nodes.forEach(targetNode => {
          if (!targetNode.boundProps) return;
          Object.entries(targetNode.boundProps).forEach(([propKey, binding]: [string, any]) => {
              const sourceNode = graphState.nodes.find(n => n.id === binding.targetNodeId);
              if (sourceNode) {
                  let sourceValue = sourceNode.config[binding.targetProp];
                  // Value mapping logic
                  const maxVal = targetNode.config.max ?? 100;
                  const isPercentageTarget = (targetNode.type === NodeType.SLIDER && maxVal === 100) ||
                      (targetNode.type === NodeType.TRANSFORM && propKey === 'scale');
                  if (isPercentageTarget) {
                      if (typeof sourceValue === 'boolean') sourceValue = sourceValue ? 100 : 0;
                      else if (typeof sourceValue === 'number' && sourceValue >= 0 && sourceValue <= 1) sourceValue = sourceValue * 100;
                  } else if (typeof sourceValue === 'boolean') sourceValue = sourceValue ? 1 : 0;

                  if (targetNode.config[propKey] !== sourceValue) {
                      targetNode.config[propKey] = sourceValue;
                  }
              }
          });
      });
  }, [snap.nodes]); 

  // --- HANDLERS using State (less critical to be stable if passed to div, but good practice)
  const handlePortDown = (id: string, type: 'input' | 'output', e: React.MouseEvent) => {
    e.stopPropagation();
    // Logic dependent on tempWire (local state). 
    // This function recreates on render. 
    // But BaseNode only receives it for onPortDown prop. 
    // And BaseNode memo checks equality.
    // So this DOES cause re-render of BaseNode.
    // However, Port actions are rarer than Move actions. 
    // When Moving, tempWire doesn't change usually? 
    // If tempWire changes (drag wire), App re-renders. 
    // Optimization: Should move tempWire to global state eventually. 
    // For now, accept re-render on wiring.
    if (tempWire && tempWire.isHot) {
        if (tempWire.startId !== id && tempWire.startType !== type) {
               const sourceId = tempWire.startType === 'output' ? tempWire.startId : id;
               const targetId = tempWire.startType === 'input' ? tempWire.startId : id;
               if (graphState.connections.some(c => c.source === sourceId && c.target === targetId)) {
                   setTempWire(null); return;
               }
               setMenuData({ source: sourceId, target: targetId, x: e.clientX, y: e.clientY });
               setActiveMenu('CONNECTION');
               setTempWire(null);
          }
          return;
    }
    
    // Ctrl+Alt+Drag Clone Logic
    if ((e.ctrlKey || e.metaKey) && e.altKey && type === 'output') {
          const sourceNode = graphState.nodes.find(n => n.id === id);
          if (sourceNode) {
              const newNode = addNode(sourceNode.type, sourceNode.position.x + 50, sourceNode.position.y + 50);
              const newConn = { id: `c_${Date.now()}`, source: id, target: newNode.id, type: ConnectionType.BEZIER };
              graphActions.addConnection(newConn);
              graphActions.pushHistory();

              const startPositions: Record<string, {x: number, y: number}> = {};
              startPositions[newNode.id] = { x: newNode.position.x, y: newNode.position.y };
              graphState.dragState = { 
                  nodeIds: [newNode.id], 
                  startPositions, 
                  mouseStartX: e.clientX, 
                  mouseStartY: e.clientY 
              };
              graphActions.setSelection(new Set([newNode.id]));
              return;
          }
    }

    const { x, y, zoom } = graphState.viewport;
    const worldX = (e.clientX - x) / zoom;
    const worldY = (e.clientY - y) / zoom;
    setTempWire({ startId: id, startType: type, mouseX: worldX, mouseY: worldY, isHot: e.shiftKey || isMobileOrTablet() });
  };

  const handlePortUp = (id: string, type: 'input' | 'output', e: React.MouseEvent) => {
      e.stopPropagation();
      if (!tempWire) return;
      if (tempWire.startId === id || tempWire.startType === type) {
          if (!tempWire.isHot) setTempWire(null);
          return;
      }
      const sourceId = tempWire.startType === 'output' ? tempWire.startId : id;
      const targetId = tempWire.startType === 'input' ? tempWire.startId : id;
      if (graphState.connections.some(c => c.source === sourceId && c.target === targetId)) {
          setTempWire(null); return;
      }
      setMenuData({ source: sourceId, target: targetId, x: e.clientX, y: e.clientY });
      setActiveMenu('CONNECTION'); 
      setTempWire(null);
  };

  return (
    <div 
      id="canvas-bg"
      className={`w-full h-screen overflow-hidden select-none relative ${snap.isDarkMode ? 'bg-black text-white' : 'bg-[#F5F5F5] text-neutral-900'}`}
      onMouseMove={(e) => {
          if (isPanning) {
              const dx = e.clientX - panStartRef.current.mouseX;
              const dy = e.clientY - panStartRef.current.mouseY;
              graphActions.setViewport({
                  ...snap.viewport,
                  x: panStartRef.current.x + dx,
                  y: panStartRef.current.y + dy
              });
          }
          if (graphState.dragState) {
              const dx = (e.clientX - graphState.dragState.mouseStartX) / snap.viewport.zoom;
              const dy = (e.clientY - graphState.dragState.mouseStartY) / snap.viewport.zoom;
              
              graphState.dragState.nodeIds.forEach(id => {
                  const start = graphState.dragState!.startPositions[id];
                  const node = graphState.nodes.find(n => n.id === id);
                  if (node) {
                      node.position.x = start.x + dx;
                      node.position.y = start.y + dy;
                  }
              });
          }
          if (tempWire) {
              const { x, y, zoom } = graphState.viewport;
              setTempWire(prev => prev ? { ...prev, mouseX: (e.clientX - x)/zoom, mouseY: (e.clientY - y)/zoom } : null);
          }
      }}
      onMouseUp={(e) => {
          if (isPanning) {
             const dist = Math.sqrt(Math.pow(e.clientX - panStartRef.current.mouseX, 2) + Math.pow(e.clientY - panStartRef.current.mouseY, 2));
             if (dist < 5) graphActions.clearSelection();
          }
          setIsPanning(false);
          
          if (graphState.dragState) {
              graphState.dragState.nodeIds.forEach(id => {
                 const node = graphState.nodes.find(n => n.id === id);
                 if (node) {
                     node.position.x = Math.round(node.position.x / SNAP_SIZE) * SNAP_SIZE;
                     node.position.y = Math.round(node.position.y / SNAP_SIZE) * SNAP_SIZE;
                 }
              });
              graphActions.pushHistory();
              graphState.dragState = null;
          }
          if (tempWire && !tempWire.isHot) setTempWire(null);
      }}
      onWheel={(e) => {
        if (isNodePickerOpen) return;
        if (e.shiftKey) { 
            graphActions.setViewport({ ...snap.viewport, x: snap.viewport.x - e.deltaY, y: snap.viewport.y - e.deltaX }); 
            return; 
        }
        const zoomSensitivity = 0.001;
        const delta = -e.deltaY * zoomSensitivity;
        const newZoom = Math.min(Math.max(snap.viewport.zoom + delta, 0.2), 3);
        const worldX = (e.clientX - snap.viewport.x) / snap.viewport.zoom;
        const worldY = (e.clientY - snap.viewport.y) / snap.viewport.zoom;
        const newX = e.clientX - worldX * newZoom;
        const newY = e.clientY - worldY * newZoom;
        graphActions.setViewport({ x: newX, y: newY, zoom: newZoom });
      }}
      onMouseDown={(e) => {
          setPropertyContextMenu(null);
          if (!graphState.dragState) {
              setIsPanning(true); 
              panStartRef.current = { x: snap.viewport.x, y: snap.viewport.y, mouseX: e.clientX, mouseY: e.clientY }; 
          }
      }}
    >
        <CanvasBackground viewport={snap.viewport} isDarkMode={snap.isDarkMode} gridType={snap.gridType} />

      <div ref={containerRef} className="absolute inset-0 z-10 origin-top-left pointer-events-none" style={{ transform: `translate(${snap.viewport.x}px, ${snap.viewport.y}px) scale(${snap.viewport.zoom})` }}>
        <svg className="absolute left-0 top-0 overflow-visible pointer-events-none z-10">
            <defs>
                 <marker id="arrow-head" markerWidth="6" markerHeight="6" refX="0" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill={getWire('default', snap.isDarkMode)} /></marker>
            </defs>
            {snap.connections.map(conn => (
                <ConnectionLine 
                    key={conn.id}
                    connection={conn}
                    sourceNode={snap.nodes.find(n => n.id === conn.source)}
                    targetNode={snap.nodes.find(n => n.id === conn.target)}
                    viewport={snap.viewport}
                    isDarkMode={snap.isDarkMode}
                    onDelete={(id) => {
                        graphActions.removeConnection(id);
                        graphActions.pushHistory();
                    }}
                />
            ))}
             {tempWire && (
                <path 
                  d={`M ${tempWire.startType === 'output' 
                      ? getNodePosition(tempWire.startId).x + (snap.nodes.find(n => n.id === tempWire.startId)?.dimensions?.width ?? nodeLayout.width) + 16
                      : getNodePosition(tempWire.startId).x + portLayout.inputX} ${getNodePosition(tempWire.startId).y + portLayout.offsetY} L ${tempWire.mouseX} ${tempWire.mouseY}`} 
                  stroke={getWire('temp', snap.isDarkMode)} 
                  strokeWidth={2 / snap.viewport.zoom} 
                  strokeDasharray="5 5" 
                  fill="none" 
                />
            )}
        </svg>

        {visibleNodes.map(node => (
            <BaseNode 
                key={node.id} 
                data={node}
                isSelected={snap.selection.has(node.id)}
                isActiveChain={activeChainIds.has(node.id)}
                accentColor={nodeColors.get(node.id)}
                zoom={snap.viewport.zoom}
                isDarkMode={snap.isDarkMode}
                isHotConnectionSource={tempWire?.startId === node.id}
                onSelect={(id) => { /* Logic is in onNodeDown */ }}
                onToggleCollapse={graphActions.toggleNodeCollapse}
                onResize={graphActions.updateNodeDimensions}
                onPortDown={handlePortDown}
                onPortUp={handlePortUp}
                onPortContextMenu={(id, type, e) => { setMenuData({ nodeId: id, type, x: e.clientX, y: e.clientY }); setActiveMenu('DISCONNECT'); }}
                onPortDoubleClick={(id, type, e) => { 
                    setMenuData({ nodeId: id, type, x: e.clientX, y: e.clientY }); 
                    setActiveMenu('PORT'); 
                }}
                onNodeDown={handleNodeDown}
                updateConfig={graphActions.updateNodeConfig}
                pushHistory={graphActions.pushHistory}
                onPropertyContextMenu={handlePropertyContextMenu}
            />
        ))}
      </div>
      
      <SidePanel 
          selectedNode={snap.selection.size === 1 ? snap.nodes.find(n => n.id === Array.from(snap.selection)[0]) || null : null}
          onClose={graphActions.clearSelection}
          onUpdate={(id, newData) => {
              const node = graphState.nodes.find(n => n.id === id);
              if (node) {
                  Object.assign(node, newData);
                  graphActions.pushHistory();
              }
          }}
          onBindProp={handleBindProp}
          isDarkMode={snap.isDarkMode}
          boundProps={snap.selection.size === 1 ? snap.nodes.find(n => n.id === Array.from(snap.selection)[0])?.boundProps || {} : {}}
          onContextMenu={(menu) => setPropertyContextMenu(menu)}
      />

      <Header 
        isDarkMode={snap.isDarkMode}
        setIsDarkMode={graphActions.toggleDarkMode}
        gridType={snap.gridType}
        setGridType={graphActions.setGridType}
        historyIndex={snap.historyIndex}
        historyLength={snap.history.length}
        handleUndo={handleUndo}
        handleRedo={handleRedo}
        setIsNodePickerOpen={setIsNodePickerOpen}
        setPickerCounts={setPickerCounts}
      />

      <ShortcutsPanel isDarkMode={snap.isDarkMode} />

      <NodePicker 
        isOpen={isNodePickerOpen}
        onClose={() => setIsNodePickerOpen(false)}
        isDarkMode={snap.isDarkMode}
        pickerCounts={pickerCounts}
        setPickerCounts={setPickerCounts}
        onAdd={() => {
             const startX = -snap.viewport.x + 100;
             const startY = -snap.viewport.y + 100;
             Object.entries(pickerCounts).forEach(([type, count]) => {
                 for(let i=0; i<(count as number); i++) addNode(type as NodeType, startX, startY);
             });
             setIsNodePickerOpen(false);
        }}
        onSingleAdd={addNode}
      />
      
       {activeMenu === 'PORT' && menuData && (
          <div 
            className="fixed w-48 bg-black border border-neutral-800 rounded-lg shadow-xl" 
            style={{ left: menuData.x, top: menuData.y, zIndex: zIndex.contextMenu }} 
            onMouseDown={e => e.stopPropagation()}
          >
              {Object.values(NodeType)
                .filter(type => {
                    if (menuData.type === 'output') return [NodeType.TRANSFORM, NodeType.LOGIC, NodeType.OUTPUT].includes(type);
                    else return type !== NodeType.OUTPUT;
                })
                .map(type => (
                  <button key={type} className="block w-full text-left px-4 py-2 text-xs text-white hover:bg-white/10" onClick={() => { 
                      const pos = getNodePosition(menuData.nodeId); 
                      const offset = menuData.type === 'output' ? 300 : -300;
                      const newNode = addNode(type, pos.x + offset, pos.y); 
                      graphActions.addConnection({ 
                          id: `c_${Date.now()}`, 
                          source: menuData.type === 'output' ? menuData.nodeId : newNode.id, 
                          target: menuData.type === 'output' ? newNode.id : menuData.nodeId, 
                          type: ConnectionType.BEZIER 
                      });
                      graphActions.pushHistory();
                      setActiveMenu(null);
                  }}>
                      {getTypeLabel(type)}
                  </button>
              ))}
          </div>
      )}

      {activeMenu === 'CONNECTION' && menuData && (
          <div 
            className="fixed w-48 bg-black border border-neutral-800 rounded-lg shadow-xl" 
            style={{ left: menuData.x, top: menuData.y, zIndex: zIndex.contextMenu }} 
            onMouseDown={e => e.stopPropagation()}
          >
              <div className="px-4 py-2 text-xs font-bold text-neutral-500 border-b border-neutral-800">Connection Type</div>
              {Object.values(ConnectionType).map(type => (
                  <button key={type} className="block w-full text-left px-4 py-2 text-xs text-white hover:bg-white/10" onClick={() => {
                      graphActions.addConnection({ id: `c_${Date.now()}`, source: menuData.source, target: menuData.target, type });
                      graphActions.pushHistory();
                      setActiveMenu(null);
                  }}>
                      {type}
                  </button>
              ))}
          </div>
      )}

      {activeMenu === 'DISCONNECT' && menuData && (
          <div 
            className="fixed w-48 bg-black border border-neutral-800 rounded-lg shadow-xl" 
            style={{ left: menuData.x, top: menuData.y, zIndex: zIndex.contextMenu }} 
            onMouseDown={e => e.stopPropagation()}
          >
              <button className="block w-full text-left px-4 py-2 text-xs text-red-500 hover:bg-white/10" onClick={() => {
                  graphState.connections = graphState.connections.filter(c => !(c.target === menuData.nodeId && menuData.type === 'input') && !(c.source === menuData.nodeId && menuData.type === 'output'));
                  graphActions.pushHistory();
                  setActiveMenu(null);
              }}>
                  Disconnect All
              </button>
          </div>
      )}

      {propertyContextMenu && (() => {
          const menuWidth = 224;
          const isBound = snap.nodes.find(n => n.id === propertyContextMenu.nodeId)?.boundProps?.[propertyContextMenu.propKey];
          const menuHeight = propertyTeleportBuffer ? (isBound ? 200 : 170) : (isBound ? 130 : 100);
          const safePos = getMenuPosition(propertyContextMenu.x, propertyContextMenu.y, menuWidth, menuHeight);
          
          return (
              <div 
                className="fixed w-56 bg-black border border-neutral-800 rounded-lg shadow-xl overflow-hidden" 
                style={{ left: safePos.left, top: safePos.top, zIndex: zIndex.contextMenu }} 
                onMouseDown={e => e.stopPropagation()}
              >
                  <div className="px-3 py-2 text-[10px] font-bold text-neutral-500 border-b border-neutral-800 uppercase tracking-wider">Property: {propertyContextMenu.propKey}</div>
                  <button className="flex items-center gap-2 w-full text-left px-4 py-2.5 text-xs text-white hover:bg-white/10 transition-colors" onClick={() => { handleBindProp(propertyContextMenu.nodeId, propertyContextMenu.propKey, 'SEND'); setPropertyContextMenu(null); }}>
                      <LinkIcon size={14} className="text-accent-red" />
                      <span>Broadcast <span className="text-accent-red font-bold">{propertyContextMenu.propKey}</span></span>
                  </button>
                  {propertyTeleportBuffer && (
                      <button className="flex items-center gap-2 w-full text-left px-4 py-2.5 text-xs text-white hover:bg-white/10 transition-colors border-t border-neutral-800/50" onClick={() => { handleBindProp(propertyContextMenu.nodeId, propertyContextMenu.propKey, 'RECEIVE'); setPropertyContextMenu(null); }}>
                          <LinkIcon size={14} className="text-green-500" />
                          <div className="flex flex-col">
                              <span>Receive <span className="text-green-500 font-bold">{propertyTeleportBuffer.propKey}</span></span>
                              <span className="text-[10px] text-neutral-500">from <span className="text-neutral-400">{snap.nodes.find(n => n.id === propertyTeleportBuffer.nodeId)?.label}</span></span>
                          </div>
                      </button>
                  )}
                  {isBound && (
                       <button className="flex items-center gap-2 w-full text-left px-4 py-2.5 text-xs text-red-500 hover:bg-white/10 transition-colors border-t border-neutral-800/50" onClick={() => { handleBindProp(propertyContextMenu.nodeId, propertyContextMenu.propKey, 'UNBIND'); setPropertyContextMenu(null); }}>
                          <Unlink size={14} />
                          <span>Unbind <span className="font-bold">{propertyContextMenu.propKey}</span></span>
                      </button>
                  )}
              </div>
          );
      })()}
    </div>
  );
}
