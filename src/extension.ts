import * as vscode from 'vscode';
import { FlowPanelProvider } from './provider/FlowPanelProvider';
import { SidebarProvider } from './provider/SidebarProvider';

export function activate(context: vscode.ExtensionContext) {
    console.log('AlgoFlow is now active!');

    const sidebarProvider = new SidebarProvider(context.extensionUri);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(
            SidebarProvider.viewType,
            sidebarProvider
        )
    );

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

        FlowPanelProvider.createOrShow(context.extensionUri);
        const languageId = editor.document.languageId;
        setTimeout(() => {
            FlowPanelProvider.currentPanel?.update(text, languageId);
        }, 300); // Small delay to ensure panel is ready
    });

    context.subscriptions.push(disposable);

    // Track selection changes with debounce to prevent "flickering" or excessive reloads
    let selectionTimeout: NodeJS.Timeout | undefined;
    vscode.window.onDidChangeTextEditorSelection((e: vscode.TextEditorSelectionChangeEvent) => {
        if (e.textEditor === vscode.window.activeTextEditor) {
            const selection = e.textEditor.selection;
            const text = e.textEditor.document.getText(selection).trim();
            if (text.length > 0) {
                if (selectionTimeout) {
                    clearTimeout(selectionTimeout);
                }
                selectionTimeout = setTimeout(() => {
                    const languageId = e.textEditor.document.languageId;
                    FlowPanelProvider.currentPanel?.update(text, languageId);
                }, 300);
            }
        }
    }, null, context.subscriptions);
}

export function deactivate() { }
