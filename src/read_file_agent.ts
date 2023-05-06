import * as vscode from 'vscode';
import { Agent, AgentStatusReport, NodeMetadata } from "./agent";
import { WorkspacePathFailureReason, fromWorkspaceRelativeFilepath } from "./workspace";
import { ProgressWindow } from './progress_window';


class ReadFileAgent extends Agent {

    constructor(arg1 : string|null, arg2 : string|null, boss: Agent, context : vscode.ExtensionContext, progressWindow : ProgressWindow) {
        super(arg1,arg2,boss,context,progressWindow);
    }

    static nodeMetadata(): NodeMetadata {
        return new NodeMetadata(
            ["READFILE", "<quoted-string>"],
            ["READFILE", "filepath-to-read"],
            "Reads the contents of a file from a filepath (relative to the workspace root)",
            []
        );
    }

    purpose(): string {
        return `Reads file at filepath: "${this.arg1}"`;
    }

    async execute_impl(): Promise<AgentStatusReport> {
        if (!this.arg1) {
            return { state: 'FailedMissingArgument', message: "Must supply file to read" };
        }
        const workspaceRelativeFilepath = fromWorkspaceRelativeFilepath(this.arg1);
        if (workspaceRelativeFilepath == WorkspacePathFailureReason.NoOpenWorkspace) {
            return { state: 'FailedInvalidArgument', message: "No workspace is open" };
        }
        if (workspaceRelativeFilepath == WorkspacePathFailureReason.MoreThanOneWorkspaceIsUnsupported) {
            return { state: 'FailedInvalidArgument', message: "Multiple workspaces are not supported"};
        }
        const uri = vscode.Uri.file(workspaceRelativeFilepath);
        try{
            const fileContents = await this.thenable_progress(() => vscode.workspace.fs.readFile(uri), `Reading "${workspaceRelativeFilepath}"`);
            if (fileContents == 'UserCancelled') {
                return { state: 'UserCancelled' };
            }
            const fileText = new TextDecoder().decode(fileContents);
            this.storeKnowledgeItem(`Contents of "${this.arg1}`, fileText);
            return { state: 'Finished', "message": `Read contents of "${this.arg1}"` };
        }
        catch (exception) {
            return { state: 'FailedUnspecifiedError', message: `An unspecified error happened while reading "${this.arg1}"`, debug: exception }
        }
    }
}