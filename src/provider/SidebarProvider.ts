import * as vscode from 'vscode';
import { Scaffolder } from '../core/Scaffolder';

export class SidebarProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'algoflow.sidebar';
    private _view?: vscode.WebviewView;

    constructor(private readonly _extensionUri: vscode.Uri) { }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        webviewView.webview.onDidReceiveMessage(async data => {
            switch (data.type) {
                case 'visualize': {
                    vscode.commands.executeCommand('algoflow.visualize');
                    break;
                }
                case 'copyContext': {
                    this._copyContextForAI();
                    break;
                }
                case 'buildProject': {
                    await Scaffolder.buildProject(data.projectType, data.mode);
                    break;
                }
            }
        });
    }

    private async _copyContextForAI() {
        const editor = vscode.window.activeTextEditor;
        const workspaceFolders = vscode.workspace.workspaceFolders;

        let structure = "";
        if (workspaceFolders) {
            structure = await this._getDirectoryStructure(workspaceFolders[0].uri.fsPath);
        }

        if (editor) {
            const text = editor.document.getText(editor.selection) || editor.document.getText();
            const language = editor.document.languageId;

            const context = `
### 🧠 AlgoFlow Code Context

**🌍 Project Structure:**
\`\`\`text
${structure}
\`\`\`

**📝 Code Slice (${language}):**
\`\`\`${language}
${text}
\`\`\`

---
*Algoflow Built for begineer*
            `.trim();

            vscode.env.clipboard.writeText(context);
            vscode.window.showInformationMessage('✨ context copied for AI assistance!');
        } else {
            vscode.window.showErrorMessage('No active code selected.');
        }
    }

    private async _getDirectoryStructure(dir: string, depth = 0): Promise<string> {
        if (depth > 3) return ""; // Limit depth for performance
        try {
            const files = await vscode.workspace.fs.readDirectory(vscode.Uri.file(dir));
            let result = "";
            for (const [name, type] of files) {
                if (name.startsWith('.') || name === 'node_modules') continue;
                const indent = "  ".repeat(depth);
                result += `${indent}${type === vscode.FileType.Directory ? '📁' : '📄'} ${name}\n`;
                if (type === vscode.FileType.Directory) {
                    result += await this._getDirectoryStructure(require('path').join(dir, name), depth + 1);
                }
            }
            return result;
        } catch {
            return "";
        }
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        :root {
            --accent: #ff00ff;
            --accent-glow: rgba(255, 0, 255, 0.3);
            --bg: #0f111a;
            --card-bg: rgba(255, 255, 255, 0.05);
            --text-main: #ffffff;
            --text-dim: #a0a0a0;
            --border: rgba(255, 255, 255, 0.1);
        }

        body {
            padding: 0;
            margin: 0;
            background-color: var(--bg);
            color: var(--text-main);
            font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            overflow-x: hidden;
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
        }

        .container {
            width: 100%;
            padding: 24px;
            box-sizing: border-box;
        }

        .brand-section {
            margin-bottom: 32px;
            padding: 20px 0;
        }

        .title {
            font-size: 1.8rem;
            font-weight: 800;
            letter-spacing: -1px;
            background: linear-gradient(135deg, #fff 0%, #ff00ff 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            margin-bottom: 8px;
            display: block;
        }

        .tagline {
            font-size: 0.75rem;
            text-transform: uppercase;
            letter-spacing: 2px;
            color: var(--text-dim);
            font-weight: 500;
        }

        .section-header {
            font-size: 0.7rem;
            text-transform: uppercase;
            letter-spacing: 1.5px;
            color: var(--text-dim);
            margin: 24px 0 16px 0;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
        }

        .section-header::before, .section-header::after {
            content: "";
            height: 1px;
            flex: 1;
            background: var(--border);
        }

        .card {
            background: var(--card-bg);
            border: 1px solid var(--border);
            border-radius: 12px;
            padding: 16px;
            margin-bottom: 20px;
            backdrop-filter: blur(10px);
        }

        .input-group {
            margin-bottom: 16px;
            text-align: left;
        }

        label {
            font-size: 0.8rem;
            color: var(--text-dim);
            margin-bottom: 8px;
            display: block;
            margin-left: 4px;
        }

        .footer {
            margin-top: 32px;
            padding: 24px 0;
            border-top: 1px solid var(--border);
            color: var(--text-dim);
            font-size: 0.75rem;
            text-align: center;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 12px;
        }

        .footer-logo {
            display: flex;
            align-items: center;
            gap: 8px;
            opacity: 0.8;
            filter: grayscale(1);
        }

        .footer-logo span {
            font-weight: 700;
            letter-spacing: 0.5px;
            text-transform: uppercase;
            font-size: 0.65rem;
        }

        .footer p {
            margin: 0;
            opacity: 0.6;
        }

        select {
            width: 100%;
            background: #1a1c25;
            border: 1px solid var(--border);
            color: white;
            padding: 10px;
            border-radius: 8px;
            outline: none;
            cursor: pointer;
            font-size: 0.9rem;
        }

        button {
            width: 100%;
            padding: 12px;
            border-radius: 10px;
            border: none;
            background: #2d2f3b;
            color: white;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            font-size: 0.95rem;
            position: relative;
            overflow: hidden;
        }

        #build-btn {
            background: #3a3d4d;
            border: 1px solid #4a4d5d;
        }

        #build-btn:hover {
            background: #4a4d5d;
            transform: translateY(-1px);
        }

        .primary-btn {
            background: transparent;
            border: 1px solid var(--accent);
            color: white;
            margin-top: 12px;
        }

        .primary-btn:hover {
            background: var(--accent-glow);
            box-shadow: 0 0 15px var(--accent-glow);
            transform: translateY(-2px);
        }

        .hint {
            font-size: 0.7rem;
            color: var(--text-dim);
            font-style: italic;
            margin-top: 12px;
            display: block;
        }

        .ai-section {
            margin-top: 10px;
            width: 100%;
        }

        .ai-prompt-box {
            width: 100%;
            background: #1a1c25;
            border: 1px solid var(--border);
            color: white;
            padding: 12px;
            border-radius: 8px;
            outline: none;
            font-size: 0.85rem;
            font-family: inherit;
            resize: vertical;
            min-height: 80px;
            margin-bottom: 12px;
            box-sizing: border-box;
        }

        .ai-prompt-box:focus {
            border-color: var(--accent);
            background: rgba(255, 0, 255, 0.05);
        }

        .footer {
            margin-top: auto;
            border-top: 1px solid var(--border);
            padding: 24px 0;
            color: var(--text-dim);
            font-size: 0.75rem;
            text-align: center;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 12px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="brand-section">
            <div class="logo-container">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2L4.5 20.29L5.21 21L12 18L18.79 21L19.5 20.29L12 2Z" fill="#ff00ff" fill-opacity="0.8"/>
                    <path d="M12 18V2" stroke="white" stroke-width="1" stroke-linecap="round"/>
                </svg>
            </div>
            <span class="title">AlgoFlow</span>
            <span class="tagline">Visual Algorithms Made Simple</span>
        </div>

        <div class="section-header">Project Builder</div>
        <div class="card">
            <div class="input-group">
                <label>Project Type</label>
                <select id="project-type">
                    <option value="node">Node.js</option>
                    <option value="python">Python</option>
                    <option value="cpp">C++</option>
                    <option value="java">Java</option>
                    <option value="react">React</option>
                </select>
            </div>
            <div class="input-group">
                <label>Mode</label>
                <select id="mode">
                    <option value="student">Student Mode</option>
                    <option value="advanced">Advanced Mode</option>
                </select>
            </div>
            <button id="build-btn">Build Project</button>
            <span class="hint">Step-by-step logic guidance 🚀</span>
        </div>

        <div class="section-header">Utilities</div>
        <button class="primary-btn" id="visualize-btn">Visualize Selected Logic</button>
        <span class="hint" style="margin-top: 4px; margin-bottom: 12px;">See how your code thinks 🧠</span>
        
        <button class="primary-btn" id="copy-btn">Copy Context for AI</button>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        
        document.getElementById('build-btn').addEventListener('click', () => {
            vscode.postMessage({
                type: 'buildProject',
                projectType: document.getElementById('project-type').value,
                mode: document.getElementById('mode').value
            });
        });

        document.getElementById('visualize-btn').addEventListener('click', () => {
            vscode.postMessage({ type: 'visualize' });
        });

        document.getElementById('copy-btn').addEventListener('click', () => {
            vscode.postMessage({ type: 'copyContext' });
        });
    </script>
</body>
</html>`;
    }
}
