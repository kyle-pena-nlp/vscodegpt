import * as vscode from 'vscode';
import { Agent, AgentStatusReport, NodeMetadata } from "./agent";
import { ProgressWindow } from './progress_window';


export class ReadCurrentlySelectedTextInActiveEditorAgent extends Agent {

    constructor(arg1 : string|null, arg2: string|null, boss: Agent, context: vscode.ExtensionContext, progressWindow : ProgressWindow) {
        super(arg1, arg2, boss, context, progressWindow);
    }

    static nodeMetadata() : NodeMetadata {
        return new NodeMetadata(
            ["GET-SELECTED-TEXT-IN-ACTIVE-EDITOR", "<quoted-string>"],
            ["GET-SELECTED-TEXT-IN-ACTIVE-EDITOR", "memory-location-key"],
            "You can get the user's currently selected text in the open active editor and store in your memory using the location key you specify.  Warning: Currently selected text may be different than what is currently stored on disk for the corresponding file!",
            []
        );
    }    

    purpose(): string {
        return `Read currently selected text in the active editor and store it in the memory location key: '${this.arg1}'`;
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
        const selectedText = this.getSelectedText();
        if (!selectedText) {
            return { state: 'FailedUnspecifiedError', message: "Could not get selected text" };
        }
        if (!this.arg1) {
            return { state: 'FailedInvalidArgument' };
        }
        this.storeKnowledgeItem(this.arg1, selectedText);
        return { state: 'Finished', "message": "Got currently selected text in active editor" }
    }

    private getSelectedText() {
        const textEditor = vscode.window.activeTextEditor;
        if (!textEditor) {
            return;
        }
        const selection = textEditor.selection;
        if (!selection) {
            return;
        }
        if (selection.isEmpty) {
            return;
        }
        const selectedText = textEditor!.document.getText(selection);
        return selectedText;
      }    
}
