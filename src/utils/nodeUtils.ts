import { NodeType } from '../../types';

export const getTypeLabel = (type: NodeType) => {
    switch(type) {
        case NodeType.OSCILLATOR: return "LFO";
        case NodeType.TRANSFORM: return "MODIFIER";
        case NodeType.SLIDER: return "SLIDER";
        case NodeType.NUMBER: return "VALUE";
        case NodeType.BOOLEAN: return "SWITCH";
        case NodeType.CLONE: return "INSTANCE";
        default: return type;
    }
};
