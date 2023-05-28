import * as vscode from 'vscode';
import { AIResponseError } from "./ai_prompt_service";
import { ProgressWindow } from './progress_window';

// An Agent's knowledge is represented by question and answer pairs
export type QuestionsAndAnswers = Map<string,string>;

export type FatalAgentError = 'RateLimited' | 'OtherAPIError' | 'BadAPIKey' | 'UserCancelled' | 'FailedInvalidWorkspace';


export type AgentFailureState  = AIResponseError | 'UserCancelled' |
'Failed'|
'FailedMissingArgument'|
'FailedInvalidArgument'|
'FailedUnspecifiedError'|
'FailedDidNotAchieveGoal'|
'FailedUserDidNotRespond'|
'FailedExceededTokenLimit'|
'FailedInsufficientAIResponse'|
'FailedInvalidWorkspace';

// This is the execution result of an Agent's implementation
export type AgentState = 'NotStarted'|'Finished'|AgentFailureState;

// This is a broader type covering more scenarios (additional data and/or user cancellation)
export type AgentStatusReport = { state : AgentState, message? : string, debug?: any };

// This defines a 'Palette' of available classes descending from Agents that can be instantiated
export type ClassWhichDescendsFromAgent = { 
    new (arg1 : string|null, arg2: string|null, arg3 : string|null, boss: Agent, context : vscode.ExtensionContext, progressWindow: ProgressWindow): Agent,
    nodeMetadata(): NodeMetadata
};

export type Palette = Array<ClassWhichDescendsFromAgent>;

// TODO: state for serialization.  pausing from progress window.  AI command panel view.
// Agents for determining resource URLs, determining dependency lists, fetching github resources at URLs, reading code structure (folds), extracting folds
// Make memory bank items lambdas.  Institute dirty hash chain?

export abstract class Agent {

    boss : Agent|null;
    knowledge : QuestionsAndAnswers;    
    status : AgentStatusReport; 

    protected arg1 : string|null;
    protected arg2 : string|null;   
    protected arg3 : string|null;
    protected minions : Array<Agent>;
    protected context : vscode.ExtensionContext;
    protected progressWindow : ProgressWindow;

    constructor(arg1 : string|null, arg2 : string|null, arg3 : string|null, boss: Agent|null, context : vscode.ExtensionContext, progressWindow : ProgressWindow) {
        this.arg1 = arg1;
        this.arg2 = arg2;
        this.arg3 = arg3;
        this.boss = boss;
        this.context = context;
        this.progressWindow = progressWindow;            
        this.knowledge = new Map<string,string>();
        this.minions = [];
        this.status = { state : 'NotStarted' }; 
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

    abstract triggersReplan() : boolean;

    protected abstract shareKnowledgeWithBoss_impl() : void;

    getMinions() : Agent[] {
        return this.minions;
    }

    setMinions(minions: Agent[]) {
        this.minions.splice(0, this.minions.length, ...minions);
    }

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

    shareKnowledgeWithBoss() : void {
        if (!this.boss) {
            return;
        }
        this.shareKnowledgeWithBoss_impl();
    }

    protected selectKnowledge(selection : string[]) {
        let selectedKeys = selection;
        const entries = [...this.knowledge.entries()].filter(entry => selectedKeys.includes(entry[0]));
        return new Map<string,string>(entries);
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

    // show-stopper errors that propogate up the callstack
    isFatalFailure<T>(value : T|AgentState) : value is FatalAgentError {
        if (value == 'BadAPIKey') {
            return true;
        }
        else if (value == 'RateLimited') {
            return true;
        }
        else if (value == 'UserCancelled') {
            return true;
        }
        else if (value == 'OtherAPIError') {
            return true;
        }
        else if (value == 'FailedInvalidWorkspace') {
            return true;
        }
        return false;
    }
    
    isFailure<T>(value : T|AgentState) : value is AgentFailureState {

        if (value == 'Failed') {
            return true;
        }
        else if (value == 'FailedMissingArgument') {
            return true;
        }        
        else if (value == 'FailedInvalidArgument') {
            return true;
        }        
        else if (value == 'FailedUnspecifiedError') {
            return true;
        }        
        else if (value == 'FailedDidNotAchieveGoal') {
            return true;
        }
        else if (value == 'FailedUserDidNotRespond') {
            return true;
        }        
        else if (value == 'FailedExceededTokenLimit') {
            return true;
        }
        else if (value == 'FailedInsufficientAIResponse')  {
            return true;
        }
        else if (value == 'FailedInvalidWorkspace') {
            return true;
        }

        else if (value == 'BadAPIKey') {
            return true;
        }
        else if (value == 'RateLimited') {
            return true;
        }        
        else if (value == 'TokenLimited') {
            return true;
        }
        else if (value == 'OtherAPIError') {
            return true;
        }
        else if (value == 'UserCancelled') {
            return true;
        }


        else {
            return false;
        }
    }

    notStarted() : boolean {
        if (this.status.state == 'NotStarted') {
            return true;
        }
        else {
            return false;
        }
    }

    unstartedMinions(): Agent[] {
        return this.minions.filter(m => m.status.state == 'NotStarted');
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