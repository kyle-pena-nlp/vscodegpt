import * as vscode from 'vscode';
import { AIPromptService, AIResponseError } from "./ai_prompt_service";
import { Agent, AgentStatusReport, NodeMetadata, QuestionsAndAnswers } from "./agent"
import { ProgressWindow } from "./progress_window";
import { AICommandParser } from "./ai_command_parser";
import { KnowledgeSelector } from './knowledge_selector';
import { ReadFileAgent } from './read_file_agent';
import { GetFilepathOfActiveEditorAgent } from './get_filepath_of_active_editor_agent';
import { GetDirectoryStructureAgent } from './get_directory_structure_agent';
import { WriteCodeAgent } from './write_code_agent';
import { ReadCurrentlySelectedTextInActiveEditorAgent } from './read_currently_selected_text_in_active_editor_agent';
import { RequestClarificationAgent } from './request_clarification_agent';
import { InsertCodeAtCursorPosition } from './insert_code_at_cursor_position_agent';
import { ReplaceSelectedCodeAgent } from './replace_selected_code_agent';
import { ModifyStoredCodeAgent } from './modify_stored_code_agent';


// An agent which forms plans
export class GoalPlanningAgent extends Agent {

    private ai_prompt_service : AIPromptService;

    static nodeMetadata() : NodeMetadata {
        return new NodeMetadata(
            ["GOAL", "<until-EOL>"], 
            ["GOAL", "stategic-step"], 
            "You can strategically break down your plan into an isolated sub-goal which is independent from the rest of the plan. If you choose this option, don't let the steps within the goal as well. You will break it down yourself later.",
        [
            //GoalPlanningAgent,
            ReadFileAgent, 
            GetFilepathOfActiveEditorAgent,
            GetDirectoryStructureAgent,
            RequestClarificationAgent,
            ReadCurrentlySelectedTextInActiveEditorAgent,
            WriteCodeAgent,
            InsertCodeAtCursorPosition,
            ReplaceSelectedCodeAgent,
            ModifyStoredCodeAgent
        ])
    };

    constructor(arg1 : string, arg2 : string | null, boss: Agent|null, context: vscode.ExtensionContext, progressWindow : ProgressWindow) {
        super(arg1, arg2, boss, context, progressWindow);   
        this.ai_prompt_service = new AIPromptService(this.context);
    }

    purpose() : string {
        return `${this.arg1}`;
    }

    async execute_impl() : Promise<AgentStatusReport> {

        let currentMinionIndex = 0;
        
        while(true) {
            
            // Use this knowledge to create a new plan to finish executing the goal
            const newMinions = await this.createPlan();
            if (this.isFailure(newMinions)) {
                return { state: newMinions };
            }
            
            // If there is nothing left to be done, finish.
            if (newMinions.length == 0) {
                break;
            }

            // Replace the rest of the plan with the revised plan
            this.minions.splice(currentMinionIndex, this.minions.length - (currentMinionIndex + 1), ...newMinions);

            // Get the first new minion
            const currentMinion = this.minions.at(currentMinionIndex)!;

            // Execute it
            await this.async_progress(() => currentMinion.execute(), currentMinion.purpose());

            if (currentMinion.status.state == 'UserCancelled') {
                return { state: 'UserCancelled' };
            }            

            // Absorb any knowledge it gathered
            const relevantKnowledgeFromMinion = await this.askAIToSelectKnowledgeFromMinion(currentMinion);
            if (this.isFailure(relevantKnowledgeFromMinion)) {
                return { state: relevantKnowledgeFromMinion };
            }

            // TODO: knowledge rectification when keys overlap?  Should probably do that in batch. For now, just prefer minion knowledge.
            this.mergeInKnowledge(relevantKnowledgeFromMinion)

            // Move to the next minion
            currentMinionIndex += 1;
        }

        try {
            await this.performOwnWork();
            return  { state: 'Finished', message: `Successfully achieved goal of "${this.arg1}$` };
        }
        catch (exception) {
            return { state: 'FailedUnspecifiedError', message: `Failed goal of "${this.arg1}" because of unspecified error`, debug: exception }
        }
    }

    private async selectPlanningKnowledge() : Promise<string[]|AIResponseError> {

        const knowledgeSelector = new KnowledgeSelector(this.context);
        const myAndBossKnowledge = knowledgeSelector.getAgentAndBossKnowledge(this);

        if (myAndBossKnowledge.size) {
            // Ask AI to select relevant knowledge foir planning purposes
            const knowledgeSelector = new KnowledgeSelector(this.context);
            const promptForSelectingKnowledgeForPlanning = [
                `You have been asked to: ${this.purpose()}.`,
                `Pick the knowledge relevant to this goal."`
            ];
            const selectedKnowledgeForPlanning = await knowledgeSelector.selectRelevantKnowledgeUsingAI(promptForSelectingKnowledgeForPlanning, myAndBossKnowledge);
            if (this.isFailure(selectedKnowledgeForPlanning)) {
                return selectedKnowledgeForPlanning;
            }
            return knowledgeSelector.renderAsQnAItems(selectedKnowledgeForPlanning);
        }
        else {
            return [];
        }
    }

