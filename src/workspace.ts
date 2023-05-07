import * as vscode from 'vscode';
const path = require('path');
const fs = require('fs');
const textExtensions = require('text-extensions');

export type WorkspacePathFailureReason = 'NoOpenWorkspace' | 'MoreThanOneWorkspaceIsUnsupported';


export function fromWorkspaceRelativeFilepath(relativeFilepath : string) : string|WorkspacePathFailureReason {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
        return 'NoOpenWorkspace';
    }
    if (workspaceFolders.length > 1) {
        return 'MoreThanOneWorkspaceIsUnsupported';
    }
    const workspaceRootUri = workspaceFolders[0].uri;
    return vscode.Uri.joinPath(workspaceRootUri, relativeFilepath).fsPath;
}

export function toWorkspaceRelativeFilepath(absoluteFilepath : string) : string|WorkspacePathFailureReason {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
        return 'NoOpenWorkspace';
    }
    if (workspaceFolders.length > 1) {
        return 'MoreThanOneWorkspaceIsUnsupported';
    }
    const relativeFilePath = vscode.workspace.asRelativePath(absoluteFilepath);
    return relativeFilePath;
}

export function isInvalidWorkspace<T>(value : T|WorkspacePathFailureReason) : value is WorkspacePathFailureReason {
    if (path == 'NoOpenWorkspace') {
        return true;
    }
    else if (path == 'MoreThanOneWorkspaceIsUnsupported') {
        return true;
    }
    return false;
}

export class Workspace {

    constructor() {
    }

    async read_fs_tree(uri : vscode.Uri) {
        let tree = {}
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


    makeUriRelativeToWorkspaceRoot(uri : vscode.Uri) : string  {
        this.validateIsWithinWorkspace(uri);        
        return vscode.workspace.asRelativePath(uri.fsPath, true);
    }

    getWorkspaceRootUri() {
        return vscode.workspace.workspaceFolders![0].uri;
    }

    private isWithin(uri : vscode.Uri, parentUri : vscode.Uri) {
        const relativePath = path.relative(parentUri.fsPath, uri.fsPath);
        const isWithin = !relativePath.startsWith('..') && !path.isAbsolute(relativePath);
        return isWithin;
    }    

    validateIsWithinWorkspace(uri : vscode.Uri) {
        const withinWorkspace = this.isWithin(uri, this.getWorkspaceRootUri());
        if (!withinWorkspace) {
            throw `Not within workspace: ${uri.fsPath}`;
        }
    }


    async isTextFile(uri : vscode.Uri) : Promise<boolean|null> {
        const filestream = this.openFileStream(uri);
        const detectedType = await (await import('file-type')).fileTypeFromStream(filestream);
        if (detectedType) {
          return textExtensions.includes(detectedType.ext);
        } else {
          return null;
        }
    }

    async isDirectory(uri : vscode.Uri) : Promise<boolean> {
        if (uri.scheme !== "file") {
            return false;
        }
        const stat = fs.stat(uri.fsPath);
        return stat.isFile();
    }

    async readFile(uri : vscode.Uri) {
        const fsPath = uri.fsPath;
        const fileBuffer = (await fs.promises.readFile(fsPath)) as string;
        return fileBuffer;
    }   

    openFileStream(uri : vscode.Uri) {
        // TODO: detect and handle non-utf8
        const readableStream = fs.createReadStream(uri.fsPath, 'utf8');
        return readableStream;        
    }
    

    async isFile(uri : vscode.Uri) {
        if (uri.scheme !== "file") {
            return false;
        }
        try {
            const stats = await fs.stat(uri.fsPath);
            return stats.isFile();
        } catch (err) {
            console.error('Error:', err);
            return false;
        }
    }

    async command_readdir(uri : vscode.Uri) {
        return this.read_fs_tree(uri);
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