
import React from 'react';
import { NodeData, NodeType } from '../../types';
import { ChevronDown, ChevronUp, GripHorizontal, Activity, Image as ImageIcon, Box, Monitor, Cpu, Sliders, Hash, ToggleLeft, Copy } from 'lucide-react';
import { 
  signalActive, 
  getBorder, 
  getPort,
  getSurface,
  nodeLayout,
  zIndex,
  iconSizes,
  animation
} from '../../src/tokens';

interface BaseNodeProps {
  data: NodeData;
  isSelected: boolean;
  isActiveChain: boolean;
  accentColor?: string;
  zoom: number;
  isDarkMode: boolean;
  isHotConnectionSource?: boolean; 
  onSelect: (id: string) => void;
  onToggleCollapse: (id: string) => void;
  // Generic Port Handlers
  onPortDown: (id: string, type: 'input' | 'output', e: React.MouseEvent) => void;
  onPortUp: (id: string, type: 'input' | 'output', e: React.MouseEvent) => void;
  onPortContextMenu?: (id: string, type: 'input' | 'output', e: React.MouseEvent) => void;
  onPortDoubleClick?: (id: string, type: 'input' | 'output', e: React.MouseEvent) => void;
  // Node Drag Handler
  onNodeDown: (e: React.MouseEvent) => void;
  children: React.ReactNode;
}

const getNodeIcon = (type: NodeType) => {
  const iconSize = iconSizes.sm;
  switch (type) {
    case NodeType.OSCILLATOR: return <Activity size={iconSize} />;
    case NodeType.PICKER: return <ImageIcon size={iconSize} />;
    case NodeType.TRANSFORM: return <Box size={iconSize} />;
    case NodeType.OUTPUT: return <Monitor size={iconSize} />;
    case NodeType.LOGIC: return <Cpu size={iconSize} />;
    case NodeType.SLIDER: return <Sliders size={iconSize} />;
    case NodeType.NUMBER: return <Hash size={iconSize} />;
    case NodeType.BOOLEAN: return <ToggleLeft size={iconSize} />;
    case NodeType.CLONE: return <Copy size={iconSize} />;
    default: return <Box size={iconSize} />;
  }
};

export const getTypeLabel = (type: NodeType) => {
    switch(type) {
        case NodeType.OSCILLATOR: return "LFO";
        case NodeType.TRANSFORM: return "MODIFIER";
        case NodeType.SLIDER: return "SLIDER"; // Changed back to SLIDER
        case NodeType.NUMBER: return "VALUE";
        case NodeType.BOOLEAN: return "SWITCH";
        case NodeType.CLONE: return "INSTANCE";
        default: return type;
    }
}

