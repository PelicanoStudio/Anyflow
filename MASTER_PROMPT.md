# **Role: Design System Architect & Tokenization Specialist**

Objective:  
Analyze the provided repository (aninode-design-system) and refactor it into a strict, token-based Design System Library. This library will serve as the "Single Source of Truth" (SSOT) for the UI of the Aninode Engine (detailed in MASTER\_ARCHITECTURE.md).  
Context:  
You have access to the codebase and documentation. Specifically review:

1. MASTER\_ARCHITECTURE.md: **CRITICAL.** Defines the core philosophy ("Nodes are Config Providers"), the stack (Valtio, GSAP, Rapier), and the "Three Inviolable Laws".  
2. App.tsx: Current prototype logic (to be extracted/refactored).  
3. components/nodes/BaseNode.tsx: The visual chassis.  
4. tailwind.config.js: Current rudimentary styles.

Target Tech Stack (Migration Goal):  
The design system you build must be consumed by this specific stack:

* **State:** valtio (Proxy-based state). *Do not use Zustand or Redux.*  
* **Graph UI:** reactflow (The nodes you design must be compatible with ReactFlow custom node API).  
* **3D Viewport:** @react-three/fiber (Tokens must be usable in R3F materials).  
* **Animation:** gsap (Tokens must configure GSAP tweens).  
* **Physics:** @react-three/rapier.

Core Directive:  
DO NOT rewrite the engine logic. Your job is strictly Visual Abstraction & Tokenization. Eliminate ALL hardcoded values (magic numbers, hex codes, arbitrary pixel values) so they can be driven by the Engine's state (Valtio).

## **1\. Recursive Extraction & Analysis**

Extract details into a centralized token structure:

* **Visuals (OLED Aesthetic):** Colors (neonRed, oledBlack), border radii, blur strengths, font families.  
* **Layout:** Node dimensions, port offsets, grid spacing.  
* **Feedback:** "Active" states for wires (when signal flows), "Selected" states for nodes.  
* **Shortcuts:** Map existing listeners in App.tsx to a config object.

## **2\. Deliverables**

### **A. The Design Token Schema (JSON/TS)**

Create theme.tokens.ts acting as the bridge between your UI and the Engine (Valtio/GSAP).

* colors.signal.active (Used by ReactFlow edges and R3F materials).  
* physics.snap.threshold (Used by ReactFlow config).  
* animation.duration.fast (Used by GSAP).

### **B. Refactored Component Architecture**

Refactor BaseNode to be a **Pure Component** (dumb UI) that receives data properties.

* *Constraint:* The Node must NOT hold local state. It must read from props/tokens, adhering to the Master Architecture's Law \#1 ("Nodes are Config Providers").

### **C. Logic Separation**

* Move visual logic (e.g., "draw a curved line") to stateless helpers.  
* Move interaction logic (e.g., "connect A to B") to a LogicLayer interface that the Engine will implement later using Valtio.

Final Note:  
The output must be a library (@aninode/ui) that the Aninode Engine imports. It provides the Look & Feel, while valtio and reactflow provide the State & Structure.