import * as vscode from 'vscode';
import { AIPromptService, AIResponseError } from "./ai_prompt_service";
import { AICommandParser } from './ai_command_parser';
import { PromptDef, ResponseGrammar } from "./prompts";
import { AICommand } from './ai_com_types';
import { ProgressWindow } from './progress_window';
import { fromWorkspaceRelativeFilepath, toWorkspaceRelativeFilepath, WorkspacePathFailureReason } from './workspace';

// An Agent's knowledge is represented by question and answer pairs
export type QuestionsAndAnswers = Map<string,string>;

export type AgentFailureState  = AIResponseError | 'UserCancelled' |
'Failed'|
'FailedMissingArgument'|
'FailedInvalidArgument'|
'FailedUnspecifiedError'|
'FailedDidNotAchieveGoal'|
'FailedUserDidNotRespond'|
'FailedExceededTokenLimit'|
'FailedInsufficientAIResponse';

// This is the execution result of an Agent's implementation
export type AgentState = 'NotStarted'|'Finished'|AgentFailureState;

// This is a broader type covering more scenarios (additional data and/or user cancellation)
export type AgentStatusReport = { state : AgentState, message? : string, debug?: any };

// This defines a 'Palette' of available classes descending from Agents that can be instantiated
export type ClassWhichDescendsFromAgent = { 
    new (arg1 : string|null, arg2: string|null, boss: Agent, context : vscode.ExtensionContext, progressWindow: ProgressWindow): Agent,
    nodeMetadata(): NodeMetadata
};


export type Palette = Array<ClassWhichDescendsFromAgent>;


export abstract class Agent {

    boss : Agent|null;
    knowledge : QuestionsAndAnswers;    
    status : AgentStatusReport; 

    protected arg1 : string|null;
    protected arg2 : string|null;   
    protected minions : Array<Agent>;
    protected context : vscode.ExtensionContext;
    protected progressWindow : ProgressWindow;

    constructor(arg1 : string|null, arg2 : string|null, boss: Agent|null, context : vscode.ExtensionContext, progressWindow : ProgressWindow) {
        this.arg1 = arg1;
        this.arg2 = arg2;
        this.boss = boss;
        this.context = context;
        this.knowledge = new Map<string,string>();
        this.minions = [];
        this.status = { state : 'NotStarted' };
        this.progressWindow = progressWindow;     
    }

    // static metadata

    static nodeMetadata() : NodeMetadata {
        throw "Implement in derived classes";
    }

    // abstract methods

    // describe purpose using arg1 and arg2
    abstract purpose() : string;

    // perform work
    abstract execute_impl() : Promise<AgentStatusReport>;

    async execute() {
        try{
            const status = await this.execute_impl();
            this.status = status;
        }
        catch (exception) {
            this.status = { state: 'FailedUnspecifiedError', message: "Failed to an unspecified error", debug: exception };
            // hack.
            if (this.boss === null) {
                this.progressWindow.close();
            }
        }
    }

    // helpers

    protected storeKnowledgeItem(question : string, answer : string) {
        this.knowledge.set(question, answer);
    }

    mergeInKnowledge(newKnowledge : QuestionsAndAnswers) {
        for (const key of newKnowledge.keys()) {
            this.knowledge.set(key, newKnowledge.get(key)!);
        }
    }

    protected async_progress<T>(fn : () => Promise<T>, title : string) : Promise<T|'UserCancelled'>
    {
        return this.progressWindow.wrapAsync<T>(title, fn);
    }

    protected thenable_progress<T>(fn : () => Thenable<T>, title : string): Thenable<T|'UserCancelled'> {
        return this.progressWindow.wrapAsync<T>(title, () => Promise.resolve(fn()));
    }

    protected progress<T>(fn : () => T, title : string): T|'UserCancelled' {
        return this.progressWindow.wrap(title, fn);
    }

    isFailure<T>(value : T|AgentState) : value is AgentFailureState {
        if (value == 'BadAPIKey') {
            return true;
        }
        else if (value == 'Failed') {
            return true;
        }
        else if (value == 'FailedDidNotAchieveGoal') {
            return true;
        }
        else if (value == 'FailedExceededTokenLimit') {
            return true;
        }
        else if (value == 'FailedInvalidArgument') {
            return true;
        }
        else if (value == 'FailedMissingArgument') {
            return true;
        }
        else if (value == 'FailedUnspecifiedError') {
            return true;
        }
        else if (value == 'FailedUserDidNotRespond') {
            return true;
        }
        else if (value == 'OtherAPIError') {
            return true;
        }
        else if (value == 'RateLimited') {
            return true;
        }
        else if (value == 'TokenLimited') {
            return true;
        }
        else if (value == 'UserCancelled') {
            return true;
        }
        else if (value == 'FailedInsufficientAIResponse')  {
            return true;
        }
        else {
            return false;
        }
    }

    notStarted() : boolean {
        if  (this.status.state == 'UserCancelled') {
            return false;
        }
        if (this.status.state == 'BadAPIKey') {
            return false;
        }
        if (this.status.state == 'OtherAPIError') {
            return false;
        }
        if (this.status.state == 'RateLimited') {
            return false;
        }
        if (this.status.state == 'TokenLimited') {
            return false;
        }
        else if (this.status.state == 'NotStarted') {
            return true;
        }
        else {
            return false;
        }
    }
}






export class NodeMetadata {

    // the grammar used by the AI to specify the creation of a node
    grammar : Array<string>

    // the interpretation of each token in the grammar (used by automated prompt construction)
    tokenInterpretation: Array<string>

    // the description of the purpose of the node
    description: string

    // what actions are available to the node when planning
    agentPalette : Palette

    constructor(grammar : Array<string>, tokenInterpretation : Array<string>, description : string, agentPalette : Palette) {
        this.grammar = grammar;
        this.tokenInterpretation = tokenInterpretation;
        this.description = description;
        this.agentPalette = agentPalette;
        this.validate();
    }

    private validate() {
        // todo: assert is of format: LITERAL <until-EOL>?
    }

    getAgentCtor(verb : string) {
        return this.agentPalette.filter(agent => agent.nodeMetadata().getVerb() == verb)[0];
    }

    getVerb() {
        return this.grammar[0];
    }

    renderGrammarForPrompt() : string {
        const grammarDescription = []
        for (let idx = 0; idx < this.tokenInterpretation.length; idx++) {
            const grammarToken = this.grammar[idx];
            const interpretationToken = this.tokenInterpretation[idx].replace(/\s+/, "-");
            if (grammarToken == "<quoted-string>") {
                grammarDescription.push(`"<${interpretationToken}>"`);
            }
            else if (grammarToken == "<until-EOL>") {
                grammarDescription.push(`<${interpretationToken}>`);
            }
            else if (grammarToken == "<until-EOF>") {
                grammarDescription.push(`<${interpretationToken}-multiline>`)
            }
            else if (grammarToken.startsWith("<until-")) {
                grammarDescription.push(`<${interpretationToken}>`);
            }
            else {
                grammarDescription.push(`${interpretationToken}`);
            }
        }
        const result = `${this.description}. Format: ${grammarDescription.join(" ")}`;
        return result;
    }
}