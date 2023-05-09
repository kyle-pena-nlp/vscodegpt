import * as vscode from 'vscode';
import { Agent, AgentStatusReport, NodeMetadata } from "./agent";
import { WorkspacePathFailureReason, fromWorkspaceRelativeFilepath, isInvalidWorkspace } from "./workspace";
import { ProgressWindow } from './progress_window';


export class ReadFileAgent extends Agent {

    constructor(arg1 : string|null, arg2 : string|null, boss: Agent, context : vscode.ExtensionContext, progressWindow : ProgressWindow) {
        super(arg1,arg2,boss,context,progressWindow);
    }

    static nodeMetadata(): NodeMetadata {
        return new NodeMetadata(
            ["READFILE", "<quoted-string>", "<quoted-string>"],
            ["READFILE", "filepath-to-read", "memory-location-key"],
            "You can read the contents of a file and store it in the memory location key that you choose.  This will contain the file contents, not the currently selected user text.",
            []
        );
    }

    purpose(): string {
        return `Read file at filepath: '${this.arg1}' and store it in the memory location key '${this.arg2}'`;
    }

    shareKnowledgeWithBoss_impl(): void {
        if (!this.boss) {
            return;
        }
        if (!this.arg2) {
            return;
        }
        this.boss.mergeInKnowledge(this.selectKnowledge([this.arg2]));
        return;
    }  
    
    triggersReplan(): boolean {
        return false;
    }    

    async execute_impl(): Promise<AgentStatusReport> {
        if (!this.arg1) {
            return { state: 'FailedMissingArgument', message: "Must supply file to read" };
        }
        const workspaceRelativeFilepath = fromWorkspaceRelativeFilepath(this.arg1);
        if (isInvalidWorkspace(workspaceRelativeFilepath)) {
            return { state: 'Failed', message: 'Invalid workspace' };
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