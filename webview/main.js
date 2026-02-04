const vscode = acquireVsCodeApi();

// --- DESIGN TOKENS ---
const NODE_WIDTH = 320;
const NODE_HEIGHT = 200; // Increased to fit wrapped content
const NODE_GAP = 100;
const RADIUS = 20;

// --- STATE MANAGEMENT ---
const State = {
    payload: null,
    nodes: [],
    edges: [],
    executionOrder: [],
    currentIndex: -1,
    isPlaying: false,
    speed: 1000,
    animTimeout: null,
    counts: {},

    // Camera & Transform
    scale: 0.85,
    tx: 0,
    ty: 40,
    targetTx: 0,
    targetTy: 40,
    isDragging: false,
    startX: 0,
    startY: 0,

    // Inertia
    vx: 0,
    vy: 0,
    fric: 0.92
};

// --- DOM ELEMENTS ---
const elContainer = document.getElementById('canvas-container');
const elSvg = document.getElementById('svg-canvas');
const elG = document.getElementById('main-group');
const elNodes = document.getElementById('nodes-layer');
const elEdges = document.getElementById('edges-layer');

const elAvatar = document.getElementById('avatar-container');
const elExplText = document.getElementById('current-explanation');

const elComplexitySticky = document.getElementById('complexity-sticky');
const btnComplexity = document.getElementById('btn-complexity');

const btnPlay = document.getElementById('btn-play');
const btnPause = document.getElementById('btn-pause');
const btnStep = document.getElementById('btn-step');
const btnReset = document.getElementById('btn-reset');
const selectSpeed = document.getElementById('select-speed');

const elSuccess = document.getElementById('success-overlay');
const elLoopHint = document.getElementById('loop-hint');

// --- INITIALIZATION ---
window.onload = () => {
    vscode.postMessage({ command: 'ready' });
    setupInteractivity();
    setupMarkers();
    requestAnimationFrame(animationLoop);
};

window.addEventListener('message', event => {
    const { command, payload } = event.data;
    if (command === 'renderFlow') {
        State.payload = payload;
        State.nodes = payload.nodes;
        State.edges = payload.edges;
        State.executionOrder = payload.executionOrder;

        renderFlow();
        showOverallComplexity(payload.overallComplexity);
        resetToStart();
    }
});

function setupMarkers() {
    let defs = elSvg.querySelector('defs');
    if (!defs) {
        defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
        elSvg.appendChild(defs);
    }
    defs.innerHTML = `
        <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#111827" />
        </marker>
        <marker id="arrowhead-active" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#2563eb" />
        </marker>
    `;
}

