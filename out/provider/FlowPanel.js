"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FlowPanel = void 0;
const vscode = require("vscode");
const path = require("path");
const Parser_1 = require("../core/Parser");
const FlowBuilder_1 = require("../core/FlowBuilder");
class FlowPanel {
    static currentPanel;
    _panel;
    _extensionUri;
    _disposables = [];
    static createOrShow(extensionUri) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;
        if (FlowPanel.currentPanel) {
            FlowPanel.currentPanel._panel.reveal(column);
            return;
        }
        const panel = vscode.window.createWebviewPanel('algoflow', 'AlgoFlow Visualizer', column || vscode.ViewColumn.One, {
            enableScripts: true,
            localResourceRoots: [vscode.Uri.file(path.join(extensionUri.fsPath, 'webview'))]
        });
        FlowPanel.currentPanel = new FlowPanel(panel, extensionUri);
    }
    constructor(panel, extensionUri) {
        this._panel = panel;
        this._extensionUri = extensionUri;
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
        this._panel.webview.html = this._getHtmlForWebview(this._panel.webview);
        this._panel.webview.onDidReceiveMessage(message => {
            switch (message.command) {
                case 'alert':
                    vscode.window.showErrorMessage(message.text);
                    return;
            }
        }, null, this._disposables);
    }
    update(code, languageId) {
        const graph = Parser_1.Parser.parse(code, languageId);
        const mermaidCode = FlowBuilder_1.FlowBuilder.toMermaid(graph);
        this._panel.webview.postMessage({
            command: 'update',
            graph,
            mermaidCode
        });
    }
    dispose() {
        FlowPanel.currentPanel = undefined;
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
        const mermaidUri = 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js';
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AlgoFlow</title>
    <link rel="stylesheet" href="${styleUri}">
    <script src="${mermaidUri}"></script>
</head>
<body>
    <div id="app">
        <div id="canvas-container">
            <div id="mermaid-graph" class="mermaid"></div>
        </div>
        
        <div id="controls">
            <button id="btn-play">Play</button>
            <button id="btn-pause">Pause</button>
            <button id="btn-step">Next Step</button>
            <select id="select-speed">
                <option value="1500">Slow</option>
                <option value="1000" selected>Normal</option>
                <option value="500">Fast</option>
            </select>
            <div class="toggle-group">
                <label><input type="checkbox" id="toggle-confidence" checked> Confidence Mode</label>
                <label><input type="checkbox" id="toggle-complexity"> Complexity Mode</label>
            </div>
        </div>

        <div id="explanation-panel">
            <div id="explanation-content">Select some code to see the flowchart!</div>
            <div id="complexity-content" class="hidden"></div>
        </div>

        <div id="footer">
            Built by Harsh Lagwal — for student beginners
        </div>
    </div>
    <script src="${scriptUri}"></script>
</body>
</html>`;
    }
}
exports.FlowPanel = FlowPanel;
//# sourceMappingURL=FlowPanel.js.map