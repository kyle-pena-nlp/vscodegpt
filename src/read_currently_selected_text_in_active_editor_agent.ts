import * as vscode from 'vscode';
import { Agent, AgentStatusReport, NodeMetadata } from "./agent";
import { ProgressWindow } from './progress_window';


class ReadCurrentlySelectedTextInActiveEditorAgent extends Agent {

    constructor(arg1 : string|null, arg2: string|null, boss: Agent, context: vscode.ExtensionContext, progressWindow : ProgressWindow) {
        super(arg1, arg2, boss, context, progressWindow);
    }

    static nodeMetadata() : NodeMetadata {
        return new NodeMetadata(
            ["GET-SELECTED-TEXT-IN-ACTIVE-EDITOR"],
            ["GET-SELECTED-TEXT-IN-ACTIVE-EDITOR"],
            "Gets the currently selected text in the open active editor",
            []
        );
    }    

    purpose(): string {
        return "Reads currently selected text in the active editor"
    }

    async execute_impl(): Promise<AgentStatusReport> {
        const selectedText = this.getSelectedText();
        if (!selectedText) {
            return { state: 'FailedUnspecifiedError', message: "Could not get selected text" };
        }
        this.storeKnowledgeItem("Currently Selected Text In Active Editor", selectedText);
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