// --- RENDERER ---
function renderFlow() {
    elNodes.innerHTML = '';
    elEdges.innerHTML = '';

    State.nodes.forEach((node, index) => {
        const x = -NODE_WIDTH / 2;
        const y = index * (NODE_HEIGHT + NODE_GAP);

        const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
        g.setAttribute("transform", `translate(${x}, ${y})`);
        g.setAttribute("class", "node-group");
        g.setAttribute("id", `node-g-${node.id}`);

        const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        rect.setAttribute("width", NODE_WIDTH);
        rect.setAttribute("height", NODE_HEIGHT);
        rect.setAttribute("rx", RADIUS);
        rect.setAttribute("class", "af-node");
        rect.setAttribute("id", node.id);

        const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
        label.setAttribute("x", 20);
        label.setAttribute("y", 30);
        label.setAttribute("class", "node-label");
        label.textContent = node.label;

        // CODE BOX & SNIPPET (Now with wrapping)
        const codeBg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        codeBg.setAttribute("x", 15);
        codeBg.setAttribute("y", 45);
        codeBg.setAttribute("width", NODE_WIDTH - 30);
        codeBg.setAttribute("height", 60); // Taller code box
        codeBg.setAttribute("rx", 10);
        codeBg.setAttribute("class", "node-code-bg");

        const codeText = document.createElementNS("http://www.w3.org/2000/svg", "text");
        codeText.setAttribute("x", 25);
        codeText.setAttribute("y", 68);
        codeText.setAttribute("class", "node-code");

        // Code wrapping logic
        const code = node.codeSnippet || '...';
        if (code.length > 30) {
            const part1 = code.substring(0, 30);
            const part2 = code.substring(30, 60);

            const t1 = document.createElementNS("http://www.w3.org/2000/svg", "tspan");
            t1.setAttribute("x", 25);
            t1.textContent = part1;

            const t2 = document.createElementNS("http://www.w3.org/2000/svg", "tspan");
            t2.setAttribute("x", 25);
            t2.setAttribute("dy", "18");
            t2.textContent = part2 + (code.length > 60 ? '...' : '');

            codeText.appendChild(t1);
            codeText.appendChild(t2);
        } else {
            codeText.textContent = code;
        }

        const meaning = document.createElementNS("http://www.w3.org/2000/svg", "text");
        meaning.setAttribute("x", 20);
        meaning.setAttribute("y", 125); // Lowered due to taller code box
        meaning.setAttribute("class", "node-explanation");

        // Enhanced Word wrapping for explanations
        const words = (node.explanation || "").split(' ');
        let line = '';
        let lineCount = 0;
        const charsPerLine = 32;
        const maxLines = 4;

        words.forEach(word => {
            if (lineCount >= maxLines) return;
            if ((line + word).length > charsPerLine) {
                const tspan = document.createElementNS("http://www.w3.org/2000/svg", "tspan");
                tspan.setAttribute("x", 20);
                tspan.setAttribute("dy", lineCount === 0 ? 0 : 18);
                tspan.textContent = line.trim();
                meaning.appendChild(tspan);
                line = word + ' '; lineCount++;
            } else { line += word + ' '; }
        });

        if (lineCount < maxLines) {
            const tEnd = document.createElementNS("http://www.w3.org/2000/svg", "tspan");
            tEnd.setAttribute("x", 20);
            tEnd.setAttribute("dy", lineCount === 0 ? 0 : 18);
            tEnd.textContent = line.trim();
            meaning.appendChild(tEnd);
        }

        g.appendChild(rect);
        g.appendChild(label);
        g.appendChild(codeBg);
        g.appendChild(codeText);
        g.appendChild(meaning);
        elNodes.appendChild(g);
    });

    State.edges.forEach(edge => {
        const fIdx = State.nodes.findIndex(n => n.id === edge.from);
        const tIdx = State.nodes.findIndex(n => n.id === edge.to);
        if (fIdx === -1 || tIdx === -1) return;

        const isLoopBack = tIdx <= fIdx;
        const isToEnd = edge.to === 'af_end';

        const x1 = 0; const y1 = fIdx * (NODE_HEIGHT + NODE_GAP) + NODE_HEIGHT;
        const x2 = 0; const y2 = tIdx * (NODE_HEIGHT + NODE_GAP);

        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        let d = "";
        if (isLoopBack) {
            const curve = 180; // Wider curve for visibility
            d = `M ${x1 - 50} ${y1 - 20} C ${x1 - curve} ${y1 - 20}, ${x1 - curve} ${y2 + 20}, ${x1 - 50} ${y2 + 20}`;
        } else {
            d = `M ${x1} ${y1} L ${x2} ${y2}`;
        }

        path.setAttribute("d", d);
        path.setAttribute("class", `af-edge ${isLoopBack ? 'loop' : (isToEnd ? 'end' : 'forward')}`);
        path.setAttribute("id", `edge-${edge.from}-${edge.to}`);
        path.setAttribute("marker-end", "url(#arrowhead)");
        elEdges.appendChild(path);
    });

    centerView();
}

// --- ANIMATION REEL ---
function animationLoop() {
    if (!State.isDragging && (Math.abs(State.vx) > 0.1 || Math.abs(State.vy) > 0.1)) {
        State.tx += State.vx; State.ty += State.vy;
        State.vx *= State.fric; State.vy *= State.fric;
    }
    const lerp = 0.1;
    State.tx += (State.targetTx - State.tx) * lerp;
    State.ty += (State.targetTy - State.ty) * lerp;
    applyTransform();
    requestAnimationFrame(animationLoop);
}

