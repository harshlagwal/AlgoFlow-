"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FlowPanelProvider = void 0;
const vscode = require("vscode");
const path = require("path");
const Parser_1 = require("../core/Parser");
const DataBuilder_1 = require("../core/DataBuilder");
class FlowPanelProvider {
    static currentPanel;
    _panel;
    _extensionUri;
    _disposables = [];
    static createOrShow(extensionUri) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;
        if (FlowPanelProvider.currentPanel) {
            FlowPanelProvider.currentPanel._panel.reveal(column);
            return;
        }
        const panel = vscode.window.createWebviewPanel('algoflow', 'AlgoFlow Visualizer', column || vscode.ViewColumn.Two, {
            enableScripts: true,
            localResourceRoots: [vscode.Uri.file(path.join(extensionUri.fsPath, 'webview'))]
        });
        FlowPanelProvider.currentPanel = new FlowPanelProvider(panel, extensionUri);
    }
    constructor(panel, extensionUri) {
        this._panel = panel;
        this._extensionUri = extensionUri;
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
        this._panel.webview.html = this._getHtmlForWebview(this._panel.webview);
        this._panel.webview.onDidReceiveMessage((message) => {
            switch (message.command) {
                case 'downloadSVG':
                    this._handleDownloadSVG(message.content);
                    return;
                case 'ready':
                    this._handleReady();
                    return;
                case 'alert':
                    vscode.window.showErrorMessage(message.text);
                    return;
            }
        }, null, this._disposables);
    }
    _lastCode;
    update(code, languageId) {
        this._lastCode = { text: code, languageId };
        try {
            const graph = Parser_1.Parser.parse(code, languageId);
            const payload = DataBuilder_1.DataBuilder.buildPayload(graph);
            this._panel.webview.postMessage({
                command: 'renderFlow',
                payload
            });
        }
        catch (err) {
            console.error('Update failed', err);
            // Emergency fallback structure
            this._panel.webview.postMessage({
                command: 'renderFlow',
                payload: {
                    nodes: [
                        { id: 'af_start', label: 'START', type: 'start', explanation: 'Starting...' },
                        { id: 'af_err', label: 'Processing Code...', type: 'process', explanation: 'AlgoFlow is analyzing your logic.' },
                        { id: 'af_end', label: 'END', type: 'end', explanation: 'Done.' }
                    ],
                    edges: [{ from: 'af_start', to: 'af_err' }, { from: 'af_err', to: 'af_end' }],
                    executionOrder: ['af_start', 'af_err', 'af_end']
                }
            });
        }
    }
    async _handleDownloadSVG(content) {
        const fileUri = await vscode.window.showSaveDialog({
            defaultUri: vscode.Uri.file(path.join(vscode.workspace.workspaceFolders?.[0].uri.fsPath || '', `AlgoFlow_${Date.now()}.svg`)),
            filters: { 'SVG Images': ['svg'] },
            title: 'Save AlgoFlow Flowchart'
        });
        if (fileUri) {
            try {
                await vscode.workspace.fs.writeFile(fileUri, Buffer.from(content, 'utf8'));
                vscode.window.showInformationMessage('✨ Flowchart saved successfully!');
            }
            catch (err) {
                vscode.window.showErrorMessage('Failed to save SVG: ' + err);
            }
        }
    }
    _handleReady() {
        if (this._lastCode) {
            this.update(this._lastCode.text, this._lastCode.languageId);
        }
    }
    dispose() {
        FlowPanelProvider.currentPanel = undefined;
        this._panel.dispose();
        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }
    _getHtmlForWebview(webview) {
        const scriptUri = webview.asWebviewUri(vscode.Uri.file(path.join(this._extensionUri.fsPath, 'webview', 'main.js')));
        const styleUri = webview.asWebviewUri(vscode.Uri.file(path.join(this._extensionUri.fsPath, 'webview', 'styles.css')));
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AlgoFlow</title>
    <link rel="stylesheet" href="${styleUri}">
</head>
<body>
    <div id="app">
        <div class="controls-bar">
            <button id="btn-play" title="Play">▶</button>
            <button id="btn-pause" title="Pause">⏸</button>
            <button id="btn-step" title="Step">⏭</button>
            <button id="btn-reset" title="Restart">🔄</button>
            
            <div class="divider"></div>

            <select id="select-speed" title="Execution Speed">
                <option value="1200">Slow</option>
                <option value="800" selected>Normal</option>
                <option value="400">Fast</option>
            </select>

            <button id="btn-complexity" title="Complexity Analysis">📊</button>
            <button id="btn-download" title="Download SVG">⬇️</button>
        </div>

        <div id="canvas-container">
            <svg id="svg-canvas" style="width:100%; height:100%;">
                <defs>
                    <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                        <polygon points="0 0, 10 3.5, 0 7" fill="#111827" />
                    </marker>
                    <marker id="arrowhead-blue" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                        <polygon points="0 0, 10 3.5, 0 7" fill="#2563eb" />
                    </marker>
                    <marker id="arrowhead-green" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                        <polygon points="0 0, 10 3.5, 0 7" fill="#22c55e" />
                    </marker>
                    <marker id="arrowhead-black" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                        <polygon points="0 0, 10 3.5, 0 7" fill="#111827" />
                    </marker>
                </defs>
                <g id="main-group">
                    <g id="edges-layer"></g>
                    <g id="nodes-layer"></g>
                </g>
            </svg>

            <!-- Success Overlay -->
            <div id="success-overlay" class="success-overlay">
                <div class="success-content">
                    <span class="confetti">🎉</span>
                    <h2>Execution Completed!</h2>
                    <p>Logic verified successfully.</p>
                </div>
            </div>
        </div>

        <!-- Fixed Footer Watermark -->
        <div class="fixed-watermark">
            <p>AlgoFlow — Built for students</p>
            <p class="sub">Built by Harsh Lagwal — for student beginners</p>
        </div>

        <!-- Avatar Assistant (Bottom Left) -->
        <div id="avatar-container" class="avatar-container">
            <div class="avatar-box">
                <div class="avatar-icon">👨‍🏫</div>
                <div class="avatar-text">
                    <p id="current-explanation">Select code and click Play to start!</p>
                </div>
            </div>
        </div>

        <!-- Loop Continuation Hint (Bottom Center) -->
        <div id="loop-hint" class="loop-hint">
            <span class="icon">🔁</span>
            <div class="content">
                <strong>Loop continues...</strong>
                <p>This loop will keep repeating until the condition becomes FALSE.</p>
            </div>
        </div>

        <!-- Complexity Sticky Note (Right) -->
        <div id="complexity-sticky" class="complexity-sticky">
            <div id="sticky-header" class="sticky-header">COMPLEXITY NOTE 📊</div>
            <div class="sticky-body">
                <div class="row"><strong>Time:</strong> <span id="time-complexity">O(?)</span></div>
                <div class="row"><strong>Space:</strong> <span id="space-complexity">O(?)</span></div>
                <p id="complexity-reason" class="reason">Select a node to see its analysis.</p>
            </div>
            <div class="sticky-footer">Click outside to close</div>
        </div>
    </div>
    <script src="${scriptUri}"></script>
</body>
</html>`;
    }
}
exports.FlowPanelProvider = FlowPanelProvider;
//# sourceMappingURL=FlowPanelProvider.js.map