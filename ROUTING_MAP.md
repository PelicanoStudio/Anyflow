# Aninode Design System - Agent Routing Map

> **Purpose**: Enable future agents to navigate, generate, build, and edit any UI element in the design system with precision.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                     ANINODE UI LIBRARY STRUCTURE                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   TYPES (Shape)              TOKENS (Values)                        │
│   ═══════════════            ═══════════════                        │
│   "What data looks like"     "How things look visually"             │
│                                                                     │
│   ┌─────────────┐            ┌─────────────────┐                    │
│   │  types.ts   │            │  src/tokens/    │                    │
│   ├─────────────┤            ├─────────────────┤                    │
│   │ NodeType    │            │ colors.ts       │                    │
│   │ NodeData    │─────────▶  │ layout.ts       │                    │
│   │ Connection  │  consumes  │ animation.ts    │                    │
│   │ Position    │            │ shortcuts.ts    │                    │
│   └─────────────┘            │ connections.ts  │                    │
│         │                    │ theme.tokens.ts │                    │
│         │                    │ index.ts        │                    │
│         │                    └─────────────────┘                    │
│         │                            │                              │
│         └────────────┬───────────────┘                              │
│                      │                                              │
│                      ▼                                              │
│              ┌───────────────┐                                      │
│              │  COMPONENTS   │                                      │
│              │ (Pure UI)     │                                      │
│              └───────────────┘                                      │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Types vs Tokens: Technical Explanation

### Why Both Are Required (NOT Redundant)

| Aspect              | `types.ts`               | `src/tokens/`                  |
| ------------------- | ------------------------ | ------------------------------ |
| **Purpose**         | Define DATA STRUCTURE    | Define VISUAL VALUES           |
| **Content**         | Enums, Interfaces        | Colors, Dimensions, Animations |
| **TypeScript Role** | Compile-time type safety | Runtime values                 |
| **Changes**         | Rare (schema changes)    | Frequent (styling tweaks)      |
| **Example**         | `NodeType.OSCILLATOR`    | `signalActive = '#FF1F1F'`     |

### Dependency Flow

```
types.ts (SHAPE)
    ↓
tokens/*.ts (VALUES) → Some tokens import types for enums
    ↓
components/*.tsx (UI) → Import BOTH types and tokens
    ↓
App.tsx (COMPOSITION) → Wires everything together
```

### Why Not Merge Them?

1. **Separation of Concerns**: Data shape ≠ Visual presentation
2. **Type Safety**: TypeScript interfaces don't carry runtime values
3. **Tree Shaking**: Import only what you need
4. **Engine Compatibility**: Types are shared with Engine layer; UI tokens stay in UI layer

---

## File Routing Map

### 📁 Root Files

| File             | Purpose                      | When to Edit                            |
| ---------------- | ---------------------------- | --------------------------------------- |
| `types.ts`       | Core data interfaces & enums | Adding new node types, connection types |
| `App.tsx`        | Main application composition | Adding new features, layout changes     |
| `index.tsx`      | React entry point            | Never (boilerplate)                     |
| `vite.config.ts` | Build configuration          | Adding plugins, aliases                 |

### 📁 src/tokens/ — Design Token System

| File                | Exports                                                                                                                        | Use Case                               |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------- |
| **colors.ts**       | `signalActive`, `neonPalette`, `getColor()`, `getSurface()`, `getBorder()`, `getPort()`, `getWire()`, `getGrid()`, `getText()` | Theme colors, dark/light mode          |
| **layout.ts**       | `node`, `port`, `wire`, `canvas`, `panel`, `zIndex`, `icon`                                                                    | Dimensions, spacing, z-layers          |
| **animation.ts**    | `duration`, `easing`, `cssEasing`, `spring`, `glow`                                                                            | GSAP timing, CSS transitions           |
| **shortcuts.ts**    | `shortcuts`, `formatShortcut()`, `valueConversion`                                                                             | Keyboard bindings, property conversion |
| **connections.ts**  | `connectionRules`, `suggestConnectionType()`, `validateConnectionType()`                                                       | Wire semantics & validation            |
| **theme.tokens.ts** | `theme`, `getThemeColors()`, `getLayout()`, `getAnimation()`                                                                   | Consolidated theme object              |
| **index.ts**        | All re-exports                                                                                                                 | Single import point                    |

### 📁 components/ — UI Components

| Path                          | Component                        | Props Interface         | Tokens Used                                         |
| ----------------------------- | -------------------------------- | ----------------------- | --------------------------------------------------- |
| `nodes/BaseNode.tsx`          | Container for all node types     | `BaseNodeProps`         | `nodeLayout`, `zIndex`, `getPort()`, `getSurface()` |
| `nodes/NodeContent.tsx`       | Type-specific inner content      | `NodeContentProps`      | `signalActive`, `getSurface()`, `iconSizes`         |
| `nodes/Visualizer.tsx`        | Waveform display for oscillators | `VisualizerProps`       | `signalActive`                                      |
| `canvas/ConnectionLine.tsx`   | Wire rendering                   | `ConnectionLineProps`   | `portLayout`, `wireLayout`, `getWire()`             |
| `canvas/CanvasBackground.tsx` | Grid pattern                     | `CanvasBackgroundProps` | `canvasLayout`, `getGrid()`                         |
| `ui/Header.tsx`               | Top navigation bar               | `HeaderProps`           | `panelLayout`, `zIndex`, `iconSizes`                |
| `ui/ShortcutsPanel.tsx`       | Keyboard shortcuts display       | `ShortcutsPanelProps`   | `shortcuts`, `panelLayout`, `zIndex`                |
| `ui/NodePicker.tsx`           | Node creation modal              | `NodePickerProps`       | `getSurface()`, `zIndex`                            |
| `SidePanel.tsx`               | Property inspector               | `SidePanelProps`        | `panelLayout`, `zIndex`, `getBorder()`              |
| `ui/Input.tsx`                | Styled text input                | `InputProps`            | `getBorder()`                                       |