async function goToStep(idx) {
    if (idx < 0 || idx >= State.executionOrder.length) return;
    const isFirstStep = State.currentIndex === -1;
    State.currentIndex = idx;
    const activeId = State.executionOrder[idx];
    const node = State.nodes.find(n => n.id === activeId);

    // 1. Prepare for transition
    // Reset all EDGES instantly (to clear previous flow)
    document.querySelectorAll('.af-edge').forEach(e => {
        e.classList.remove('active');
        e.setAttribute("marker-end", "url(#arrowhead)");
        e.style.strokeDasharray = 'none';
        e.style.strokeDashoffset = '0';
        e.style.transition = 'none';
    });

    // If it's the first step, we clear everything. 
    // Otherwise, we keep the PREVIOUS node highlighted during the arrow flow.
    if (isFirstStep) {
        document.querySelectorAll('.node-group').forEach(g => g.classList.remove('active'));
    }

    // 2. Animate Edge (The Journey)
    if (idx > 0) {
        const prevId = State.executionOrder[idx - 1];
        const edge = document.getElementById(`edge-${prevId}-${activeId}`);
        if (edge) {
            edge.classList.add('active');

            // Marker selection
            if (edge.classList.contains('loop')) {
                edge.setAttribute("marker-end", "url(#arrowhead-green)");
            } else if (edge.classList.contains('forward')) {
                edge.setAttribute("marker-end", "url(#arrowhead-blue)");
            } else {
                edge.setAttribute("marker-end", "url(#arrowhead-black)");
            }

            // Flow animation
            const length = edge.getTotalLength();
            edge.style.strokeDasharray = length;
            edge.style.strokeDashoffset = length;
            edge.getBoundingClientRect(); // flush CSS

            // Slow, smooth transition (70% of total step time)
            edge.style.transition = `stroke-dashoffset ${State.speed * 0.7}ms cubic-bezier(0.4, 0, 0.2, 1)`;
            edge.style.strokeDashoffset = '0';

            // Wait until arrow "arrives"
            await new Promise(r => setTimeout(r, State.speed * 0.7));
        }
    }

    // 3. Highlight Handover (Source Off -> Destination On)
    // Clear all node highlights now that arrow has arrived
    document.querySelectorAll('.node-group').forEach(g => g.classList.remove('active'));

    const activeG = document.getElementById(`node-g-${activeId}`);
    if (activeG) {
        activeG.classList.add('active');
        autoScroll(activeId);

        // Update explanation text
        elExplText.textContent = node.explanation;
        elAvatar.classList.add('visible');

        // Loop iteration context
        if (node.label === 'LOOP START') {
            State.counts[activeId] = (State.counts[activeId] || 0) + 1;
            if (State.counts[activeId] === 2) {
                showLoopHint();
            }
            if (State.counts[activeId] > 2) {
                elExplText.textContent = "This process continues similarly until the loop ends.";
            }
        }

        // Small pause to let student read the highlight (30% of step time)
        await new Promise(r => setTimeout(r, State.speed * 0.3));
    }

    if (activeId === 'af_end') finishExecution();
    updateComplexitySticky(node);
    updateUI();
}

function showOverallComplexity(complexity) {
    if (!complexity) return;
    elComplexitySticky.classList.add('visible');
    const header = document.getElementById('sticky-header');
    header.textContent = 'BLOCK / FUNCTION COMPLEXITY ANALYSIS 📊';

    document.getElementById('time-complexity').textContent = complexity.time;
    document.getElementById('space-complexity').textContent = complexity.space;

    const timeReason = (complexity.timeReason || "").replace(/\n/g, '<br>');
    const spaceReason = (complexity.spaceReason || "").replace(/\n/g, '<br>');
    const blockName = complexity.analyzedBlock ? `<div class="analyzed-block">Analyzed: ${complexity.analyzedBlock}</div>` : '';

    document.getElementById('complexity-reason').innerHTML = `
        ${blockName}
        <br>
        <strong>Time:</strong> ${timeReason}<br><br>
        <strong>Space:</strong> ${spaceReason}
    `;
}

function finishExecution() {
    State.isPlaying = false;
    elSuccess.classList.add('visible');
    elAvatar.classList.remove('visible');
    setTimeout(() => {
        elSuccess.classList.remove('visible');
        resetToStart();
    }, 3000);
}

function playNext() {
    if (State.currentIndex < State.executionOrder.length - 1) {
        goToStep(State.currentIndex + 1).then(() => {
            // Gap between nodes is now proportional to speed (20% of speed)
            // This ensures it never feels "rushed" even at Fast speed.
            if (State.isPlaying) {
                State.animTimeout = setTimeout(playNext, State.speed * 0.2);
            }
        });
    } else {
        State.isPlaying = false;
        updateUI();
    }
}

