# ANINODE UI ROUTING

# Token-optimized agent context | v1.2

# Updated: 2024-12-16 | Performance system added

## META

project: aninode-design-system  
purpose: route_ui_changes  
architecture: types→tokens→hooks→utils→components→app  
principle: zero_magic_numbers|cascading_tokens|dark_light_support|adaptive_performance

## TYPES (types.ts)

enums:
NodeType: [PICKER,OSCILLATOR,TRANSFORM,OUTPUT,LOGIC,SLIDER,NUMBER,BOOLEAN,CLONE]
ConnectionType: [BEZIER,STRAIGHT,STEP,DOUBLE,DOTTED]
interfaces:
NodeData: {id,type,label,position,collapsed?,value?,config,boundProps?,dimensions?}
Connection: {id,source,target,type}
Position: {x,y}
GridType: DOTS|LINES|CROSS

## TOKENS (src/tokens/)

index.ts:
barrel_export: clean_public_api
pattern: theme→modules→engine_contract→direct_exports

colors.ts:
exports: [signalActive,neonPalette,surface,border,port,wire,grid,text,state,glow]
helpers: [getColor,getSurface,getBorder,getPort,getWire,getGrid,getText]
pattern: getX(variant,isDarkMode)→string
surfaces: [node,panel,canvas,menu,overlay]
borders: [default,divider,menuBorder]

layout.ts:
exports: [node,port,wire,canvas,panel,zIndex,borderScale,icon]
node: {width:256,defaultHeight:128,headerHeight:48,bodyPadding:12,borderRadius:12}
port: {size:12,innerSize:6,hitboxSize:24,offsetX:24,offsetY:40,outputX:272,inputX:-16}
wire: {controlPointOffset:100,hitboxWidth:15,dashGap:5,dottedDash:10}
canvas: {snapSize:20,zoomMin:0.2,zoomMax:3,focusPadding:100,zoomSensitivity:0.001}
panel: {sidePanelWidth:320,headerHeight:56,shortcutsOffset:16,contextMenuWidth:192,teleportMenuWidth:224}
zIndex: {canvasBackground:0,node:10,wires:10,shortcuts:40,nodeSelected:50,header:50,port:50,sidePanel:60,contextMenu:100,modal:150}
icon: {xs:10,sm:14,md:16,lg:20}

spacing.ts:
exports: [spacing,semanticSpacing,nodeSpacing,baseUnit,getSpacing,getSemanticSpacing,calcSpacing]
baseUnit: 4px
scale: {none:0,xxs:2,xs:4,sm:8,md:12,lg:16,xl:24,xxl:32,xxxl:48}
semantic: {inlineGap:4,stackGap:8,componentPadding:12,cardPadding:16,sectionMargin:24,pageMargin:32}
node: {headerPadding:8,bodyPadding:12,bodyGap:8,portOffset:24,nodeMargin:20}

responsive.ts:
exports: [breakpoints,minWidth,maxWidth,between,matchesBreakpoint,getCurrentBreakpoint,responsiveValue,canvasResponsive]
breakpoints: {sm:640,md:768,lg:1024,xl:1280,xxl:1536}
canvasResponsive: {minZoom,touchTargetMultiplier,uiScale}

performance.ts:
exports: [QualityTier,qualityFeatures,lodThresholds,visualizerThrottle,wireSimplification,nodeRenderThresholds,getQualityFeatures,isFeatureEnabled,getLodLevel,getRecommendedTier,getVisualizerInterval]
QualityTier: [HIGH,MEDIUM,LOW,MINIMAL]
lodThresholds: {near:0.8,mid:0.4,far:0.2,ultraFar:0.1}
visualizerThrottle: {idle:16,interaction:50,lowPerf:100,minimal:250,paused:Infinity}
nodeRenderThresholds: {highToMedium:50,mediumToLow:150,lowToMinimal:300}
feature_flags_per_tier: true

animation.ts:
exports: [duration,easing,cssEasing,borderAnimation,glow,spring,delay]
duration: {instant:0.1,fast:0.2,normal:0.3,slow:0.5,verySlow:0.8}
easing: {out:'power2.out',in:'power2.in',inOut:'power2.inOut',elastic,back,linear}
spring: {stiff,normal,loose}
delay: {tooltip:0.5,hoverIntent:0.15,stagger:0.05}

shortcuts.ts:
exports: [shortcuts,formatShortcut,getShortcutsByCategory,valueConversion]
categories: [navigation,selection,editing,canvas,node]
valueConversion: {booleanToPercentage,decimalToPercentage,numberToBoolean}

connections.ts:
exports: [connectionRules,suggestConnectionType,validateConnectionType,getConnectionTypeOptions]
semantics:
BEZIER: single_param|smooth_curve
DOUBLE: list/array|pipe_visual
DOTTED: live/stream|animated
STEP: logic/boolean|orthogonal
STRAIGHT: telepathic/wireless|dashed_arrow

