import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export class Scaffolder {
    public static async buildProject(projectType: string, mode: string) {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            vscode.window.showErrorMessage('Please open a folder first to build a project!');
            return;
        }

        const rootPath = workspaceFolders[0].uri.fsPath;
        const projectDir = path.join(rootPath, `AlgoFlow_${projectType}_Project`);

        try {
            if (!fs.existsSync(projectDir)) {
                fs.mkdirSync(projectDir, { recursive: true });
            }

            switch (projectType.toLowerCase()) {
                case 'python':
                    this.scaffoldPython(projectDir, mode);
                    break;
                case 'node':
                case 'nodejs':
                    this.scaffoldNode(projectDir, mode);
                    break;
                case 'cpp':
                    this.scaffoldCpp(projectDir, mode);
                    break;
                case 'java':
                    this.scaffoldJava(projectDir, mode);
                    break;
                case 'react':
                    this.scaffoldReact(projectDir, mode);
                    break;
            }

            vscode.window.showInformationMessage(`✨ AlgoFlow: ${projectType} project built in ${mode}!`);

            // Open the main file
            const mainFile = this.getMainFile(projectDir, projectType, mode);
            if (mainFile && fs.existsSync(mainFile)) {
                const doc = await vscode.workspace.openTextDocument(mainFile);
                await vscode.window.showTextDocument(doc);
            }

        } catch (err) {
            vscode.window.showErrorMessage(`Failed to build project: ${err}`);
        }
    }

    private static scaffoldPython(dir: string, mode: string) {
        if (mode === 'advanced') {
            const srcDir = path.join(dir, 'src');
            const utilsDir = path.join(dir, 'utils');
            fs.mkdirSync(srcDir, { recursive: true });
            fs.mkdirSync(utilsDir, { recursive: true });

            fs.writeFileSync(path.join(srcDir, 'main.py'), `# Advanced Python Entry\nimport sys\nfrom utils.helper import greet\n\ndef run():\n    greet("AlgoFlow Developer")\n    print("Starting advanced logic...")\n\nif __name__ == "__main__":\n    run()`);
            fs.writeFileSync(path.join(utilsDir, 'helper.py'), `def greet(name):\n    print(f"Hello {name}, welcome to your advanced project!")`);
            fs.writeFileSync(path.join(dir, 'README.md'), `# Advanced Python Project\nCreated with AlgoFlow`);
        } else {
            const content = `# AlgoFlow Student Python\ndef main():\n    print("Hello Student!")\n    x = 10\n    if x > 5: print("Condition met")\n\nmain()`;
            fs.writeFileSync(path.join(dir, 'main.py'), content);
        }
    }

    private static scaffoldNode(dir: string, mode: string) {
        if (mode === 'advanced') {
            const srcDir = path.join(dir, 'src');
            fs.mkdirSync(srcDir, { recursive: true });

            const pkg = { name: "adv-node", version: "1.0.0", main: "src/index.js", dependencies: {} };
            fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify(pkg, null, 2));
            fs.writeFileSync(path.join(srcDir, 'index.js'), `// Advanced Node.js\nconsole.log("AlgoFlow Advanced Mode Active");\nrequire('./logic.js').start();`);
            fs.writeFileSync(path.join(srcDir, 'logic.js'), `exports.start = () => console.log("Logic initialized...");`);
        } else {
            fs.writeFileSync(path.join(dir, 'index.js'), `console.log("Simple Node Starter");`);
        }
    }

    private static scaffoldCpp(dir: string, mode: string) {
        if (mode === 'advanced') {
            const srcDir = path.join(dir, 'src');
            const includeDir = path.join(dir, 'include');
            fs.mkdirSync(srcDir, { recursive: true });
            fs.mkdirSync(includeDir, { recursive: true });

            fs.writeFileSync(path.join(srcDir, 'main.cpp'), `#include <iostream>\n#include "../include/utils.h"\n\nint main() {\n    display();\n    return 0;\n}`);
            fs.writeFileSync(path.join(includeDir, 'utils.h'), `#include <iostream>\nvoid display() { std::cout << "Advanced C++ Structure" << std::endl; }`);
        } else {
            fs.writeFileSync(path.join(dir, 'main.cpp'), `#include <iostream>\nint main() { std::cout << "Student C++" << std::endl; }`);
        }
    }

    private static scaffoldJava(dir: string, mode: string) {
        if (mode === 'advanced') {
            const srcDir = path.join(dir, 'src', 'com', 'algoflow');
            fs.mkdirSync(srcDir, { recursive: true });
            fs.writeFileSync(path.join(srcDir, 'Main.java'), `package com.algoflow;\n\npublic class Main {\n    public static void main(String[] args) {\n        System.out.println("Advanced Java Structure");\n    }\n}`);
        } else {
            fs.writeFileSync(path.join(dir, 'Main.java'), `public class Main {\n    public static void main(String[] args) {\n        System.out.println("Student Java");\n    }\n}`);
        }
    }

    private static scaffoldReact(dir: string, mode: string) {
        const srcDir = path.join(dir, 'src');
        fs.mkdirSync(srcDir, { recursive: true });

        if (mode === 'advanced') {
            const componentsDir = path.join(srcDir, 'components');
            fs.mkdirSync(componentsDir, { recursive: true });

            fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name: "algoflow-react", version: "1.0.0", private: true }, null, 2));
            fs.writeFileSync(path.join(dir, 'index.html'), `<!DOCTYPE html><html><body><div id="root"></div></body></html>`);
            fs.writeFileSync(path.join(srcDir, 'App.jsx'), `import React from 'react';\nimport Header from './components/Header';\n\nfunction App() {\n  return <div><Header /><h1>AlgoFlow React Adv</h1></div>;\n}\n\nexport default App;`);
            fs.writeFileSync(path.join(componentsDir, 'Header.jsx'), `export default function Header() { return <header>AlgoFlow</header>; }`);
        } else {
            fs.writeFileSync(path.join(srcDir, 'App.jsx'), `function App() {\n  return <h1>Simple AlgoFlow React</h1>;\n}\nexport default App;`);
        }
    }

    private static getMainFile(dir: string, type: string, mode: string): string {
        const isAdv = mode === 'advanced';
        switch (type.toLowerCase()) {
            case 'python': return isAdv ? path.join(dir, 'src', 'main.py') : path.join(dir, 'main.py');
            case 'node': return isAdv ? path.join(dir, 'src', 'index.js') : path.join(dir, 'index.js');
            case 'cpp': return isAdv ? path.join(dir, 'src', 'main.cpp') : path.join(dir, 'main.cpp');
            case 'java': return isAdv ? path.join(dir, 'src', 'com', 'algoflow', 'Main.java') : path.join(dir, 'Main.java');
            case 'react': return path.join(dir, 'src', 'App.jsx');
            default: return '';
        }
    }
}