    hierarchicalGoalDescription() : string[] {
        let currentAgent = this.boss;
        const lines = [ `The reason for what you are doing is as follows:`]
        while(currentAgent) {
            const inOrderToGoal = (currentAgent as GoalPlanningAgent).arg1!;
            lines.push(`- In order to: ${inOrderToGoal}`);
            currentAgent = currentAgent.boss;
        }
        return lines;
    }

    // Creates new minions needed to execute complex work.
    async createPlan() : Promise<Array<Agent>|AIResponseError> {

        // Create descriptions of work done thus far (completed minions)
        const alreadyFinishedMinions = this.minions.filter(m => m.status.state == 'Finished');
        const completedWorkDescriptions = alreadyFinishedMinions.map(m => `- Finished and complete: "${m.purpose()}"`);
        
        const knowledgeForPlanning = await this.selectPlanningKnowledge();
        if (this.isFailure(knowledgeForPlanning)) {
            return knowledgeForPlanning;
        }

        // Describe available response options
        const nodeMetadata = (this.constructor as any).nodeMetadata() as NodeMetadata;
        const grammarDescriptionsForPrompt = nodeMetadata.agentPalette.map(agentKlass => agentKlass.nodeMetadata().renderGrammarForPrompt())
        const bulletedActionsListForPrompt = grammarDescriptionsForPrompt.map(description => "- " + description);


        
        // Build a prompt telling the AI what has been done thus far, what knowledge it has, and what it can do to re-plan the next steps
        const planningPromptLines = [
            `You are an LLM agent which has the ability to issue commands to another LLM agent, a development environment, and a user through a series of commands.`,
            `Some of these commands write to or read from a memory bank.  Items in the memory bank can be accessed by key.`,
            `You may also be told what steps have already been succesfully completed.  Do not include steps that do not need to be repeated if they have already been successfully completed.`,
            `You have been asked create a logical, step-by-step plan to "${this.purpose()}".`,
            ...(this.boss ? this.hierarchicalGoalDescription() : []),
            `The plan consists of a series of commands which are described below.  The placeholder arguments are formatted like <this> and are to be replaced with values of your choosing.`,            
            ...(completedWorkDescriptions.length ? [`Some work has already been completed`, `This is the list of steps that have already been completed:`, ...completedWorkDescriptions] : []),
            ...( knowledgeForPlanning.length ? [`And this is some relevant knowledge from the memory bank:`, ...knowledgeForPlanning ] : []),
            `In order to finish, you can create a series of commands in the following formats:`,
            ...bulletedActionsListForPrompt,
            `Please create your plan by creating a list of commands using the format above.`,
            `When you write a command, substitute values of your choosing for each placeholder values (placeholder values look like this: <placeholder-value>)`,
            `Start each new command on a new line with just the command.`,
            `Be methodical and go step-by-step. Do not use memory location keys if they have not had contents stored in them by a prior step.`,
            `Do not include commands if you do not have enough information to completely specify all of their arguments`,
            `If you would like to refuse, respond on a single line with: REFUSE`,
            `If achieving the goal is impossible using the above commands, respond on a single line with: IMPOSSIBLE`,
            `If the goal has already been achieved, response on a single line with: ACHIEVED`
        ];
        const planningPrompt = planningPromptLines.join("\n");

        console.debug(planningPrompt);

        // Get a response from the AI for the planning prompt we made
        const no_context = new Map<string,string>();
        const response = await this.ai_prompt_service.getAIResponse(null, planningPrompt, no_context);
        if (this.isFailure(response)) {
            return response;
        }

        console.debug(response);

        // Parse the response into new minions
        const grammars = nodeMetadata.agentPalette.map(agentKlass => agentKlass.nodeMetadata().grammar);
        const parser = new AICommandParser(grammars);
        const parsedResponses = parser.parse_commands(response.response);
        const minions = []
        for (const parsedResponse of parsedResponses) {
            const agentClass = nodeMetadata.getAgentCtor(parsedResponse.verb);
            if (agentClass) {
                const agent = new agentClass(parsedResponse.arg1, parsedResponse.arg2, this, this.context, this.progressWindow);
                minions.push(agent)
            }
        }

        // Return 'em
        return minions;
    }

    // the planning agent is a delegator, rather than a worker.
    async performOwnWork() : Promise<undefined> {
        return;
    }

    // ask the AI which information to share with the minion.
    async askAIToSelectKnowledgeFromMinion(minion : Agent) : Promise<QuestionsAndAnswers|AIResponseError> {

        const promptPreambleLines = [
            `You have been asked to "${this.purpose()}".`,
            `In order to achieve this goal, you have delegated to someone else to "${minion.purpose()}"`,
            `Now, they have completed their work.`,
            `They are reporting all knowledge they have gathered in a numbered list.`,
        ];

        const knowledgeSelector = new KnowledgeSelector(this.context);
        const selectedKnowledge = await knowledgeSelector.selectRelevantKnowledgeUsingAI(promptPreambleLines, minion.knowledge);
        return selectedKnowledge;
    }
}