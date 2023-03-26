import * as vscode from 'vscode';
const path = require('path');

export class Workspace {

    constructor() {
    }

    async read_fs_tree() {
        let tree = {}
        const uri = vscode.Uri.file("./")
        await this.make_fs_tree_recursively(uri, tree);
        return tree;
    }

    private async make_fs_tree_recursively(uri : vscode.Uri, tree : Record<string, any>) {
        const children = await vscode.workspace.fs.readDirectory(uri);
        for (const [name, type] of children) {
            const childUri = uri.with({ path: path.join(uri.path, name) });
            if (type === vscode.FileType.Directory) {
              tree[name] = {};
              await this.make_fs_tree_recursively(childUri, tree[name]);
            } else if (type === vscode.FileType.File) {
              tree[name] = null;
            }
        }
    }

    async command_readdir(uri : vscode.Uri) {
        return this.read_fs_tree()
    }

    async command_readfile(uri : vscode.Uri) {
        return (await vscode.workspace.openTextDocument(uri)).getText();
    }      

    async command_movefile(from : vscode.Uri, to : vscode.Uri) {
        await vscode.workspace.fs.rename(from, to); 
    }

    async command_createfile(uri : vscode.Uri, content: string) {
        const data = Buffer.from(content, 'utf-8');
        await vscode.workspace.fs.writeFile(uri, data);
    }

    async command_createdir(uri : vscode.Uri) {
        await vscode.workspace.fs.createDirectory(uri);
    }    
}