---

## Pattern Library

### Pattern 1: Creating a New Component

```typescript
// 1. Import types for props interface
import { NodeData, NodeType } from "@/types";

// 2. Import tokens for styling
import { getSurface, getBorder, zIndex, signalActive } from "@/src/tokens";

// 3. Define props interface using types
interface MyComponentProps {
  node: NodeData;
  isDarkMode: boolean;
  onAction: (id: string) => void;
}

// 4. Implement pure component using tokens
export const MyComponent: React.FC<MyComponentProps> = ({
  node,
  isDarkMode,
  onAction,
}) => {
  // Derive styles from tokens
  const bgColor = getSurface("node", isDarkMode);
  const borderColor = getBorder("default", isDarkMode);

  return (
    <div
      style={{
        backgroundColor: bgColor,
        borderColor: borderColor,
        zIndex: zIndex.node,
      }}
    >
      {/* Content */}
    </div>
  );
};
```

### Pattern 2: Adding a New Token

```typescript
// In src/tokens/colors.ts
export const myNewColor = {
  dark: "#HEXDARK",
  light: "#HEXLIGHT",
};

// Add helper function
export function getMyNewColor(isDarkMode: boolean): string {
  return isDarkMode ? myNewColor.dark : myNewColor.light;
}

// Re-export in src/tokens/index.ts
export { myNewColor, getMyNewColor } from "./colors";
```

### Pattern 3: Adding a New Node Type

```typescript
// 1. In types.ts - add to enum
export enum NodeType {
  // ... existing
  PHYSICS = 'PHYSICS',
}

// 2. In components/nodes/NodeContent.tsx - add case
case NodeType.PHYSICS:
  return <PhysicsNodeContent node={node} isDarkMode={isDarkMode} />;

// 3. In components/nodes/BaseNode.tsx - update getNodeIcon()
case NodeType.PHYSICS: return <Zap size={iconSizes.sm} />;

// 4. In BaseNode.tsx - update getTypeLabel()
case NodeType.PHYSICS: return "PHYSICS";
```

### Pattern 4: Adding a New Connection Rule

```typescript
// In src/tokens/connections.ts
export const connectionRules = {
  // ... existing
  [ConnectionType.NEW_TYPE]: {
    name: "Display Name",
    description: "What this wire type means",
    useCase: "When to use it",
    dataType: "single" | "list" | "stream" | "boolean" | "any",
    isAnimated: boolean,
    defaultColor: "default" | "telepathic" | "custom-key",
  },
};
```

---

## Quick Reference: Import Paths

```typescript
// Types (data structure)
import {
  NodeType,
  NodeData,
  Connection,
  ConnectionType,
  Position,
  GridType,
} from "@/types";

// All tokens (recommended)
import {
  signalActive,
  getSurface,
  getBorder,
  getPort,
  getWire,
  getGrid,
  nodeLayout,
  portLayout,
  wireLayout,
  canvasLayout,
  panelLayout,
  zIndex,
  iconSizes,
  duration,
  easing,
  cssEasing,
  shortcuts,
  formatShortcut,
  valueConversion,
  connectionRules,
  suggestConnectionType,
} from "@/src/tokens";

// Individual modules (tree-shaking)
import { signalActive, getSurface } from "@/src/tokens/colors";
import { nodeLayout, zIndex } from "@/src/tokens/layout";
```

---

## Decision Tree: Where to Make Changes

```
CHANGE NEEDED
    │
    ├─▶ Adding new data structure?
    │       └─▶ types.ts
    │
    ├─▶ Changing visual appearance?
    │       └─▶ src/tokens/*.ts
    │
    ├─▶ Adding new component?
    │       └─▶ components/*.tsx (import types + tokens)
    │
    ├─▶ Adding keyboard shortcut?
    │       └─▶ src/tokens/shortcuts.ts
    │
    ├─▶ Changing wire behavior/semantics?
    │       └─▶ src/tokens/connections.ts
    │
    ├─▶ Changing animation timing?
    │       └─▶ src/tokens/animation.ts
    │
    └─▶ Adding new node type?
            └─▶ types.ts + NodeContent.tsx + BaseNode.tsx
```

---

## Validation Checklist

Before completing any UI change:

- [ ] TypeScript compiles: `npx tsc --noEmit`
- [ ] No hardcoded colors/dimensions (use tokens)
- [ ] Dark/light mode works (use `isDarkMode` + helpers)
- [ ] Component is memoized if needed: `React.memo()`
- [ ] Props interface uses types from `types.ts`
