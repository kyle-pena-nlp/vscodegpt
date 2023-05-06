import * as vscode from 'vscode';
import { AIPromptService, AIResponseError } from './ai_prompt_service';
import { Agent, QuestionsAndAnswers } from './agent';
import { AICommandParser } from './ai_command_parser';


export class KnowledgeSelector {

    private context: vscode.ExtensionContext;
    protected ai_prompt_service : AIPromptService;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.ai_prompt_service = new AIPromptService(this.context);   
    }

    getAgentAndBossKnowledge(agent : Agent) : QuestionsAndAnswers {
        const allEntries = [ ...agent.knowledge.entries(), ...(agent.boss ? agent.boss.knowledge.entries() : []) ];
        return new Map<string,string>(allEntries);
    }

    renderAsQnAItems(knowledge: QuestionsAndAnswers) : string[] {
        const lines = [...knowledge.entries()].map(qNa => `- Question: "${qNa[0]}". Answer: "${qNa[1]}"`);
        return lines;
    }

    // ask the AI to choose which information is relevant from a list
    async selectRelevantKnowledgeUsingAI(promptPreambleLines: Array<string>, knowledge : QuestionsAndAnswers) : Promise<QuestionsAndAnswers|AIResponseError> {

        // set up the prompt
        const numberedKnowledgeList = [...knowledge.keys()].map((question,index) => (index+1).toString(10) + ". " + question);
        const selectionPromptLines = [    
            `Please select relevant items from the below list.`,
            `Respond only with the numbers of the items, one per line, in this format: SELECT <number>`,
            `If none of the knowledge is relevant, respond on a single line: NONE`,
            ...numberedKnowledgeList
        ];
        const userPromptLines = [ ...promptPreambleLines, ...selectionPromptLines ];

        // ask the AI for a selection and get a response
        const responseGrammar = [["SELECT", "<until-EOL>"], ["NONE"]];
        const userPrompt = (userPromptLines).join("\n");
        const no_context = new Map<string,string>();
        const aiResponse = await this.ai_prompt_service.getAIResponse(null, userPrompt, no_context);

        // error handling.

        const responseParser = new AICommandParser(responseGrammar);
        const selectedKnowledge = [];
        if (aiResponse) {
            const selections = responseParser.parse_commands(aiResponse).filter(selection => selection.verb.toLowerCase() == "select");
            const numbers = selections.map(selection => selection.arg1)
            for (const number of numbers) {
                if (!number) {
                    continue;
                }
                try {
                    const parsedNumber = parseInt(number.trimEnd().replace(/\.$/,""), 10);
                    const index = parsedNumber - 1;
                    const selectedKnowledgeItem = [...knowledge.keys()][index];
                    if (knowledge) {
                        selectedKnowledge.push(selectedKnowledgeItem);
                    }
                }
                catch {
                    // no-op
                    console.debug("Could not parse selection ${number} as an integer")
                }
            }
        }

        // return the selected knowledge
        const result = new Map<string,string>();
        for (const selectedKnowledgeItem of selectedKnowledge) {
            result.set(selectedKnowledgeItem, knowledge.get(selectedKnowledgeItem)!);
        }
        return result;

    }
}