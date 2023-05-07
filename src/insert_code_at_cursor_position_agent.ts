import * as vscode from 'vscode';
import { Agent, AgentStatusReport, AgentState, NodeMetadata } from "./agent";
import { KnowledgeSelector } from './knowledge_selector';

export class InsertCodeAtCursorPosition extends Agent {

    static nodeMetadata() : NodeMetadata {
        return new NodeMetadata(
            ["INSERT-CODE-AT-CURSOR-POSITION", "<quoted-string>"],
            ["INSERT-CODE-AT-CURSOR-POSITION", "memory-location-key"],
            "You can insert code stored in the designed memory-location-key at the current cursor position",
            []
        );
    }

    purpose(): string {
        return `Insert at the user's current cursor position the code stored in memory location key '${this.arg1}'`;
    }

    async execute_impl(): Promise<AgentStatusReport> {

        // TODO: this is now wrong
        const knowledgeSelector = new KnowledgeSelector(this.context);
        const promptLines = [
            `You want to insert code at the current cursor position with code you have previously written.`,
            `Pick just one of the following options which contains the code you want to use to insert at the current cursor position.`,
        ];

        const knowledge = knowledgeSelector.getAgentAndBossKnowledge(this);

        const writtenCode = await this.async_progress(() => knowledgeSelector.selectRelevantKnowledgeUsingAI(promptLines, knowledge), "Picking which code to insert at the current cursor position");

        if (this.isFailure(writtenCode)) {
            return { state: writtenCode };
        }

        const code = [ ...writtenCode.values() ][0];

        if (!code) {
            return { state: 'FailedInsufficientAIResponse' };
        }

        const currentPosition = await this.getCurrentCursorPosition();
        if (!currentPosition) {
          return { state: 'FailedUnspecifiedError' };
        }

        try {
            await this.insertTextAtCurrentPosition(code, currentPosition);
            return { state: 'Finished' };
        }
        catch (exception) {
            return { state: 'FailedUnspecifiedError', debug: exception };
        }
    }

    private async getCurrentCursorPosition() {
        const textEditor = vscode.window.activeTextEditor;
        if (!textEditor) {
            return;
        }
        return textEditor.selection.active;
    }
    
    private async insertTextAtCurrentPosition(generatedText : string, position : vscode.Position) {
        const textEditor = vscode.window.activeTextEditor;
        if (!textEditor) {
          return;
        }      
        await textEditor.edit(editBuilder => {
          editBuilder.insert(position, generatedText);
        });      
      }
}