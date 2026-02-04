import { FlowGraph, FlowNode, FlowEdge, NodeType } from './types';

export class Parser {
    public static parse(code: string, languageId: string): FlowGraph {
        try {
            const normalizedCode = this.normalizeIndentation(code);
            const lines = normalizedCode.split('\n');
            const nodes: FlowNode[] = [];
            const edges: FlowEdge[] = [];
            const rawExecutionOrder: string[] = [];

            // 1. Language-Aware START node
            const langName = this.getLanguageName(languageId);
            const startId = 'af_start';
            let analyzedBlockName = 'Code Selection';

            nodes.push({
                id: startId,
                label: 'START',
                type: 'start',
                explanation: `Hi! I've detected this as **${langName}** code. Let's trace how it flows step-by-step! 🚀`,
                codeSnippet: `Detected: ${langName}`
            });

            let lastNodeIds: string[] = [startId];

            // Stack to track blocks for loops and conditions
            const blockStack: {
                indent: number;
                type: 'if' | 'loop';
                startNodeId: string;
                bodyNodes: string[];
                trueBranchLastNodes: string[];
                falseBranchLastNodes: string[];
                hasElse: boolean;
            }[] = [];

            for (let index = 0; index < lines.length; index++) {
                const line = lines[index];
                const trimmed = line.trim();

                // Ignore comments and empty lines
                if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('//') || trimmed.startsWith('/*')) continue;

                const indent = line.search(/\S/);
                const id = `af_node_${index}`;

                // Pop blocks
                while (blockStack.length > 0 && indent <= blockStack[blockStack.length - 1].indent) {
                    const block = blockStack.pop()!;
                    if (block.type === 'if') {
                        lastNodeIds = [...block.trueBranchLastNodes, ...block.falseBranchLastNodes];
                        if (!block.hasElse) {
                            lastNodeIds.push(block.startNodeId);
                        }
                    } else if (block.type === 'loop') {
                        // Loop back edge
                        lastNodeIds.forEach(prevId => {
                            edges.push({ from: prevId, to: block.startNodeId, label: 'repeat' });
                        });
                        lastNodeIds = [block.startNodeId];
                    }
                }

                // Node Classification & Language-Specific Explanations
                let nodeType: NodeType = 'process';
                let label = 'ACTION';
                let explanation = 'The computer performs this task and then moves on to the next one.';
                let nodeCode = trimmed;

                // Decision/Branching
                if (trimmed.match(/^if\s+/) || trimmed.match(/^if\s*\(/)) {
                    nodeType = 'decision';
                    label = 'QUESTION';
                    explanation = 'Wait! The computer is asking a question here. If the response is YES, it follows one path. If NO, it skips to the other!';
                    blockStack.push({
                        indent, type: 'if', startNodeId: id, bodyNodes: [],
                        trueBranchLastNodes: [], falseBranchLastNodes: [], hasElse: false
                    });
                }
                // Loops
                else if (trimmed.match(/^for\s+/) || trimmed.match(/^while\s+/)) {
                    nodeType = 'decision';
                    label = 'LOOP START';
                    explanation = 'This is where a loop begins! The computer will keep repeating the steps inside as long as the condition stays true.';
                    blockStack.push({
                        indent, type: 'loop', startNodeId: id, bodyNodes: [],
                        trueBranchLastNodes: [], falseBranchLastNodes: [], hasElse: false
                    });
                }
                // Imports & Includes
                else if (trimmed.startsWith('import ') || trimmed.startsWith('from ') || trimmed.startsWith('#include') || trimmed.startsWith('require(')) {
                    nodeType = 'process';
                    label = 'IMPORT TOOLS';
                    explanation = this.getImportExplanation(languageId, trimmed);
                }
                // Function Definitions
                else if (trimmed.match(/^def\s+/) || trimmed.match(/^(public|private|static|protected|void|int|double|String)\s+\w+\s*\(/)) {
                    nodeType = 'process';
                    label = 'TEACHING SKILL';
                    explanation = this.getDefinitionExplanation(languageId, trimmed);
                    if (analyzedBlockName === 'Code Selection') {
                        const funcMatch = trimmed.match(/(?:def|function|void|int|String|public|private)\s+(\w+)/);
                        if (funcMatch) analyzedBlockName = `function ${funcMatch[1]}`;
                    }
                }
                // Class Definitions
                else if (trimmed.startsWith('class ')) {
                    nodeType = 'process';
                    label = 'BLUEPRINT';
                    explanation = 'We are creating a Class! Think of it as a blueprint for making objects that share the same data and skills.';
                }
                // React / UI Specific
                else if (trimmed.includes('useState') || trimmed.includes('useEffect')) {
                    nodeType = 'process';
                    label = 'REACT HOOK';
                    explanation = 'This line is managing the component\'s internal memory or life-cycle. It tells the UI to update when things change! ✨';
                }
                else if (trimmed.includes('return') && (trimmed.includes('<') || trimmed.includes('div') || trimmed.includes('App'))) {
                    nodeType = 'process';
                    label = 'RENDER';
                    explanation = 'This part tells React exactly what should appear on the student\'s screen! 💻';
                }
                // Output Detection
                else if (trimmed.match(/print\(|console\.log\(|System\.out|cout|printf/)) {
                    nodeType = 'output';
                    label = 'DISPLAY';
                    explanation = this.getOutputExplanation(languageId);
                }
                // Variable Storage
                else if (trimmed.includes('=') && !trimmed.match(/[><!]=/) && !trimmed.includes('==')) {
                    nodeType = 'process';
                    label = 'STORAGE';
                    explanation = this.getStorageExplanation(languageId, trimmed);
                }
                // Else handling
                else if (trimmed.startsWith('else:') || trimmed.match(/^else\s*\{/) || trimmed.startsWith('else ')) {
                    const currentBlock = blockStack[blockStack.length - 1];
                    if (currentBlock && currentBlock.type === 'if') {
                        currentBlock.trueBranchLastNodes = [...lastNodeIds];
                        currentBlock.hasElse = true;
                        lastNodeIds = [currentBlock.startNodeId];
                    }
                    continue;
                }

                const loopDepth = blockStack.filter(b => b.type === 'loop').length;
                const nodeComp = this.getNodeComplexity(trimmed, label, loopDepth, lines);
                nodes.push({
                    id, label, type: nodeType, explanation, codeSnippet: nodeCode,
                    complexity: nodeComp
                });

                if (blockStack.length > 0) {
                    blockStack[blockStack.length - 1].bodyNodes.push(id);
                }

                const currentBlock = blockStack[blockStack.length - 1];
                if (currentBlock) {
                    if (id === currentBlock.startNodeId) {
                        lastNodeIds.forEach(prevId => edges.push({ from: prevId, to: id }));
                    } else {
                        const isTrueBranch = currentBlock.trueBranchLastNodes.length === 0 && !currentBlock.hasElse;
                        const edgeLabel = isTrueBranch ? 'yes' : (currentBlock.hasElse ? 'no' : undefined);
                        edges.push({ from: currentBlock.startNodeId, to: id, label: edgeLabel });
                    }
                } else {
                    lastNodeIds.forEach(prevId => edges.push({ from: prevId, to: id }));
                }

                lastNodeIds = [id];
                rawExecutionOrder.push(id);
            }

            while (blockStack.length > 0) {
                const block = blockStack.pop()!;
                if (block.type === 'loop') {
                    lastNodeIds.forEach(prevId => edges.push({ from: prevId, to: block.startNodeId, label: 'repeat' }));
                    lastNodeIds = [block.startNodeId];
                }
            }

            // 3. Final END node
            const endId = 'af_end';
            nodes.push({
                id: endId, label: 'END', type: 'end',
                explanation: `High five! The ${langName} logic has finished running. Everything executed perfectly! 🏁`,
                codeSnippet: 'Exit Point'
            });
            lastNodeIds.forEach(nodeId => edges.push({ from: nodeId, to: endId }));

            return {
                nodes: this.deduplicateNodes(nodes),
                edges: this.deduplicateEdges(edges),
                executionOrder: this.refineExecutionOrder(nodes, edges, rawExecutionOrder),
                overallComplexity: this.calculateOverallComplexity(nodes, analyzedBlockName)
            } as FlowGraph;
        } catch (err) {
            console.error('[AlgoFlow] Parser Error:', err);
            return this.getLinearFallback(code);
        }
    }

    private static getLanguageName(id: string): string {
        switch (id.toLowerCase()) {
            case 'java': return 'Java';
            case 'python': return 'Python';
            case 'cpp': return 'C++';
            case 'c': return 'C';
            case 'javascript':
            case 'typescript': return 'Node.js';
            case 'javascriptreact':
            case 'typescriptreact': return 'React';
            default: return 'Code';
        }
    }

    private static getImportExplanation(id: string, code: string): string {
        const lang = id.toLowerCase();
        if (code.includes('math')) return 'Bringing in the **Math Toolbox** for complex calculations! 📐';
        if (code.includes('random')) return 'Bringing in the **Random Toolbox** to generate surprises! 🎲';
        if (code.includes('scanner') || code.includes('util')) return 'Bringing in **Utility Tools** to help with inputs and data! 🛠️';
        if (code.includes('iostream')) return 'Bringing in **Input/Output tools** for C++ to talk to you!';

        return 'Bringing in a **Box of Extra Tools** so the computer knows new tricks! 📦';
    }

    private static getDefinitionExplanation(id: string, code: string): string {
        const lang = id.toLowerCase();
        if (lang === 'python') return 'Using **def** to teach Python a new skill (function). We can call this later!';
        if (lang === 'java' || lang === 'cpp') {
            if (code.includes('main')) return 'This is the **Main Function**—the entry point where the adventure begins!';
            return 'Defining a new **Method**. We are teaching the computer a specific task to perform.';
        }
        return 'We are teaching the computer a new skill that we can name and use later! 🎓';
    }

    private static getOutputExplanation(id: string): string {
        switch (id.toLowerCase()) {
            case 'java': return 'The computer is using Java\'s **System.out** to show a value on the screen!';
            case 'cpp': return 'Using **std::cout**, C++ is sending data to your monitor!';
            case 'c': return 'The **printf** function is printing text to the console.';
            case 'python': return 'Python\'s **print()** function is showing you the results!';
            case 'javascriptreact':
            case 'typescriptreact': return 'React is logging this information or rendering it to the DOM for you!';
            default: return 'The computer is showing a value on the screen for you to see!';
        }
    }

    private static getStorageExplanation(id: string, code: string): string {
        if (id.toLowerCase() === 'java' && (code.includes('new ') || code.includes('ArrayList') || code.includes('HashMap'))) {
            return 'Java is creating a new **Object** or **Collection** to organize your data neatly.';
        }
        if (id.toLowerCase() === 'cpp' && code.includes('vector')) {
            return 'C++ is setting up a dynamic **Vector** to store multiple values in memory.';
        }
        return 'The computer is storing a value inside a variable (think of it like a labeled box) to use later.';
    }

    private static getNodeComplexity(code: string, label: string, depth: number, allLines: string[]) {
        let time = 'O(1)';
        let space = 'O(1)';
        let reason = 'This is a single step operation.';

        const fullCode = allLines.join('\n');

        // Logarithmic Detection (Binary Search Patterns)
        if (fullCode.includes('mid =') && (fullCode.includes('high = mid') || fullCode.includes('low = mid'))) {
            if (label === 'LOOP START' || code.includes('return')) {
                time = 'O(log n)';
                reason = 'The search space is cut in half each step! This is very efficient.';
            }
        }

        // Recursive Analysis (Cheat Sheet / Advanced)
        const funcCallMatch = code.match(/(\w+)\((.*)\)/);
        if (funcCallMatch && !code.includes('print') && !code.includes('log')) {
            const funcName = funcCallMatch[1];
            const args = funcCallMatch[2];
            if (fullCode.includes(`def ${funcName}`) || fullCode.includes(`${funcName}(`)) {
                // Determine recursion type
                if (args.includes('/ 2') || args.includes('// 2') || args.includes('>> 1')) {
                    // Check if it's 2T(n/2) or T(n/2)
                    if (code.match(/2\s*\*|.*\+.*(\w+)\(/)) {
                        time = 'O(n log n)';
                        reason = 'Divide and conquer with multiple branches detected.';
                    } else {
                        time = 'O(log n)';
                        reason = 'The problem size is halved at each step.';
                    }
                    space = 'O(log n)';
                } else if (code.match(/(\w+)\(.*\).*\+.*(\1)\(.*\)/)) {
                    time = 'O(2^n)';
                    space = 'O(n)';
                    reason = 'Fibonacci-style recursion detected. It grows exponentially!';
                } else if (args.includes('- 1') || args.includes('-1')) {
                    time = 'O(n)';
                    space = 'O(n)';
                    reason = 'Linear recursion detected. The stack grows with the input size.';
                }
            }
        }

        // Loop Complexity
        if (label === 'LOOP START' && time === 'O(1)') {
            if (this.isFixedRangeLoop(code)) {
                // STUDENT-AWARE RULE: Treat fixed ranges as symbolic 'n' for demo purposes
                const d = Math.max(1, depth);
                time = d === 1 ? 'O(n)' : `O(n^${d})`;
                const numMatch = code.match(/\d+/);
                const exampleNum = numMatch ? numMatch[0] : '10';

                reason = d === 1
                    ? `In real-world complexity, this is constant because it runs exactly ${exampleNum} times, but for learning purposes, we treat it as linear O(n).`
                    : `Nested loops detected (Level ${d}).\nFixed numbers represent example input size n.`;
            } else {
                const d = Math.max(1, depth);
                time = d === 1 ? 'O(n)' : `O(n^${d})`;
                reason = d === 1 ? 'The loop runs once for each item (Linear).' : `This is a nested loop (Level ${d}).`;
            }
        }

        // Sorting Detection (Cheat Sheet: O(n log n))
        if (code.match(/\.sort\(|sorted\(|Arrays\.sort\(|Collections\.sort\(/)) {
            time = 'O(n log n)';
            space = 'O(n)';
            reason = 'Sorting algorithm detected. This usually takes linearithmic time.';
        }

        // Space Complexity for Data Structures (Cheat Sheet: O(n))
        if (code.match(/\[.*\]|new\s+\w+\[|ArrayList|vector|HashMap|Set|list\(/)) {
            if (code.includes('[n]') || code.includes('(n)') || code.includes('range(n)') || code.includes('size') || this.isFixedRangeLoop(code)) {
                space = 'O(n)';
                reason = 'Creating an extra array or data structure that grows with your input.';
            }
        }

        // Recursive Stack Space
        // Handled in Recursive Analysis section above

        // Space complexity for dynamic growth in loops
        if (depth > 0 && (code.includes('.append(') || code.includes('.push(') || code.includes('+= ['))) {
            space = 'O(n)';
            reason = 'This loop is building a dynamic collection in memory. Space grows with n.';
        }

        return { time, space, reason };
    }

    private static isFixedRangeLoop(code: string): boolean {
        return !!code.match(/range\(\d+\)/) || !!code.match(/<\s*\d+;/) || !!code.match(/<=\s*\d+;/) || !!code.match(/count\s*<\s*\d+/);
    }

    private static calculateOverallComplexity(nodes: FlowNode[], blockName: string) {
        let maxTime = 'O(1)';
        let maxSpace = 'O(1)';
        let timeReason = 'The code runs in constant time.';
        let spaceReason = 'No significant extra memory is used.';

        const timeComplexities = nodes
            .map(n => n.complexity?.time)
            .filter(t => t && t !== 'O(1)');

        if (timeComplexities.length > 0) {
            const priority = (t: string) => {
                if (t.includes('2^n')) return 100;
                if (t === 'O(n log n)') return 50;
                if (t.includes('n^')) return parseInt(t.match(/\^(\d+)/)?.[1] || '1') * 10;
                if (t === 'O(n)') return 10;
                if (t === 'O(log n)') return 5;
                return 0;
            };

            const sorted = timeComplexities.sort((a, b) => priority(b!) - priority(a!));
            maxTime = sorted[0]!;

            // Consolidate reasons for educational display
            const complexNode = nodes.find(n => n.complexity?.time === maxTime);
            if (complexNode && complexNode.complexity?.reason) {
                timeReason = complexNode.complexity.reason;
            } else {
                // Detect O(n log n) heuristic: Loop + Log
                if (nodes.some(n => n.label === 'LOOP START' && n.complexity?.time === 'O(n)') &&
                    nodes.some(n => n.complexity?.time === 'O(log n)')) {
                    maxTime = 'O(n log n)';
                    timeReason = 'Linearithmic: A loop is combined with a "divide and conquer" strategy.';
                } else if (maxTime === 'O(n log n)') {
                    timeReason = 'Linearithmic: Sorting or a loop combined with divide-and-conquer strategy.';
                } else if (maxTime === 'O(log n)') {
                    timeReason = 'Logarithmic: The data is cut in half at each step. Very efficient!';
                } else if (maxTime === 'O(n)') {
                    timeReason = 'Linear: The time taken grows exactly with the number of items.';
                } else if (maxTime.includes('n^')) {
                    timeReason = 'Polynomial: Nested loops are detected, making it slower for large data.';
                } else if (maxTime === 'O(2^n)') {
                    timeReason = 'Exponential: The work doubles with each new item! Watch out for large inputs.';
                }
            }
        }

        const spaceComplexities = nodes.map(n => n.complexity?.space).filter(s => s && s !== 'O(1)');
        if (spaceComplexities.length > 0) {
            maxSpace = spaceComplexities.includes('O(n)') ? 'O(n)' : 'O(log n)';
            const complexSpaceNode = nodes.find(n => n.complexity?.space === maxSpace);
            if (complexSpaceNode && complexSpaceNode.complexity?.reason) {
                spaceReason = complexSpaceNode.complexity.reason;
            } else {
                spaceReason = maxSpace === 'O(n)'
                    ? 'Linear Space: Memory usage grows with the input size (arrays or recursion).'
                    : 'Logarithmic Space: Extra memory is used for the divide-and-conquer stack.';
            }
        }

        return {
            time: maxTime,
            space: maxSpace,
            timeReason,
            spaceReason,
            analyzedBlock: blockName
        };
    }

    private static refineExecutionOrder(nodes: FlowNode[], edges: FlowEdge[], raw: string[]): string[] {
        const trace: string[] = ['af_start'];

        // Simulating exactly 2 passes for loops to teach repetition
        for (let i = 0; i < raw.length; i++) {
            const id = raw[i];
            const node = nodes.find(n => n.id === id);
            trace.push(id);

            if (node && node.label === 'LOOP START') {
                // Find body nodes
                const bodyIDs: string[] = [];
                // CONTIGUOUS nodes after this that are indented deeper (approximate)
                // In this simplified parser, they follow in raw order until next loop/end
                // We'll just take nodes until the next node that isn't connected from here or is another high level node
                let j = i + 1;
                while (j < raw.length) {
                    const nextId = raw[j];
                    const nextNode = nodes.find(n => n.id === nextId);
                    // This is a naive approximation for the trace generator
                    bodyIDs.push(nextId);
                    j++;
                }

                if (bodyIDs.length > 0) {
                    // Iteration 2
                    bodyIDs.forEach(bid => trace.push(bid));
                    trace.push(id); // Final check before exit simulation
                }
            }
        }

        trace.push('af_end');
        return trace;
    }

    private static normalizeIndentation(code: string): string {
        const lines = code.split('\n').filter(l => l.trim().length > 0);
        if (lines.length === 0) return code;
        const minIndent = Math.min(...lines.map(l => l.search(/\S/)));
        return code.split('\n').map(l => l.substring(minIndent)).join('\n');
    }

    private static getLinearFallback(code: string): any {
        return {
            nodes: [
                { id: 'af_start', label: 'START', type: 'start', explanation: 'Hi! Let\'s start.' },
                { id: 'af_fallback', label: 'ACTION', type: 'process', explanation: 'The computer is reading your code...', codeSnippet: 'Code Processing' },
                { id: 'af_end', label: 'END', type: 'end', explanation: 'Execution finished!' }
            ],
            edges: [
                { from: 'af_start', to: 'af_fallback' },
                { from: 'af_fallback', to: 'af_end' }
            ],
            executionOrder: ['af_start', 'af_fallback', 'af_end']
        };
    }

    private static deduplicateNodes(nodes: FlowNode[]): FlowNode[] {
        const seen = new Set();
        return nodes.filter(n => seen.has(n.id) ? false : seen.add(n.id));
    }

    private static deduplicateEdges(edges: FlowEdge[]): FlowEdge[] {
        const seen = new Set();
        return edges.filter(e => {
            const key = `${e.from}->${e.to}`;
            return seen.has(key) ? false : seen.add(key);
        });
    }
}
