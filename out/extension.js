"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = require("vscode");
const FlowPanelProvider_1 = require("./provider/FlowPanelProvider");
const SidebarProvider_1 = require("./provider/SidebarProvider");
function activate(context) {
    console.log('AlgoFlow is now active!');
    const sidebarProvider = new SidebarProvider_1.SidebarProvider(context.extensionUri);
    context.subscriptions.push(vscode.window.registerWebviewViewProvider(SidebarProvider_1.SidebarProvider.viewType, sidebarProvider));
    let disposable = vscode.commands.registerCommand('algoflow.visualize', () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showInformationMessage('Open a code file and select some logic to visualize! 📝');
            return;
        }
        const selection = editor.selection;
        const text = editor.document.getText(selection).trim();
        if (text.length === 0) {
            vscode.window.showInformationMessage('Please select the code then visualize the graph! 😊');
            return;
        }
        FlowPanelProvider_1.FlowPanelProvider.createOrShow(context.extensionUri);
        const languageId = editor.document.languageId;
        setTimeout(() => {
            FlowPanelProvider_1.FlowPanelProvider.currentPanel?.update(text, languageId);
        }, 300); // Small delay to ensure panel is ready
    });
    context.subscriptions.push(disposable);
    // Track selection changes with debounce to prevent "flickering" or excessive reloads
    let selectionTimeout;
    vscode.window.onDidChangeTextEditorSelection((e) => {
        if (e.textEditor === vscode.window.activeTextEditor) {
            const selection = e.textEditor.selection;
            const text = e.textEditor.document.getText(selection).trim();
            if (text.length > 0) {
                if (selectionTimeout) {
                    clearTimeout(selectionTimeout);
                }
                selectionTimeout = setTimeout(() => {
                    const languageId = e.textEditor.document.languageId;
                    FlowPanelProvider_1.FlowPanelProvider.currentPanel?.update(text, languageId);
                }, 300);
            }
        }
    }, null, context.subscriptions);
}
function deactivate() { }
//# sourceMappingURL=extension.js.map