# ANINODE UI ROUTING

# Token-optimized agent context | v1.0

# ~85% token reduction from human-readable version

## META

project: aninode-design-system
purpose: route_ui_changes
layers: [types→tokens→components→app]

## TYPES (types.ts)

enums:
NodeType: [PICKER,OSCILLATOR,TRANSFORM,OUTPUT,LOGIC,SLIDER,NUMBER,BOOLEAN,CLONE]
ConnectionType: [BEZIER,STRAIGHT,STEP,DOUBLE,DOTTED]
interfaces:
NodeData: {id,type,label,position,collapsed?,value?,config,boundProps?}
Connection: {id,source,target,type}
Position: {x,y}
GridType: DOTS|LINES|CROSS

## TOKENS (src/tokens/)

colors.ts:
exports: [signalActive,neonPalette,getColor,getSurface,getBorder,getPort,getWire,getGrid,getText]
pattern: getX(variant,isDarkMode)→string
layout.ts:
exports: [nodeLayout,portLayout,wireLayout,canvasLayout,panelLayout,zIndex,iconSizes]
node: {width:256,minH:80,defaultH:100,borderR:12}
port: {outputX:272,inputX:-16,offsetY:40}
zIndex: {canvas:1,node:10,nodeSelected:50,shortcuts:40,header:50,sidePanel:60,contextMenu:100}
animation.ts:
exports: [duration,easing,cssEasing,spring,glow]
duration: {instant:0,fast:0.15,normal:0.3,slow:0.5}
shortcuts.ts:
exports: [shortcuts,formatShortcut,valueConversion]
connections.ts:
exports: [connectionRules,suggestConnectionType,validateConnectionType]
semantics:
BEZIER: single_param
DOUBLE: list/array
DOTTED: live/stream
STEP: logic/boolean
STRAIGHT: telepathic/wireless

## COMPONENTS (components/)

nodes/BaseNode.tsx:
imports: [NodeData,nodeLayout,zIndex,getPort,getSurface,signalActive,iconSizes]
props: {data,isSelected,isActiveChain,accentColor,zoom,isDarkMode,isHotConnectionSource,onSelect,onToggleCollapse,onPortDown,onPortUp,onPortContextMenu,onPortDoubleClick,onNodeDown,children}
nodes/NodeContent.tsx:
imports: [NodeData,NodeType,signalActive,getSurface,iconSizes]
props: {node,isDarkMode,updateConfig,pushHistory,onPropertyContextMenu?}
switch: node.type→render_type_specific_ui
canvas/ConnectionLine.tsx:
imports: [Connection,ConnectionType,portLayout,wireLayout,getWire]
props: {connection,sourceNode,targetNode,viewport,isDarkMode,onDelete}
canvas/CanvasBackground.tsx:
imports: [canvasLayout,getGrid]
props: {viewport,isDarkMode,gridType}
ui/Header.tsx:
imports: [panelLayout,zIndex,iconSizes,signalActive,getSurface,getBorder]
props: {isDarkMode,setIsDarkMode,gridType,setGridType,historyIndex,historyLength,handleUndo,handleRedo,setIsNodePickerOpen,setPickerCounts}
ui/ShortcutsPanel.tsx:
imports: [shortcuts,formatShortcut,panelLayout,zIndex,iconSizes,getSurface,getBorder]
props: {isDarkMode}
SidePanel.tsx:
imports: [NodeData,NodeType,signalActive,getSurface,getBorder,panelLayout,zIndex,iconSizes]
props: {selectedNode,onClose,onUpdate,onBindProp,isDarkMode,boundProps,onContextMenu}

## ROUTING_RULES

add_data_structure: types.ts
change_visual: src/tokens/_.ts
add_component: components/_.tsx + import[types,tokens]
add_shortcut: src/tokens/shortcuts.ts
change_wire_semantic: src/tokens/connections.ts
change_animation: src/tokens/animation.ts
add_node_type: types.ts→NodeContent.tsx→BaseNode.tsx

## PATTERNS

import_tokens: import{x,y}from'@/src/tokens'
get_surface: getSurface('node'|'panel'|'menu'|'overlay',isDarkMode)
get_border: getBorder('default'|'active'|'divider',isDarkMode)
pure_component: React.FC<Props>+tokens→style_object_not_tailwind_classes
