---
trigger: always_on
---

# **Workspace Rules for Design System Migration**

## **Global Constraints**

1. **No Magic Numbers:** Never use raw numbers (e.g., 256, 0.5, \#FF0000) in React components. All values must come from a imported constants file, theme object, or Tailwind config class.
2. **Single Source of Truth:** The tailwind.config.js (or a dedicated design-tokens.ts) is the absolute authority on visual style.
3. **Strict Typing:** All props and tokens must be strongly typed interfaces. Use enums for Node Types and Connection Types.

## **File Structure & Responsibilities**

- @/tokens: Directory for all design tokens (colors, layout, physics, shortcuts).
- @/lib: The core library exports (what the engine will import).
- @/components: Pure UI components (dumb components).
- @/logic: Business logic (validation, interaction handlers).

## **Workflow: Optimization**

When asked to optimize a component:

1. Identify hardcoded styles.
2. Check if a token exists. If not, create a semantic token (e.g., spacing-node-header).
3. Replace the hardcoded value with the token.
4. Ensure the change supports "Theming" (Light/Dark mode) automatically.

## **Knowledge Retrieval**

When looking for logic:

- Keyboard actions are defined in App.tsx (listeners) but described in ShortcutsPanel.tsx.
- Connection physics and drawing logic reside in ConnectionLine.tsx and App.tsx (render loop).
