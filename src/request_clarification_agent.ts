
import * as vscode from 'vscode';
import { Agent, AgentStatusReport, NodeMetadata } from './agent';
import { ProgressWindow } from './progress_window';

export class RequestClarificationAgent extends Agent {

    constructor(arg1 : string|null, arg2: string|null, boss: Agent, context: vscode.ExtensionContext, progressWindow : ProgressWindow) {
        super(arg1, arg2, boss, context, progressWindow);
    }

    static nodeMetadata() : NodeMetadata {
        return new NodeMetadata(
            ["REQUEST-CLARIFICATION", "<quoted-string>", "<until-EOL>"],
            ["REQUEST-CLARIFICATION", "memory-location-key", "clarification-question"],
            "You can request a clarification from a human being but only if it is absolutely impossible to proceed without additional information. You can store the response in a memory-location-key of your choosing.",
            []
        );
    }

    purpose(): string {
        return `Request a clarification from a human being and store it in memory location key '${this.arg1}'`;
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
        return true;
    }    

    async execute_impl(): Promise<AgentStatusReport> {
        try
        {
            if (!this.arg2) {
                return { state: 'FailedMissingArgument', message: "Question to user not provided" };
            }

            const userResponse = await this.promptUserForCommand("I need you to clarify something for me...", this.arg2, "Your answer...");
            if (!userResponse) {
                return { state: 'FailedUserDidNotRespond', message: "User chose not to respond to request for clarification" };
            }

            if (!this.arg1) {
                return { state: 'FailedInvalidArgument' };
            }

            this.storeKnowledgeItem(this.arg1, userResponse);
            return { state: 'Finished', message: `Got clarification from user for goal: ${this.arg1}` };
        }
        catch (exception) {
            return { state: 'FailedUnspecifiedError', message: "Problem happened when trying to get clarification from the user", debug: exception };
        }
    }

    private async promptUserForCommand(title? : string, prompt? : string, placeholder? : string) : Promise<string|undefined> {
        const validateInput = (input : string) => {
            if (!input.trim()) {
                return "No command entered."
            }
        }
        const result = await this.thenable_progress(() => vscode.window.showInputBox({ 
            title : title, 
            prompt: prompt, 
            placeholder : placeholder, 
            ignoreFocusOut: false, 
            validateInput: validateInput } as vscode.InputBoxOptions), "Requesting clarification on goal from user");
        return result
    }    
}