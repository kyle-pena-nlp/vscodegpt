import * as vscode from 'vscode';
import { Agent, AgentStatusReport, NodeMetadata } from './agent';
import { AIPromptService } from './ai_prompt_service';
import { AICommandParser } from './ai_command_parser';
import { KnowledgeSelector } from './knowledge_selector';
import { ProgressWindow } from './progress_window';

export class WriteCodeAgent extends Agent {

    private ai_prompt_service : AIPromptService;

    constructor(arg1 : string|null, arg2: string|null, boss: Agent, context: vscode.ExtensionContext, progressWindow : ProgressWindow) {
        super(arg1, arg2, boss, context, progressWindow);
        this.ai_prompt_service = new AIPromptService(context);
    }

    static nodeMetadata() : NodeMetadata {
        return new NodeMetadata(
            ["WRITE-CODE", "<quoted-string>", "<until-EOL>"],
            ["WRITE-CODE", "memory-location-key", "<technical-requirements-statement>"],
            "You can write brand new code that fulfills requirements you choose, and store the result in the memory-location-key of your choosing.  This is for new code, not modifying existing code.",
            []
        );
    }  

    purpose(): string {
        return `Write code that fulfills these requirements: '${this.arg2}'. Store it in memory location key '${this.arg1}'`;
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

        if (!this.arg1) {
            return { state: 'FailedInvalidArgument', message: "Memory key not specified for storing code" };
        }

        if (!this.arg2) {
            return { state: 'FailedInvalidArgument', message: "Goal not supplied for writing code" };
        }

        // select relavent knowledge to write code
        const codeWritingKnowledgeSelectionPrompt = [
            `You have been asked to write code to: "${this.arg2}"`,
            `You may need to gather some knowledge items in order to write this code.`
        ]
        const knowledgeSelector = new KnowledgeSelector(this.context);
        const selectedKnowledge = await this.async_progress(() => knowledgeSelector.selectRelevantKnowledgeUsingAI(codeWritingKnowledgeSelectionPrompt, knowledgeSelector.getAgentAndBossKnowledge(this)), `Select relevant knowledge for writing code to ${this.arg1}`);
        const isFailure = this.isFailure(selectedKnowledge);
        if (isFailure) {
            return { state: selectedKnowledge };
        }

        // Gather relevant knowledge to write code
        const selectedBulletedKnowledge = knowledgeSelector.renderAsQnAItems(selectedKnowledge);

        // Generate a code writing prompt
        const writeCodePromptLines = [
            `Please write code to fulfill the requirement: ${this.arg1}`,
            `Here is some relevant knowledge that may help:`,
            ...selectedBulletedKnowledge,
            `When you write the code, before the first line of code please write BEGINCODE on a line by itself, and write ENDCODE after the last line of code on a line by itself`,
            `Do not include any non-code between BEGINCODE and ENDCODE, and do not use the triple backtick syntax for code blocks`
        ];
        const writeCodePrompt = writeCodePromptLines.join("\n");

        // Get the code back from the AI
        const no_context = new Map<string,string>();
        const response = await this.async_progress(() => this.ai_prompt_service.getAIResponse(null, writeCodePrompt, no_context), `Generating back to ${this.arg1}`);
        if (this.isFailure(response)) {
            return { state: response };
        }

        const parseCodeGrammar = ["BEGINCODE", "<until-ENDCODE>"];
        const parser = new AICommandParser([parseCodeGrammar]);
        const parsedResponse = parser.parse_commands(response.response);
        const code = parsedResponse.filter(c => c.verb == "BEGINCODE")[0];
        if (!code) {
            return { state: 'FailedDidNotAchieveGoal' };
        }
        const codeText = code.arg1;
        if (!codeText) {
            return { state: 'FailedDidNotAchieveGoal' };
        }

        // Make note of it
        this.storeKnowledgeItem(this.arg1, codeText);
        return { state: 'Finished' };
    }
}
