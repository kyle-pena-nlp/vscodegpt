import * as vscode from 'vscode';
import { WorkspacePathFailureReason, fromWorkspaceRelativeFilepath, isInvalidWorkspace } from "./workspace";

type FoldRange = [number,number];
type FoldKey = number;
type FoldHash = string;
type FoldHeader = string;
type FoldText = string;
type FoldContent = [FoldHeader,FoldText];
/*
export class VirtualResource {

    static InMemoryResources : Map<string,string>;

    private context: vscode.ExtensionContext;
    private resource_uri : string;
    private foldMap : Map<FoldRange,FoldKey>;
    private foldHashes : Map<FoldKey,FoldHash>;
    private foldContent : Map<FoldKey,FoldContent>;
    private guid : string;
    
    constructor(resource_uri : string, context: vscode.ExtensionContext) {
        this.context = context;
        this.resource_uri = resource_uri;
        this.foldMap = new Map<FoldRange,FoldKey>();
        this.foldHashes = new Map<FoldKey,FoldHash>();
        this.foldContent = new Map<FoldKey,FoldContent>();
        this.guid = uuidv4();
    }

    async refresh() {
        const rawText = await this.retrieveRawText();
        VirtualResource.InMemoryResources.set(this.guid, rawText);
        const foldingRanges = await this.getFoldingRanges(rawText);
    }

    private async getFoldingRanges(rawText: string) : Promise<vscode.FoldingRange[]> {

        const rawTextUri = vscode.Uri.from({ scheme: "inmemory", path : path });
        const foldingRanges = (await vscode.commands.executeCommand('vscode.executeFoldingRangeProvider', rawTextUri)) as vscode.FoldingRange[];
        return foldingRanges;
    }

    private async retrieveRawText() {
        const uriParts = this.resource_uri.split("::");
        const resourceScheme = uriParts[0];
        const resourceIdentifier = uriParts[1];
        if (resourceScheme == "workspace") {
            return this.readFile(resourceIdentifier);
        }
        else if (resourceScheme == "url") {
            return this.readUrl(resourceIdentifier);
        }
    }

    private async readFile(workspaceRelativeFilepath : string) : Promise<WorkspacePathFailureReason|string|null> {
        const fsPath = fromWorkspaceRelativeFilepath(workspaceRelativeFilepath);
        if (isInvalidWorkspace(fsPath)) {
            return fsPath;
        }
        const uri = vscode.Uri.file(fsPath);
        try {
            const fileBytes = await vscode.workspace.fs.readFile(uri);
            const fileText = new TextDecoder().decode(fileBytes);
            return fileText;
        }
        catch(exception) {
            return null;
        }
    }

    private async readUrl(resourceIdentifier : string) : Promise<string|null> {
        try {
            const response = await fetch(resourceIdentifier);
            const text = await response.text();
            return text;
        }
        catch(exception) {
            // TODO: response codes, etc etc
            return null;
        }
    }

    private path() {
        return this.resource_uri.split("::")[1];
    }
} */