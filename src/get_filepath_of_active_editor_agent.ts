

import * as vscode from 'vscode';
import { AIPromptService, AIResponseError } from "./ai_prompt_service";
import { Agent, AgentStatusReport, NodeMetadata } from "./agent"
import { ProgressWindow } from "./progress_window";
import { AICommandParser } from "./ai_command_parser";
import { WorkspacePathFailureReason, toWorkspaceRelativeFilepath } from './workspace';

class GetFilepathOfActiveEditorAgent extends Agent {
    constructor(arg1 : string|null, arg2 : string|null, boss: Agent, context: vscode.ExtensionContext, progressWindow : ProgressWindow) {
        super(arg1, arg2, boss, context, progressWindow);
    }

    static nodeMetadata(): NodeMetadata {
        return new NodeMetadata(
            ["GET-ACTIVE-EDITOR-FILEPATH"],
            ["GET-ACTIVE-EDITOR-FILEPATH"],
            "Determines the filepath of the current active editor window (relative to the workspace root)",
            []
        );
    }

    purpose() : string {
        return `Returns filepath of the current active editor window (relative to the workspace root)`;
    }

    async execute_impl(): Promise<AgentStatusReport> {
        const activeEditor = vscode.window.activeTextEditor;
        if (!activeEditor) {
            return { state: 'Failed', message: "No open active text editor" };
        }
        const filepath = activeEditor.document.fileName;
        const workspaceRelativeFilepath = toWorkspaceRelativeFilepath(filepath);
        if (workspaceRelativeFilepath == WorkspacePathFailureReason.NoOpenWorkspace) {
            return { state: 'Failed', message: "No open workspace" };
        }
        else if (workspaceRelativeFilepath == WorkspacePathFailureReason.MoreThanOneWorkspaceIsUnsupported) {
            return { state: 'Failed', message: "Multiple root workspaces not supported" };
        }
        this.storeKnowledgeItem("Current active editor filepath (relative to workspace root)", workspaceRelativeFilepath);
        return { state: 'Finished', message: "Stored current active editor filepath" };
    }
}