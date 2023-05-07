import { Agent, AgentStatusReport, NodeMetadata } from "./agent";
import * as vscode from 'vscode';
import { ProgressWindow } from "./progress_window";
import { KnowledgeSelector } from "./knowledge_selector";
import { AIPromptService } from "./ai_prompt_service";
import { AICommandParser } from "./ai_command_parser";

export class ModifyStoredCodeAgent extends Agent {

    private ai_prompt_service : AIPromptService;

    static nodeMetadata() : NodeMetadata {
        return new NodeMetadata(
            ["MODIFY-STORED-CODE", "<quoted-string>", "<until-EOL>"], 
            ["MODIFY-STORED-CODE", "memory-location-key", "Instructions-for-modification"], 
            "You can modify code you have previously stored at a memory location key. The modification that will be performed is described by the instructions.  The result will be stored back into the same memory-location-key.",
        [
        ])
    };    

    constructor(arg1 : string|null, arg2: string|null, boss : Agent|null, context: vscode.ExtensionContext, progressWindow : ProgressWindow) {
        super(arg1, arg2, boss, context, progressWindow);
        this.ai_prompt_service = new AIPromptService(this.context);
    }

    purpose(): string {
        return `Modify the code stored in ${this.arg1} according to these instructions: ${this.arg2}`;
    }
    async execute_impl(): Promise<AgentStatusReport> {
        
        if (!this.arg1) {
            return { state: 'FailedInvalidArgument' };
        }

        if (!this.arg2) {
            return { state: 'FailedInvalidArgument' };
        }

        const knowledgeSelector = new KnowledgeSelector(this.context);
        const knowledge = knowledgeSelector.getAgentAndBossKnowledge(this);
        const code = knowledge.get(this.arg1);
        if (!code) {
            return { state: 'Failed' };
        }

        const promptLines = [
            `Please modify the following code to follow these instructions: ${this.arg2}`,
            code,
            `When you respond, before the first line of code, write BEGINCODE on a single line`,
            `After the last line of code, write ENDCODE on a single line`
        ];

        const modifyCodePrompt = promptLines.join('\n');
        const context_items = new Map<string,string>();

        const response = await this.async_progress(() => this.ai_prompt_service.getAIResponse(null, modifyCodePrompt, context_items), "Modifying code");

        if (this.isFailure(response)) {
            return { state: response };
        }

        const grammar = [["BEGINCODE", "<until-ENDCODE>"]];

        const parser = new AICommandParser(grammar);

        const parsed = parser.parse_commands(response.response);

        const modifiedCode = parsed.filter(c => c.verb == "BEGINCODE")[0]?.arg2;

        if (!modifiedCode) {
            return { state: 'FailedInsufficientAIResponse' };
        }

        this.storeKnowledgeItem(this.arg1, modifiedCode);

        return { state: 'Finished' };

    }
    
}