import { FlowGraph } from './types';

export class DataBuilder {
    /**
     * Converts the FlowGraph into a payload suitable for the custom SVG renderer.
     * Since we are moving away from Mermaid, this now just ensures the data is clean
     * and adds any necessary visual metadata (like layout hints).
     */
    public static buildPayload(graph: FlowGraph): any {
        console.log('[AlgoFlow] Building final payload for webview');

        // Ensure every node has a default position or layout hint if needed
        const enrichedNodes = graph.nodes.map((node, index) => ({
            ...node,
            layout: {
                level: index, // Simple vertical stack hint
                isBranch: node.type === 'decision'
            }
        }));

        return {
            nodes: enrichedNodes,
            edges: graph.edges,
            executionOrder: graph.executionOrder,
            overallComplexity: graph.overallComplexity,
            config: {
                showCode: true,
                theme: 'student'
            }
        };
    }
}
