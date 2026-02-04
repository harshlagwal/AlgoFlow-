"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FlowBuilder = void 0;
class FlowBuilder {
    static toMermaid(graph) {
        try {
            let mermaid = 'graph TD\n';
            // Base Styles
            mermaid += '    %% AlgoFlow Premium Style\n';
            mermaid += '    classDef highlight stroke:#ff00ff,stroke-width:4px,filter:drop-shadow(0 0 10px rgba(255, 0, 255, 0.4));\n\n';
            // Add Nodes (Strictly Rectangular)
            if (!graph.nodes || graph.nodes.length === 0) {
                return 'graph TD\n    af_start([START]) --> af_p[Analyze Selected Logic]\n    af_p --> af_end([END])';
            }
            graph.nodes.forEach(node => {
                const shape = this.getRectangularShape(node);
                // Ultra-sanitize for Mermaid string safety
                const safeLabel = node.label
                    .replace(/"/g, "'")
                    .replace(/[<>]/g, '')
                    .trim();
                mermaid += `    ${node.id}${shape.start}"${safeLabel}"${shape.end}\n`;
            });
            // Add Edges
            graph.edges.forEach(edge => {
                const label = edge.label ? `|"${edge.label}"| ` : '';
                mermaid += `    ${edge.from} --> ${label}${edge.to}\n`;
            });
            return mermaid;
        }
        catch (err) {
            console.error('Flow building failure', err);
            return 'graph TD\n    START([START]) --> ERR[Unable to build flow]\n    ERR --> END([END])';
        }
    }
    /**
     * Requirement: NO diamond shapes.
     * Students prefer simple, consistent block logic.
     */
    static getRectangularShape(node) {
        // All nodes use rounded rectangles for consistency and visual comfort
        return { start: '([', end: '])' };
    }
}
exports.FlowBuilder = FlowBuilder;
//# sourceMappingURL=FlowBuilder.js.map