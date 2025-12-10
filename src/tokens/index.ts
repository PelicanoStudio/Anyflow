/**
 * @aninode/ui - Token Barrel Export
 * Clean public API for importing design tokens
 */

// Master theme (preferred import)
export { theme, getThemeColors, getLayout, getAnimation } from './theme.tokens';
export type { Theme } from './theme.tokens';

// Individual token modules
export * as colors from './colors';
export * as layout from './layout';
export * as animation from './animation';
export * as shortcutsModule from './shortcuts';

// Commonly used direct exports
export { 
  signalActive, 
  neonPalette,
  getColor,
  getSurface,
  getBorder,
  getPort,
  getWire,
  getGrid,
  getText,
} from './colors';

export {
  node as nodeLayout,
  port as portLayout,
  wire as wireLayout,
  canvas as canvasLayout,
  panel as panelLayout,
  zIndex,
  icon as iconSizes,
} from './layout';

export {
  duration,
  easing,
  cssEasing,
} from './animation';

export {
  shortcuts,
  formatShortcut,
  getShortcutsByCategory,
  valueConversion,
} from './shortcuts';

export {
  connectionRules,
  suggestConnectionType,
  validateConnectionType,
  getConnectionTypeOptions,
} from './connections';

