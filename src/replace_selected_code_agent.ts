import * as vscode from 'vscode';
import { Agent, AgentStatusReport, AgentState, NodeMetadata } from "./agent";
import { ProgressWindow } from "./progress_window";
import { KnowledgeSelector } from './knowledge_selector';

export class ReplaceSelectedCodeAgent extends Agent {

    static nodeMetadata() : NodeMetadata {
        return new NodeMetadata(
            ["REPLACE-SELECTED-CODE-WITH-NEW-CODE", "<quoted-string>"],
            ["REPLACE-SELECTED-CODE-WITH-NEW-CODE", "memory-location-key"],
            "You can replace the currently selected code with the code stored in the memory location key you choose",
            []
        );
    }    

    constructor(arg1 : string|null, arg2 : string|null, boss: Agent|null, context: vscode.ExtensionContext, progressWindow : ProgressWindow) {
        super(arg1, arg2, boss, context, progressWindow)
    }

    purpose(): string {
        return `Replace the user's currently selected code with the code stored at memory location key '${this.arg1}'`;
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

        const knowledgeSelector = new KnowledgeSelector(this.context);

        const knowledge = knowledgeSelector.getAgentAndBossKnowledge(this);

        if (!this.arg2) {
            return { state: 'FailedInvalidArgument' };
        }

        const code = knowledge.get(this.arg2);

        if (!code) {
            return { state: 'FailedInsufficientAIResponse' };
        }

        // Verify there is actually text selected
        const selection = this.getCurrentSelection();
        if (!selection) {
            return { state: 'FailedUnspecifiedError' };
        }        

        try {
            await this.replaceSelection(code, selection);
            return { state: 'Finished' };
        }
        catch (exception) {
            return { state: 'FailedUnspecifiedError', debug: exception };
        }
        
    }
    
    private getCurrentSelection() {
        const textEditor = vscode.window.activeTextEditor;
        if (!textEditor) {
            return null;
        }
        return textEditor.selection;
    }    

    private async replaceSelection(generatedText : string, selection : vscode.Selection) {
        const textEditor = vscode.window.activeTextEditor;
        if (!textEditor) {
            return null;
        }
        await textEditor.edit(editBuilder => {
          editBuilder.replace(selection, generatedText);
        });      
      }    
}