function resetToStart() {
    State.currentIndex = -1;
    State.isPlaying = false;
    State.counts = {};
    clearTimeout(State.animTimeout);
    document.querySelectorAll('.node-group').forEach(g => g.classList.remove('active'));
    document.querySelectorAll('.af-edge').forEach(e => {
        e.classList.remove('active');
        e.setAttribute("marker-end", "url(#arrowhead)");
        e.style.strokeDasharray = 'none';
        e.style.strokeDashoffset = '0';
    });
    elLoopHint.classList.remove('visible');
    elAvatar.classList.remove('visible');
    elComplexitySticky.classList.remove('visible');
    centerView();
    updateUI();
}

// --- INTERACTIVITY ---
function setupInteractivity() {
    elContainer.onwheel = (e) => {
        e.preventDefault();
        const d = e.deltaY > 0 ? 0.95 : 1.05;
        State.scale = Math.min(Math.max(0.1, State.scale * d), 5);
    };

    elContainer.onmousedown = (e) => {
        if (e.button !== 0) return;
        State.isDragging = true;
        State.startX = e.clientX - State.tx; State.startY = e.clientY - State.ty;
        State.vx = 0; State.vy = 0;
        elContainer.style.cursor = 'grabbing';

        // Close complexity if clicking outside
        if (e.target.closest('#complexity-sticky') === null) {
            elComplexitySticky.classList.remove('visible');
        }
    };

    window.onmousemove = (e) => {
        if (!State.isDragging) return;
        State.tx = e.clientX - State.startX; State.ty = e.clientY - State.startY;
        State.targetTx = State.tx; State.targetTy = State.ty;
    };

    window.onmouseup = () => {
        State.isDragging = false;
        elContainer.style.cursor = 'grab';
    };

    btnComplexity.onclick = (e) => {
        e.stopPropagation();
        elComplexitySticky.classList.toggle('visible');
    };

    elComplexitySticky.onclick = (e) => e.stopPropagation();
}

function applyTransform() {
    elG.setAttribute("transform", `translate(${State.tx}, ${State.ty}) scale(${State.scale})`);
}

function autoScroll(nodeId) {
    const nIdx = State.nodes.findIndex(n => n.id === nodeId);
    const y = nIdx * (NODE_HEIGHT + NODE_GAP);
    State.targetTx = elContainer.offsetWidth / 2;
    State.targetTy = -(y * State.scale) + (elContainer.offsetHeight / 3);
}

function centerView() {
    State.targetTx = elContainer.offsetWidth / 2;
    State.targetTy = 100;
    State.scale = 0.8;
}

function updateComplexitySticky(node) {
    if (!node || !node.complexity || !State.payload?.overallComplexity) return;

    const overall = State.payload.overallComplexity;
    document.getElementById('sticky-header').textContent = 'BLOCK / FUNCTION COMPLEXITY ANALYSIS 📊';

    // Always emphasize the overall block complexity as per user request
    document.getElementById('time-complexity').textContent = overall.time;
    document.getElementById('space-complexity').textContent = overall.space;

    const blockName = overall.analyzedBlock ? `<div class="analyzed-block">Analyzed: ${overall.analyzedBlock}</div>` : '';
    const lineReason = (node.complexity.reason || "This is a single step operation.").replace(/\n/g, '<br>');

    document.getElementById('complexity-reason').innerHTML = `
        ${blockName}
        <br>
        <strong>Context:</strong> ${lineReason}
        <br><br>
        <strong>Overall ${overall.analyzedBlock || 'Block'}:</strong><br>
        ${overall.timeReason}
    `;
}

function updateUI() {
    btnPlay.disabled = State.currentIndex >= State.executionOrder.length - 1;
    btnPause.style.display = State.isPlaying ? 'inline-block' : 'none';
    btnPlay.style.display = State.isPlaying ? 'none' : 'inline-block';
}

const btnDownload = document.getElementById('btn-download');

// ...

