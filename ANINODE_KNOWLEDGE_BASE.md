# **Aninode Knowledge Base & Route Map**

This document guides the AI Agent on the structure and logic flow of the Aninode ecosystem, based on MASTER\_ARCHITECTURE.md.

## **1\. Core Philosophy (The "North Star")**

* **State Management:** Valtio is the ONLY source of truth.  
* **The 3 Laws:**  
  1. **Nodes** are Config Providers (UI writes to Valtio).  
  2. **Engines** Compute (GSAP/Rapier read Valtio \-\> write Computed Proxy).  
  3. **Renderers** Draw (React/Three read Computed Proxy \-\> Render).

## **2\. Token Logic Mappings**

The Design System (UI) sits in **Layer 2 (Node Graph)** and **Layer 5 (Renderers)** of the Architecture.

* **Visual Tokens (theme.tokens.ts)**:  
  * *Consumers:* BaseNode.tsx (ReactFlow Custom Node), ConnectionLine.tsx (SVG/Canvas), ThreeRenderer (Materials).  
  * *Purpose:* Ensure colors.neonRed looks identical in HTML DOM and WebGL Canvas.  
* **Interaction Logic**:  
  * *Current:* App.tsx handles drag/drop directly.  
  * *Future:* ReactFlow handles the physics of dragging. The Design System only provides the *styling* of the drag handle and the *snap grid size* (via tokens).  
* **Data Conversion (Implicit Logic)**:  
  * *Logic:* Boolean (true) \-\> Slider (100%).  
  * *Location:* This logic belongs in the **Engine Layer** (Modifier Chain), NOT the visual component. The visual component should only display what it receives.

## **3\. Future Roadmap Alignment**

* **Timeline:** The MasterTimelineNode and MiniTimeline (from AudioTimeline.tsx) share the same oledBlack theme as the canvas.  
* **Layer Manager:** Needs SidePanel visual tokens to look like a "Photoshop" tree.

## **4\. Architecture Layers for the Agent**

When refactoring, place files correctly:

* @/ui/tokens: JSON/TS definitions.  
* @/ui/components: Dumb React components (BaseNode, Port, Handle).  
* @/ui/hooks: UI-specific hooks (e.g., useNeonGlow).  
* @/core: (Out of scope for this agent) Where Valtio stores live.