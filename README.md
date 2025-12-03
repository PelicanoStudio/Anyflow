# Aninode Design System (MVP)

A high-fidelity, node-based UI library designed for next-generation animation engines. This system features an "OLED Black" aesthetic, infinite canvas navigation, and a robust signal flow visualization engine.

## 🌟 Features

### 🎨 Visuals
- **OLED Aesthetic**: Pure black backgrounds, subtle borders, and neon accents.
- **Signal Flow Highlighting**: Selecting a node lights up the entire upstream and downstream signal chain in a unique "Branch Color" (Cyan, Magenta, Lime, etc.).
- **Real-time Visualization**: Oscillator nodes feature live, 60fps canvas-based waveform rendering.
- **Inverse Scaling**: Wires and borders maintain a consistent "hairline" thickness regardless of zoom level.

### 🕸️ Wiring & Nodes
- **5 Cable Types**:
  - **Bezier**: Standard smooth curve.
  - **Straight (Telepathic)**: A straight line ending in an arrow that points to the target node's center (useful for wireless/remote data).
  - **Step**: Circuit-board style orthogonal routing.
  - **Double**: Thick dual-line for heavy data streams.
  - **Dotted**: For auxiliary or control signals.
- **Bi-directional Wiring**: Drag from Output→Input or Input→Output.
- **Smart Ports**: Context menus for precise disconnection.

### 🖱️ Interaction
- **Infinite Canvas**: Pan and Zoom with physics-based smooth scrolling.
- **Drag & Drop**: Snapping to grid (20px) for alignment.
- **Context Menus**: Right-click canvas to add nodes; Right-click ports to manage connections.

## 🎮 Controls

| Action | Control |
| :--- | :--- |
| **Pan Canvas** | Left Click Drag (Background) **OR** Shift + Scroll |
| **Zoom** | Mouse Wheel Scroll |
| **Select Node** | Left Click |
| **Add Node** | "Add Node" Button **OR** Context Menu (Right-click background) |
| **Duplicate Node** | `Ctrl` + Drag Node **OR** `Alt` + Drag Node |
| **Connect** | Drag from any Port to another Port |
| **Delete Selection** | `Delete` or `Backspace` key |
| **Disconnect Wire** | `Alt` + Click Wire **OR** Right-click Port > Uncheck |
| **Cancel Selection** | `Esc` key |

## 🛠️ Architecture

- **React 19**: Core framework.
- **Tailwind CSS**: Styling engine.
- **SVG**: High-performance wire rendering layer.
- **HTML Canvas**: Waveform visualization.
- **Lucide React**: Vector iconography.

### Node Coordinate System
- Nodes are 256px wide.
- **Input Port**: -24px relative to node left.
- **Output Port**: -24px relative to node right.
- **Grid Snap**: 20px.

## 🚀 Getting Started

1. **Install dependencies**: `npm install`
2. **Run dev server**: `npm start`
3. **Build**: `npm run build`
