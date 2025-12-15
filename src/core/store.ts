import { proxy } from 'valtio';
import { NodeData, Connection, NodeType, GridType } from '../../types';
import { canvasLayout } from '../../src/tokens';

// --- State Interface ---
export interface GraphState {
    nodes: NodeData[];
    connections: Connection[];
    viewport: { x: number; y: number; zoom: number };
    selection: Set<string>;
    dragState: {
        nodeIds: string[];
        startPositions: Record<string, { x: number; y: number }>;
        mouseStartX: number;
        mouseStartY: number;
    } | null;
    history: { nodes: NodeData[]; connections: Connection[] }[];
    historyIndex: number;
    // UI State that needs to be global
    gridType: GridType;
    isDarkMode: boolean;
}

// --- Initial State ---
const initialState: GraphState = {
    nodes: [
        { id: 'init_lfo', type: NodeType.OSCILLATOR, label: 'Master LFO', position: { x: 100, y: 100 }, config: { frequency: 1, amplitude: 1 } },
    ],
    connections: [],
    viewport: { x: 0, y: 0, zoom: 1 },
    selection: new Set(),
    dragState: null,
    history: [{ 
        nodes: [{ id: 'init_lfo', type: NodeType.OSCILLATOR, label: 'Master LFO', position: { x: 100, y: 100 }, config: { frequency: 1, amplitude: 1 } }], 
        connections: [] 
    }],
    historyIndex: 0,
    gridType: 'CROSS',
    isDarkMode: true,
};

// --- Proxy Store ---
export const graphState = proxy<GraphState>(initialState);

// --- Actions ---
export const graphActions = {
    // NODE OPERATIONS
    setNodes: (nodes: NodeData[]) => {
        graphState.nodes = nodes;
    },
    updateNodePosition: (id: string, x: number, y: number) => {
        const node = graphState.nodes.find(n => n.id === id);
        if (node) {
             node.position.x = x;
             node.position.y = y;
        }
    },
    updateNodeDimensions: (id: string, width: number, height: number, x?: number, y?: number) => {
        const node = graphState.nodes.find(n => n.id === id);
        if (node) {
            if (!node.dimensions) node.dimensions = { width, height };
            else {
                node.dimensions.width = width;
                node.dimensions.height = height;
            }
            if (x !== undefined && y !== undefined) {
                node.position.x = x;
                node.position.y = y;
            }
        }
    },
    updateNodeConfig: (id: string, key: string, value: any) => {
         const node = graphState.nodes.find(n => n.id === id);
         if (node) {
             node.config[key] = value;
         }
    },
    toggleNodeCollapse: (id: string) => {
        const node = graphState.nodes.find(n => n.id === id);
        if (node) {
            node.collapsed = !node.collapsed;
        }
    },

    // CONNECTION OPERATIONS
    setConnections: (connections: Connection[]) => {
        graphState.connections = connections;
    },
    addConnection: (connection: Connection) => {
        graphState.connections.push(connection);
    },
    removeConnection: (id: string) => {
        graphState.connections = graphState.connections.filter(c => c.id !== id);
    },

    // VIEWPORT
    setViewport: (viewport: { x: number; y: number; zoom: number }) => {
        graphState.viewport = viewport;
    },

    // SELECTION
    setSelection: (ids: Set<string>) => {
        graphState.selection = ids;
    },
    addToSelection: (id: string) => {
        graphState.selection.add(id);
    },
    removeFromSelection: (id: string) => {
        graphState.selection.delete(id);
    },
    clearSelection: () => {
        graphState.selection.clear();
    },

    // HISTORY
    pushHistory: () => {
        const newHistory = graphState.history.slice(0, graphState.historyIndex + 1);
        // Deep clone current state for history (simple JSON method for now)
        // In a real engine, we'd use patches or immutable structures.
        newHistory.push({ 
            nodes: JSON.parse(JSON.stringify(graphState.nodes)), 
            connections: [...graphState.connections] 
        });
        graphState.history = newHistory;
        graphState.historyIndex = newHistory.length - 1;
    },
    undo: () => {
        if (graphState.historyIndex > 0) {
            graphState.historyIndex--;
            const previous = graphState.history[graphState.historyIndex];
            graphState.nodes = JSON.parse(JSON.stringify(previous.nodes));
            graphState.connections = [...previous.connections];
        }
    },
    redo: () => {
        if (graphState.historyIndex < graphState.history.length - 1) {
             graphState.historyIndex++;
             const next = graphState.history[graphState.historyIndex];
             graphState.nodes = JSON.parse(JSON.stringify(next.nodes));
             graphState.connections = [...next.connections];
        }
    },

    // UI
    toggleDarkMode: () => {
        graphState.isDarkMode = !graphState.isDarkMode;
    },
    setGridType: (type: GridType) => {
        graphState.gridType = type;
    }
};
