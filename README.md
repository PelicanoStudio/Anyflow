# Aninode Design System

A high-fidelity, fully tokenized UI library designed for next-generation animation engines. This system features an OLED aesthetic, infinite canvas navigation, and a robust signal flow visualization engine. All values are parameterized through a comprehensive token system, enabling cascading updates across the entire UI with zero magic numbers.

## Architecture

### Design Principles

- **Zero Magic Numbers**: Every visual value (colors, spacing, timing) comes from imported token files
- **Single Source of Truth**: `theme.tokens.ts` aggregates all tokens for unified access
- **Dark/Light Mode Support**: All color tokens support automatic theme switching via helper functions
- **Cascading Updates**: Change a token once, all consumers update automatically
- **Type Safety**: Full TypeScript coverage with strongly-typed interfaces and enums

### Modular Structure

```
aninode-design-system/
├── src/
│   └── tokens/                  # Design Token System
│       ├── index.ts             # Barrel export (clean public API)
│       ├── theme.tokens.ts      # Master theme object
│       ├── colors.ts            # OLED color palette
│       ├── layout.ts            # Dimensions, z-index, spacing
│       ├── animation.ts         # GSAP durations, easing, springs
│       ├── shortcuts.ts         # Keyboard shortcuts + value conversion
│       └── connections.ts       # Wire semantics
├── components/
│   ├── canvas/                  # Canvas-related components
│   │   ├── CanvasBackground.tsx # Adaptive grid (Dots/Lines/Cross)
│   │   └── ConnectionLine.tsx   # Wire rendering (5 types)
│   ├── nodes/                   # Node components
│   │   ├── BaseNode.tsx         # Base node with ports, resize
│   │   ├── NodeContent.tsx      # Type-specific UI rendering
│   │   └── Visualizer.tsx       # 60fps canvas waveforms
│   ├── ui/                      # UI components
│   │   ├── Header.tsx           # Theme, grid, history controls
│   │   ├── NodePicker.tsx       # Node creation modal
│   │   ├── ShortcutsPanel.tsx   # Keyboard shortcut legend
│   │   └── Input.tsx            # Reusable input component
│   └── SidePanel.tsx            # Property inspector
├── hooks/                       # Custom React hooks
│   ├── usePinchZoom.ts          # Two-finger pinch gesture
│   └── useLongPress.ts          # Long-press detection (mobile)
├── utils/                       # Utility functions
│   ├── deviceDetection.ts       # UA-based mobile/tablet detection
│   ├── geometry.ts              # Position calculations
│   └── menuPosition.ts          # Safe context menu positioning
├── types.ts                     # TypeScript definitions
└── App.tsx                      # Main orchestrator
```

## Token System

All visual values flow through the token system. This ensures consistent styling and enables theme customization.

### Token Modules

| Module            | Purpose                                  | Key Exports                                                                                          |
| :---------------- | :--------------------------------------- | :--------------------------------------------------------------------------------------------------- |
| `colors.ts`       | OLED color palette with dark/light modes | `getSurface`, `getBorder`, `getPort`, `getWire`, `getGrid`, `getText`, `signalActive`, `neonPalette` |
| `layout.ts`       | Dimensions, z-index, spacing constants   | `nodeLayout`, `portLayout`, `wireLayout`, `canvasLayout`, `panelLayout`, `zIndex`, `iconSizes`       |
| `animation.ts`    | GSAP-compatible timing tokens            | `duration`, `easing`, `cssEasing`, `spring`, `delay`, `glow`                                         |
| `shortcuts.ts`    | Keyboard shortcuts + value conversion    | `shortcuts`, `formatShortcut`, `valueConversion`                                                     |
| `connections.ts`  | Wire type semantics and validation       | `connectionRules`, `suggestConnectionType`, `validateConnectionType`                                 |
| `theme.tokens.ts` | Master theme aggregator                  | `theme`, `getThemeColors`, `getLayout`, `getAnimation`                                               |

### Usage Pattern

```typescript
// Import from barrel export
import {
  getSurface,
  getBorder,
  nodeLayout,
  zIndex,
  getThemeColors,
} from "@/src/tokens";

// Use in components
const backgroundColor = getSurface("node", isDarkMode);
const borderColor = getBorder("default", isDarkMode);
const width = nodeLayout.width; // 256

// Or get complete theme object
const colors = getThemeColors(isDarkMode);
// colors.surface.node, colors.border.default, etc.
```

### Layout Constants

| Category | Token                 | Value     |
| :------- | :-------------------- | :-------- |
| Node     | `width`               | 256px     |
| Node     | `defaultHeight`       | 128px     |
| Node     | `headerHeight`        | 48px      |
| Node     | `borderRadius`        | 12px      |
| Port     | `size`                | 12px      |
| Port     | `hitboxSize`          | 24px      |
| Canvas   | `snapSize`            | 20px      |
| Canvas   | `zoomMin` / `zoomMax` | 0.2 / 3.0 |
| Panel    | `sidePanelWidth`      | 320px     |
| Panel    | `headerHeight`        | 56px      |

### Animation Durations

| Token      | Value | Use Case         |
| :--------- | :---- | :--------------- |
| `instant`  | 0.1s  | Hover states     |
| `fast`     | 0.2s  | Buttons, toggles |
| `normal`   | 0.3s  | Panels, menus    |
| `slow`     | 0.5s  | Modals           |
| `verySlow` | 0.8s  | Page transitions |

## Key Features

### Core Architecture

- **Node-Based Workflow**: Modular components for procedural generation and signal processing
- **Infinite Canvas**: Physics-based panning and zooming with infinite workspace
- **Inverse Scaling**: UI elements maintain consistent stroke weights regardless of zoom level
- **Signal Flow Visualization**: Dynamic highlighting of upstream and downstream signal chains

