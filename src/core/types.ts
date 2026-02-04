export type NodeType = 'start' | 'end' | 'process' | 'decision' | 'input' | 'output';

export interface FlowNode {
    id: string;
    label: string;
    type: NodeType;
    explanation: string;
    complexity?: {
        time?: string;
        space?: string;
        reason?: string;
    };
    codeSnippet?: string;
}

export interface FlowEdge {
    from: string;
    to: string;
    label?: string;
}

export interface FlowGraph {
    nodes: FlowNode[];
    edges: FlowEdge[];
    executionOrder: string[];
    overallComplexity?: {
        time: string;
        space: string;
        timeReason: string;
        spaceReason: string;
        analyzedBlock?: string;
    };
}
