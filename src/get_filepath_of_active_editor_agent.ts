

import * as vscode from 'vscode';
import { AIPromptService, AIResponseError } from "./ai_prompt_service";
import { Agent, AgentStatusReport, NodeMetadata } from "./agent"
import { ProgressWindow } from "./progress_window";
import { AICommandParser } from "./ai_command_parser";
import { WorkspacePathFailureReason, isInvalidWorkspace, toWorkspaceRelativeFilepath } from './workspace';

export class GetFilepathOfActiveEditorAgent extends Agent {

    constructor(arg1 : string|null, arg2 : string|null, arg3 : string|null,  boss: Agent, context: vscode.ExtensionContext, progressWindow : ProgressWindow) {
        super(arg1, arg2, arg3, boss, context, progressWindow);
    }

    static nodeMetadata(): NodeMetadata {
        return new NodeMetadata(
            ["GET-ACTIVE-EDITOR-FILEPATH", "<quoted-string>"],
            ["GET-ACTIVE-EDITOR-FILEPATH", "memory-location-key"],
            "You can determine the filepath of the current active editor window (relative to the workspace root), storing the result into your memory by a key that you choose and can reference later",
            []
        );
    }

    purpose() : string {
        return `Return the filepath of the current active editor window and store it in memory location key '${this.arg1}'`;
    }

    shareKnowledgeWithBoss_impl(): void {
        if (!this.boss) {
            return;
        }
        if (!this.arg1) {
            return;
        }
        this.boss.mergeInKnowledge(this.selectKnowledge([this.arg1]));
        return;
    }
    
    triggersReplan(): boolean {
        return false;
    }    

    async execute_impl(): Promise<AgentStatusReport> {
        const activeEditor = vscode.window.activeTextEditor;
        if (!activeEditor) {
            return { state: 'Failed', message: "No open active text editor" };
        }
        const filepath = activeEditor.document.fileName;
        const workspaceRelativeFilepath = toWorkspaceRelativeFilepath(filepath);
        if (isInvalidWorkspace(workspaceRelativeFilepath)) {
            return { state: 'Failed', message: "Invalid workspace" };
        }
        if (!this.arg1) {
            return { state: 'FailedMissingArgument' };
        }
        this.storeKnowledgeItem(this.arg1, workspaceRelativeFilepath);
        return { state: 'Finished', message: "Stored current active editor filepath" };
    }
}