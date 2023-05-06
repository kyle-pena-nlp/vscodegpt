
import * as vscode from 'vscode';
import { Agent, AgentStatusReport, NodeMetadata } from './agent';
import { ProgressWindow } from './progress_window';

class RequestClarificationAgent extends Agent {

    constructor(arg1 : string|null, arg2: string|null, boss: Agent, context: vscode.ExtensionContext, progressWindow : ProgressWindow) {
        super(arg1, arg2, boss, context, progressWindow);
    }

    static nodeMetadata() : NodeMetadata {
        return new NodeMetadata(
            ["REQUEST-CLARIFICATION", "<until-EOL>"],
            ["REQUEST-CLARIFICATION", "clarification-question"],
            "Requests a clarification from a human being in order to make the details or intent of a goal more clear",
            []
        );
    }

    purpose(): string {
        return `Requests a clarification from a human being in order to better understand the intent of a goal`;
    }

    async execute_impl(): Promise<AgentStatusReport> {
        try
        {
            if (!this.arg1) {
                return { state: 'FailedMissingArgument', message: "Question to user not provided" };
            }

            const userResponse = await this.promptUserForCommand("I need you to clarify something for me...", this.arg1, "Your answer...");
            if (!userResponse) {
                return { state: 'FailedUserDidNotRespond', message: "User chose not to respond to request for clarification" };
            }

            this.storeKnowledgeItem(`Needs Clarification for goal: "${this.arg1}"`, userResponse);
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