export const BaseNode: React.FC<BaseNodeProps> = ({ 
  data, 
  isSelected, 
  isActiveChain,
  accentColor = signalActive,
  zoom,
  isDarkMode,
  isHotConnectionSource,
  onSelect, 
  onToggleCollapse,
  onPortDown,
  onPortUp,
  onPortContextMenu,
  onPortDoubleClick,
  onNodeDown,
  children 
}) => {
  
  // Visual Logic
  const borderColor = (isSelected || isActiveChain) 
      ? accentColor 
      : getBorder('default', isDarkMode);
  
  // Surface colors from tokens
  const bgStyle = { backgroundColor: getSurface('node', isDarkMode) };
  const subTextColor = isDarkMode ? 'text-neutral-400' : 'text-neutral-500';

  // Inverse scaling for borders using token values
  const { scaleMin, scaleMax, activeScaleMin, activeScaleMax } = animation.borderAnimation;
  const borderScale = Math.max(scaleMin, Math.min(scaleMax, 1 / zoom));
  const activeBorderScale = Math.max(activeScaleMin, Math.min(activeScaleMax, 2 / zoom));
  const finalBorderWidth = isSelected ? activeBorderScale : borderScale;
  
  // Reduced Glow using animation tokens
  const { selectedRadius, activeChainRadius } = animation.glow;
  const shadowStyle = isSelected 
    ? `0 0 ${selectedRadius / zoom}px ${accentColor}30` 
    : isActiveChain 
        ? `0 0 ${activeChainRadius / zoom}px ${accentColor}10` 
        : (isDarkMode ? '0 4px 6px rgba(0,0,0,0.3)' : '0 4px 6px rgba(0,0,0,0.1)');

  // Clone Animation
  const animationClass = data.type === NodeType.CLONE ? 'animate-in fade-in zoom-in duration-300' : '';

  return (
    <div 
      className={`absolute rounded-xl backdrop-blur-md border-solid group select-none transition-colors duration-200 ease-out pointer-events-auto ${animationClass}`}
      style={{ 
        ...bgStyle,
        left: data.position.x, 
        top: data.position.y,
        borderColor: borderColor,
        borderWidth: `${finalBorderWidth}px`,
        boxShadow: shadowStyle,
        zIndex: isSelected ? zIndex.nodeSelected : zIndex.node,
        width: nodeLayout.width,
        borderRadius: nodeLayout.borderRadius 
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(data.id);
      }}
      onMouseDown={(e) => {
          onNodeDown(e);
      }}
    >
      {/* Input Port (Left) */}
      {data.type !== NodeType.PICKER && data.type !== NodeType.SLIDER && data.type !== NodeType.NUMBER && data.type !== NodeType.BOOLEAN && (
        <div 
            className="absolute -left-6 top-7 w-6 h-6 flex items-center justify-center cursor-crosshair z-50 group/port"
            onMouseDown={(e) => {
                e.stopPropagation(); e.preventDefault();
                onPortDown(data.id, 'input', e);
            }}
            onMouseUp={(e) => {
                e.stopPropagation(); e.preventDefault();
                onPortUp(data.id, 'input', e);
            }}
            onContextMenu={(e) => {
                e.stopPropagation(); e.preventDefault();
                onPortContextMenu && onPortContextMenu(data.id, 'input', e);
            }}
            onDoubleClick={(e) => {
                e.stopPropagation(); e.preventDefault();
                onPortDoubleClick && onPortDoubleClick(data.id, 'input', e);
            }}
        >
            <div 
                className={`w-3 h-3 border rounded-full flex items-center justify-center transition-all duration-300 group-hover/port:scale-150 ${isDarkMode ? 'bg-black' : 'bg-white'} ${isHotConnectionSource ? 'animate-ping' : ''}`}
                style={{ 
                    borderColor: isActiveChain ? accentColor : getPort('inactive', isDarkMode),
                    borderWidth: `${borderScale}px` 
                }}
            >
                <div 
                    className="w-1.5 h-1.5 rounded-full" 
                    style={{ backgroundColor: isActiveChain ? accentColor : getPort('innerInactive', isDarkMode) }}
                />
            </div>
        </div>
      )}

      {/* Output Port (Right) */}
      {data.type !== NodeType.OUTPUT && (
         <div 
            className="absolute -right-6 top-7 w-6 h-6 flex items-center justify-center cursor-crosshair z-50 group/port"
            onMouseDown={(e) => {
                e.stopPropagation(); e.preventDefault();
                onPortDown(data.id, 'output', e);
            }}
            onMouseUp={(e) => {
                e.stopPropagation(); e.preventDefault();
                onPortUp(data.id, 'output', e);
            }}
            onContextMenu={(e) => {
                e.stopPropagation(); e.preventDefault();
                onPortContextMenu && onPortContextMenu(data.id, 'output', e);
            }}
            onDoubleClick={(e) => {
                e.stopPropagation(); e.preventDefault();
                onPortDoubleClick && onPortDoubleClick(data.id, 'output', e);
            }}
         >
            <div 
                className={`w-3 h-3 border rounded-full flex items-center justify-center transition-all duration-300 group-hover/port:scale-150 ${isDarkMode ? 'bg-black' : 'bg-white'} ${isHotConnectionSource ? 'animate-ping' : ''}`}
                style={{ 
                    borderColor: isActiveChain ? accentColor : getPort('inactive', isDarkMode),
                    borderWidth: `${borderScale}px`
                }}
            >
                <div 
                    className="w-1.5 h-1.5 rounded-full" 
                    style={{ backgroundColor: isActiveChain ? accentColor : getPort('innerInactive', isDarkMode) }}
                />
            </div>
         </div>
      )}

      {/* Header */}
      <div 
        className={`flex items-center justify-between p-3 border-b cursor-grab active:cursor-grabbing ${isDarkMode ? 'border-white/5' : 'border-neutral-200'}`}
        style={{ borderBottomWidth: `${borderScale}px` }}
      >
        <div className="flex items-center gap-2">
          <span style={{ color: isActiveChain || isSelected ? accentColor : (isDarkMode ? '#666' : '#999') }}>
            {getNodeIcon(data.type)}
          </span>
          <div className="flex flex-col leading-none">
            <span className={`text-xs font-semibold tracking-wide ${isActiveChain || isSelected ? (isDarkMode ? 'text-white' : 'text-black') : subTextColor}`}>{data.label}</span>
            <span className="text-[10px] font-mono text-neutral-600 uppercase mt-0.5">{getTypeLabel(data.type)}</span>
          </div>
        </div>
        <div 
            className={`cursor-pointer p-1 hover:text-opacity-80 ${subTextColor}`}
            onClick={(e) => {
                e.stopPropagation();
                onToggleCollapse(data.id);
            }}
        >
          {data.collapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
        </div>
      </div>

      {/* Body */}
      {!data.collapsed && (
        <div className="p-3">
          {React.Children.map(children, child => {
              if (React.isValidElement(child)) {
                  // @ts-ignore
                  return React.cloneElement(child, { isDarkMode, accentColor });
              }
              return child;
          })}
        </div>
      )}
      
      {data.collapsed && (
          <div className="px-3 pb-2 pt-1 flex justify-center">
              <GripHorizontal size={12} className={isDarkMode ? "text-neutral-700" : "text-neutral-300"} />
          </div>
      )}
    </div>
  );
};