function downloadSVG() {
    const svgClone = elSvg.cloneNode(true);
    const mainGroup = svgClone.getElementById('main-group');
    if (!mainGroup) return;

    // Remove active styles for export
    svgClone.querySelectorAll('.active').forEach(el => el.classList.remove('active'));
    svgClone.querySelectorAll('.af-edge').forEach(e => e.setAttribute("marker-end", "url(#arrowhead)"));

    // Reset transform
    mainGroup.setAttribute("transform", "translate(0,0)");

    // Bounds calculation
    const nodeCount = State.nodes.length;
    const exportWidth = NODE_WIDTH + 300;
    const exportHeight = nodeCount * (NODE_HEIGHT + NODE_GAP) + 200;

    svgClone.setAttribute("width", exportWidth);
    svgClone.setAttribute("height", exportHeight);
    svgClone.setAttribute("viewBox", `${-exportWidth / 2} -50 ${exportWidth} ${exportHeight}`);

    // White background
    const bg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    bg.setAttribute("x", -exportWidth / 2);
    bg.setAttribute("y", -50);
    bg.setAttribute("width", exportWidth);
    bg.setAttribute("height", exportHeight);
    bg.setAttribute("fill", "#ffffff");
    svgClone.insertBefore(bg, svgClone.firstChild);

    // Add essential styles directly into SVG for portability
    const style = document.createElementNS("http://www.w3.org/2000/svg", "style");
    style.textContent = `
        .af-node { fill: #ffffff; stroke: #111827; stroke-width: 3px; }
        .node-label { fill: #111827; font-family: 'Inter', sans-serif; font-size: 14px; font-weight: 800; }
        .node-code-bg { fill: #f3f4f6; }
        .node-code { fill: #2563eb; font-family: 'JetBrains Mono', monospace; font-size: 13px; font-weight: 700; }
        .node-explanation { fill: #4b5563; font-family: 'Inter', sans-serif; font-size: 13px; }
        .af-edge { fill: none; stroke: #111827; stroke-width: 3px; }
        .node-group.active .af-node { fill: #fef9c3; }
        .af-edge.forward.active { stroke: #2563eb; stroke-width: 4px; stroke-dasharray: 8,8; }
        .af-edge.loop.active { stroke: #22c55e; stroke-width: 4px; stroke-dasharray: 10,5; }
        .af-edge.end.active { stroke: #111827; stroke-width: 4px; }
    `;
    svgClone.insertBefore(style, svgClone.firstChild);

    // Watermark
    const watermarkG = document.createElementNS("http://www.w3.org/2000/svg", "g");
    watermarkG.setAttribute("transform", `translate(${exportWidth / 2 - 300}, ${exportHeight - 120})`);

    const line1 = document.createElementNS("http://www.w3.org/2000/svg", "text");
    line1.setAttribute("font-family", "Inter, sans-serif");
    line1.setAttribute("font-weight", "800");
    line1.setAttribute("font-size", "14px");
    line1.setAttribute("fill", "#111827");
    line1.setAttribute("opacity", "0.4");
    line1.textContent = "AlgoFlow — Built for students";

    const line2 = document.createElementNS("http://www.w3.org/2000/svg", "text");
    line2.setAttribute("y", "20");
    line2.setAttribute("font-family", "Inter, sans-serif");
    line2.setAttribute("font-size", "11px");
    line2.setAttribute("fill", "#111827");
    line2.setAttribute("opacity", "0.3");
    line2.textContent = "Built by Harsh Lagwal — for student beginners";

    watermarkG.appendChild(line1);
    watermarkG.appendChild(line2);
    svgClone.appendChild(watermarkG);

    // Serialise and Send to VS Code
    const serializer = new XMLSerializer();
    const content = '<?xml version="1.0" standalone="no"?>\r\n' + serializer.serializeToString(svgClone);

    vscode.postMessage({
        command: 'downloadSVG',
        content: content
    });
}

function showLoopHint() {
    elLoopHint.classList.add('visible');
    setTimeout(() => {
        elLoopHint.classList.remove('visible');
    }, 4500); // 4.5 seconds visibility
}

btnPlay.onclick = () => {
    if (State.currentIndex === -1) {
        // Smooth snap to Start before playing
        autoScroll('af_start');
        setTimeout(() => { State.isPlaying = true; playNext(); }, 500);
    } else {
        State.isPlaying = true; playNext();
    }
};

btnPause.onclick = () => { State.isPlaying = false; clearTimeout(State.animTimeout); updateUI(); };
btnStep.onclick = () => {
    State.isPlaying = false;
    if (State.currentIndex === -1) autoScroll('af_start');
    goToStep(State.currentIndex + 1);
};
btnReset.onclick = () => resetToStart();
btnDownload.onclick = () => downloadSVG();
selectSpeed.onchange = (e) => State.speed = parseInt(e.target.value);