### Node Types

| Type         | Purpose                 | Teleportable Properties  |
| :----------- | :---------------------- | :----------------------- |
| `PICKER`     | Asset/color selection   | -                        |
| `OSCILLATOR` | Waveform generation     | frequency, amplitude     |
| `TRANSFORM`  | Position/rotation/scale | All transform properties |
| `OUTPUT`     | Final output sink       | -                        |
| `LOGIC`      | Conditional logic       | -                        |
| `SLIDER`     | Numeric value (range)   | `value`                  |
| `NUMBER`     | Numeric input           | `value`                  |
| `BOOLEAN`    | On/Off toggle           | `enabled`                |
| `CLONE`      | Linked instance         | -                        |

### Wiring & Connections

The connection system supports five semantically distinct wire types:

| Type         | Visual          | Semantic              | Use Case                        |
| :----------- | :-------------- | :-------------------- | :------------------------------ |
| **Bezier**   | Smooth curve    | Single parameter flow | Standard value connections      |
| **Double**   | Thick pipe      | List/Array data       | Batch data, object lists        |
| **Dotted**   | Dashed animated | Live/Stream           | LFO signals, real-time feeds    |
| **Step**     | Orthogonal      | Logic/Boolean         | If/else triggers, state changes |
| **Straight** | Dashed arrow    | Telepathic/Wireless   | Remote property binding         |

**Connection Features:**

- Bi-directional wiring (Input-to-Output or Output-to-Input)
- Hot Wire Mode: `Shift + Click` on any port to activate quick connection mode
- One-to-One Restriction: Prevents duplicate connections between same ports
- Automatic Type Conversion: Boolean (0/1) and normalized decimals (0.0-1.0) convert to percentages automatically

### Property Teleportation

The system supports wireless property binding between nodes:

- **Broadcast**: Right-click (or long-press on mobile) any property to broadcast its value
- **Receive**: Select "Receive" to bind a property to a broadcasting source
- **Automatic Conversion**: Values are automatically converted between types (boolean→percentage, decimal→percentage)
- **Visual Feedback**: Bound properties display a link icon indicator
- **Safe Menu Positioning**: Context menus automatically adjust to stay within viewport bounds

### Resizable Nodes

Nodes can be resized from four corner handles:

- **Standard Resize**: Drag any corner
- **Alt + Drag**: Resize from center (proportional expansion)

### Mobile & Touch Support

- **Device Detection**: UA-based detection (no screen size dependency)
- **Pinch-to-Zoom**: Two-finger gesture with world-space centering
- **Tap-to-Connect**: Single tap on ports activates hot wire mode
- **Long-Press**: Opens context menu (replaces right-click)
- **Touch-Optimized**: All interactive elements support both mouse and touch events

## Keyboard Shortcuts

| Action                 | Desktop                      | Mobile/Touch        |
| :--------------------- | :--------------------------- | :------------------ |
| Pan Canvas             | Drag Background              | One-finger drag     |
| Zoom                   | Mouse Wheel                  | Pinch gesture       |
| Add to Selection       | `Shift` + Click              | -                   |
| Node Picker            | `Shift` + `Tab`              | -                   |
| Undo / Redo            | `Ctrl` + `Z` / `Y`           | -                   |
| Copy / Paste           | `Ctrl` + `C` / `V`           | -                   |
| Focus Selected         | `F`                          | -                   |
| Focus All              | `Shift` + `F`                | -                   |
| Duplicate Node         | `Alt` + Drag                 | -                   |
| Quick Clone            | `Ctrl` + `Alt` + Drag (Port) | -                   |
| Delete                 | `Delete` / `Backspace`       | -                   |
| Disconnect Wire        | `Alt` + Click Wire           | -                   |
| Hot Wire Mode          | `Shift` + Click Port         | Tap Port            |
| Property Teleportation | Right-click Property         | Long-press Property |

## Technical Stack

- **Framework**: React 19
- **Styling**: Tailwind CSS (tokens override utility classes)
- **Build Tool**: Vite
- **Icons**: Lucide React
- **Rendering**: Hybrid SVG (wires) + HTML5 Canvas (waveforms)
- **Animation Ready**: GSAP-compatible timing tokens
- **State Management Ready**: Tokens designed for Valtio integration

## Getting Started

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

## Library Integration Guidelines

This codebase is structured for seamless library packaging:

1. **Token-First Development**: Always import from `@/src/tokens` instead of using inline values
2. **Component Purity**: Components receive all styling through tokens and props
3. **Hook Reusability**: Custom hooks (`usePinchZoom`, `useLongPress`) are framework-agnostic
4. **Cascading Changes**: Update `src/tokens/*.ts` to affect all consuming components

### Extending the System

**To add a new node type:**

1. Add enum value to `types.ts` → `NodeType`
2. Add rendering case to `NodeContent.tsx`
3. Add icon mapping to `BaseNode.tsx` → `getNodeIcon()`
4. Add label mapping to `BaseNode.tsx` → `getTypeLabel()`

**To add a new color token:**

1. Define in `src/tokens/colors.ts` with `dark`/`light` variants
2. Export helper function if needed
3. Re-export from `theme.tokens.ts` if part of semantic theme

**To add a new shortcut:**

1. Add to appropriate category in `src/tokens/shortcuts.ts`
2. Add handler in `App.tsx` → `handleKeyDown()`

## Roadmap

- PWA offline support
- iOS/Android web wrapper deployment
- Additional node types (Gradient, Array, Math)
- Visual connection type picker
- Preset system for node configurations
