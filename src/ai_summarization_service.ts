const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

import * as vscode from 'vscode';
import { WorkspaceConfiguration } from './workspace_configuration';
import { Workspace } from './workspace';
import { AIPromptService } from './ai_prompt_service';
import { HasID } from './ai_com_types';

interface Summary extends HasID {
    hash : string
    summary : string
};

export class AISummarizationService {

    private workspace_configuration : WorkspaceConfiguration;
    private workspace : Workspace;
    private ai_prompt_service : AIPromptService;

    constructor(context : vscode.ExtensionContext) {
        this.workspace_configuration = new WorkspaceConfiguration(context);
        this.workspace = new Workspace();
        this.ai_prompt_service = new AIPromptService(context);
    }

    async getOrMakeCachedSummary(uri : vscode.Uri) : Promise<string|null> {

        this.workspace.validateIsWithinWorkspace(uri);
        
        const hash = await this.computeHash(uri);
        const fsPath = this.workspace.makeUriRelativeToWorkspaceRoot(uri);

        const summaryObj = (await this.workspace_configuration.get_from_workspace_by_id<Summary>("summaries", fsPath));

        if (summaryObj && summaryObj.hash === hash) {
            return summaryObj.summary;
        }

        // otherwise, if the summary didn't exist or the current object is dirty, make a new summary
        const summary = await this.getSummaryForUri(uri);

        if (!summary) {
            return null;
        }

        // store the summary and its hash
        this.workspace_configuration.add_to_workspace_by_id<Summary>("summaries", { id : fsPath, hash: hash, summary : summary } as Summary);
        return summary;
    }

    async getOrMakeCachedEditorContentsSummary(editorText : string, uri : vscode.Uri) {

        const hash = this.hashString(editorText);
        const fsPath = this.workspace.makeUriRelativeToWorkspaceRoot(uri);
        const editorTextSummary = await this.workspace_configuration.get_from_workspace_by_id<Summary>("editorContents", fsPath);
        
        if (editorTextSummary && editorTextSummary.hash == hash) {
            return editorTextSummary.summary;
        } 

        const summaryCommands = await this.ai_prompt_service.getCommandResponse("WRITE_SUMMARY", editorText);
        const summary = summaryCommands.filter(command => command.verb === "BEGINSUMMARY")?.[0].arg1;

        if (!summary) {
            return null;
        }

        this.workspace_configuration.add_to_workspace_by_id<Summary>("editorContents", { id : fsPath, hash: hash, summary : summary })
        return summary;
    }

    async getSummaryForUri(uri : vscode.Uri) : Promise<string|null> {
        if (await this.workspace.isTextFile(uri)) {
            return await this.askAIForTextSummary(uri);
        }
        else if (await this.workspace.isDirectory(uri)) {
            return await this.askAIForDirectorySummary(uri);
        }
        return null;
    }


    private async askAIForTextSummary(uri : vscode.Uri) {
        const text = await this.workspace.readFile(uri);
        if (!text) {
            return null;
        }
        return await this.ai_prompt_service.getTextResponse("SUMMARIZE_TEXT", text);
    }

    private async askAIForDirectorySummary(uri : vscode.Uri) : Promise<string|null> {
        const directoryStructureString = await this.getDirectoryStructureString(uri);
        const summary = this.ai_prompt_service.getTextResponse("SUMMARIZE_DIRECTORY_STRUCTURE", directoryStructureString);
        return summary;
    }


    private hashString(inputString : string) : string {
        const hash = crypto.createHash('md5');
        hash.update(inputString);
        const md5Hash = hash.digest('hex');
        return md5Hash;
    }


    private async computeHash(uri : vscode.Uri) {
        if (await this.workspace.isTextFile(uri)) {
            return this.computeTextFileHash(uri)
        }
        else if (await this.workspace.isFile(uri)) {
            return this.hashFilepath(uri);
        }
        else {
            return await this.hashDirectoryStructure(uri);
        }
    }

    private async hashDirectoryStructure(uri : vscode.Uri) {
        const directoryStructureString = await this.getDirectoryStructureString(uri);
        return this.hashString(directoryStructureString);
    }

    private async getDirectoryStructureString(uri : vscode.Uri) {
        const directoryJson = (await this.workspace.read_fs_tree(uri));
        return (JSON.stringify(directoryJson));        
    }


    private async computeTextFileHash(uri : vscode.Uri) {
        const fsPath = uri.fsPath;
        const fileBuffer = (await fs.promises.readFile(fsPath)) as string;
        return this.hashString(fileBuffer);
    }

    private hashFilepath(uri : vscode.Uri) {
        this.workspace.validateIsWithinWorkspace(uri);
        const fsPath = this.workspace.makeUriRelativeToWorkspaceRoot(uri);
        return this.hashString(fsPath);
    }
}

