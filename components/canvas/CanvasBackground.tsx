import React from 'react';
import { GridType } from '../../types';
import { canvasLayout, getGrid } from '../../src/tokens';

interface CanvasBackgroundProps {
  viewport: { x: number; y: number; zoom: number };
  isDarkMode: boolean;
  gridType: GridType;
}

export const CanvasBackground: React.FC<CanvasBackgroundProps> = ({
  viewport,
  isDarkMode,
  gridType
}) => {
  const gridColor = getGrid(isDarkMode);
  const snapSize = canvasLayout.snapSize;

  return (
    <div 
        className="absolute inset-0 pointer-events-none opacity-20" 
        style={{ 
            backgroundPosition: `${viewport.x}px ${viewport.y}px`, 
            backgroundSize: `${snapSize * viewport.zoom}px ${snapSize * viewport.zoom}px`, 
            backgroundImage: gridType === 'DOTS' 
                ? `radial-gradient(${gridColor} 1px, transparent 2px)` 
                : `linear-gradient(${gridColor} 1px, transparent 1.5px), linear-gradient(90deg, ${gridColor} 1.5px, transparent 1.5px)` 
        }} 
    />
  );
};

