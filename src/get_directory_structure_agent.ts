
import * as vscode from 'vscode';
import { AIPromptService, AIResponseError } from "./ai_prompt_service";
import { Agent, AgentStatusReport, NodeMetadata } from "./agent"
import { ProgressWindow } from "./progress_window";
import { AICommandParser } from "./ai_command_parser";
import { WorkspacePathFailureReason, fromWorkspaceRelativeFilepath, toWorkspaceRelativeFilepath, isInvalidWorkspace } from './workspace';

export class GetDirectoryStructureAgent extends Agent {

    constructor(arg1 : string|null, arg2: string|null, boss: Agent, context: vscode.ExtensionContext, progressWindow : ProgressWindow) {
        super(arg1, arg2, boss, context, progressWindow);
    }

    static nodeMetadata() : NodeMetadata {
        return new NodeMetadata(
            ["GET-DIRECTORY-STRUCTURE-DESCRIPTION", "<quoted-string>", "<quoted-string>"],
            ["GET-DIRECTORY-STRUCTURE-DESCRIPTION", "workspace-root-relative-directory-filepath", "memory-location-key"],
            "You can read the structure of the directory of the requested relative path (which is relative to the workspace root), storing the result into your memory by a key that you choose and can reference later",
            []
        );
    }

    purpose(): string {
        return `Get the directory structure of '${this.arg1}' and store it in '${this.arg2}'`;
    }
    
    async execute_impl(): Promise<AgentStatusReport> {

        if (!this.arg1) {
            return { state: 'FailedMissingArgument', message: "No workspace root relative directory provided" };
        }

        const absoluteFilepath = fromWorkspaceRelativeFilepath(this.arg1);
        if (isInvalidWorkspace(absoluteFilepath)) {
            return { state: 'Failed', message: "Invalid workspace" };
        }

        const uri = vscode.Uri.file(absoluteFilepath);

        try {

            const directoryContents = await this.thenable_progress(() => vscode.workspace.fs.readDirectory(uri), `Reading contents of directory ${this.arg1}`);
            if (directoryContents == 'UserCancelled') {
                return { state: 'UserCancelled' }
            }

            const summary : { [key : string] : string } = {};

            // Display the directory contents
            directoryContents.forEach(([fileName, fileType]) => {
                const fileTypeString = fileType === vscode.FileType.Directory ? 'Directory' : 'File';
                const filepath = vscode.Uri.joinPath(vscode.Uri.file(absoluteFilepath), fileName);
                const workspaceRelativeFilepath = toWorkspaceRelativeFilepath(filepath.fsPath);
                if (isInvalidWorkspace(workspaceRelativeFilepath)) {
                    return { state: 'Failed', message: "Invalid workspace" };
                }               
                summary[workspaceRelativeFilepath] = fileTypeString;
            });

            const summaryString = JSON.stringify(summary);

            if (!this.arg2) {
                return { state: 'FailedInvalidArgument' };
            }

            this.storeKnowledgeItem(this.arg2, summaryString);

            return { state: 'Finished' };
        }
        catch (exception) {
            return { state: 'FailedUnspecifiedError', message: "Could not read entries in ${this.arg1}", debug: exception };
        }

    }
}