# Aninode Design System

A high-fidelity, node-based UI library designed for next-generation animation engines. This system features an "OLED Black" aesthetic, infinite canvas navigation, and a robust signal flow visualization engine.

## Key Features

### Core Architecture

- **Node-Based Workflow**: Modular components for procedural generation and signal processing.
- **Infinite Canvas**: Physics-based panning and zooming with infinite workspace.
- **Telepathic Connections**: Property-to-property binding system allowing values to be transmitted wirelessly between nodes.
- **Signal Flow Visualization**: Dynamic highlighting of upstream and downstream signal chains.

### Wiring & Connections

- **Smart Connection System**: Bi-directional wiring (Input-to-Output or Output-to-Input) with automatic compatibility filtering.
- **Cable Types**:
  - **Bezier**: Standard smooth curve for continuous signals.
  - **Straight (Telepathic)**: Direct visual link for bound properties.
  - **Step**: Orthogonal routing for logic paths.
  - **Double**: Dual-strand rendering for complex data types, utilizing a gap-masking technique for visual clarity.
  - **Dotted**: Auxiliary control signals.
- **Connection Logic**:
  - **One-to-One Restriction**: Prevents duplicate connections between the same ports.
  - **Automatic Type Conversion**: Boolean (0/1) and normalized decimal (0.0-1.0) values are automatically converted to percentages (0-100%) when connected to compatible fields (e.g., Sliders, Transform Scale).

### Interaction & Controls

- **Multi-Selection**: Select multiple nodes via `Shift + Click`.
- **Clipboard Operations**: Copy (`Ctrl + C`) and Paste (`Ctrl + V`) nodes preserving configuration (excluding connections).
- **History Management**: Robust Undo (`Ctrl + Z`) and Redo (`Ctrl + Y`) system for all canvas operations.
- **Focus Controls**: Instantly frame selected nodes (`F`) or the entire graph (`Shift + F`).
- **Quick Access**: Rapidly add nodes via the Node Picker (`Shift + Tab`).

### Visuals & Aesthetics

- **OLED Theme**: Deep black backgrounds with high-contrast neon accents.
- **Adaptive Grid**: Context-aware grid system (Dots/Lines/Crosshair) with optimized visibility for both Light and Dark modes.
- **Inverse Scaling**: UI elements maintain consistent stroke weights regardless of zoom level.
- **Real-time Visualization**: 60fps canvas-based rendering for Oscillator waveforms.

## Keyboard Shortcuts

| Action               | Shortcut               |
| :------------------- | :--------------------- |
| **Pan Canvas**       | Left Drag (Background) |
| **Zoom**             | Mouse Wheel            |
| **Add to Selection** | `Shift` + Click        |
| **Node Picker**      | `Shift` + `Tab`        |
| **Undo**             | `Ctrl` + `Z`           |
| **Redo**             | `Ctrl` + `Y`           |
| **Copy**             | `Ctrl` + `C`           |
| **Paste**            | `Ctrl` + `V`           |
| **Focus Selected**   | `F`                    |
| **Focus All**        | `Shift` + `F`          |
| **Duplicate**        | `Alt` + Drag           |
| **Delete**           | `Delete` / `Backspace` |
| **Disconnect Wire**  | `Alt` + Click Wire     |

## Technical Stack

- **Framework**: React 19
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Rendering**: Hybrid SVG (wires) and HTML5 Canvas (visualizers)

## Getting Started

1. **Install dependencies**: `npm install`
2. **Run dev server**: `npm run dev`
3. **Build**: `npm run build`