theme.tokens.ts:
exports: [theme,Theme,getThemeColors,getLayout,getAnimation]
purpose: master_theme_object|single_source_of_truth

engine.contract.ts:
exports: [getEngineUIConfig,defaultPerformanceHints,EngineUIConfig,EnginePerformanceHints]
purpose: explicit_engine_integration
pattern: getEngineUIConfig(isDarkMode,performanceHints)→complete_config
returns: {colors,layout,spacing,responsive,animation,features,visualizerInterval,lodLevel}

## HOOKS (hooks/)

usePinchZoom.ts:
params: (viewport,setViewport,containerRef)
purpose: two_finger_pinch_zoom|world_space_centering

useLongPress.ts:
params: (callback,threshold?)
purpose: long_press_detection|mobile_context_menu_trigger

## UTILS (utils/)

deviceDetection.ts: [isMobileOrTablet] UA_based
geometry.ts: geometry_helpers
menuPosition.ts: [getMenuPosition] safe_positioning

## COMPONENTS (components/)

nodes/BaseNode.tsx:
imports: [NodeData,NodeType,signalActive,getBorder,getPort,getSurface,nodeLayout,portLayout,zIndex,iconSizes,animation,QualityTier,isFeatureEnabled]
props: {data,isSelected,isActiveChain,accentColor,zoom,isDarkMode,isHotConnectionSource,qualityTier?,disableGlow?,onSelect,onToggleCollapse,onPortDown,onPortUp,onPortContextMenu,onPortDoubleClick,onNodeDown,onResize,children}
performance: glow_respects_quality_tier

nodes/NodeContent.tsx:
props: {node,isDarkMode,updateConfig,pushHistory,onPropertyContextMenu?}
switch: node.type→render_type_specific_ui

nodes/Visualizer.tsx:
imports: [visualizerThrottle,QualityTier,isFeatureEnabled]
props: {type,frequency,amplitude,active,isDarkMode,paused?,throttleMs?,qualityTier?}
performance: frame_throttling|pause_on_interaction|quality_aware_glow

canvas/ConnectionLine.tsx:
imports: [Connection,ConnectionType,portLayout,wireLayout,getWire,QualityTier,wireSimplification]
props: {connection,sourceNode,targetNode,viewport,isDarkMode,onDelete,qualityTier?}
performance: simplified_paths_at_low_quality|straight_lines_at_minimal

canvas/CanvasBackground.tsx:
props: {viewport,isDarkMode,gridType}
grid_types: [DOTS,LINES,CROSS]

ui/Header.tsx: theme_controls|history_controls
ui/ShortcutsPanel.tsx: keyboard_legend
ui/NodePicker.tsx: node_creation_modal
SidePanel.tsx: property_inspector|teleportation_menu

## APP (App.tsx)

orchestrator: true
state: [nodes,connections,selectedIds,viewport,history,hotConnection,teleportMenu]
core_functions: [pushHistory,handleUndo,handleRedo,fitView,addNode,handlePortDown,handlePortUp,traverse]
keyboard_listener: handleKeyDown

## ROUTING_RULES

add_data_structure: types.ts
change_color: src/tokens/colors.ts
change_layout: src/tokens/layout.ts
change_spacing: src/tokens/spacing.ts
change_responsive: src/tokens/responsive.ts
change_performance: src/tokens/performance.ts
change_animation: src/tokens/animation.ts
change_wire_semantic: src/tokens/connections.ts
add_shortcut: src/tokens/shortcuts.ts
add_hook: hooks/_.ts
add_utility: utils/_.ts
add_component: components/\*.tsx
add_node_type: types.ts→NodeContent.tsx→BaseNode.tsx
theme_cascade: theme.tokens.ts←[colors,layout,animation,shortcuts]
engine_integration: engine.contract.ts
migration_guide: .agent/ENGINE_MIGRATION.agent.md

## PATTERNS

import_tokens: import{x,y}from'@/src/tokens'
get_surface: getSurface(variant,isDarkMode)
get_border: getBorder(variant,isDarkMode)
get_theme: getThemeColors(isDarkMode)
get_engine_config: getEngineUIConfig(isDarkMode,performanceHints)
quality_check: isFeatureEnabled(qualityTier,'glow')
pure_component: React.FC<Props>+tokens
no_magic_numbers: all_values_from_tokens
cascading_change: update_token→all_consumers_update
performance_prop: qualityTier={snapshot.performance.qualityTier}

## TOKEN_DEPENDENCY_GRAPH

theme.tokens.ts
├── colors.ts
├── layout.ts
├── animation.ts
└── shortcuts.ts

engine.contract.ts
├── colors.ts (via helpers)
├── layout.ts
├── spacing.ts
├── responsive.ts
├── animation.ts
└── performance.ts

performance.ts (independent, exports QualityTier enum)
connections.ts (independent, imports ConnectionType from types.ts)
