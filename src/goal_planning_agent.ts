import * as vscode from 'vscode';
import { AIPromptService, AIResponseError } from "./ai_prompt_service";
import { Agent, AgentStatusReport, NodeMetadata } from "./agent"
import { ProgressWindow } from "./progress_window";
import { AICommandParser } from "./ai_command_parser";


// An agent which forms plans
class GoalPlanningAgent extends Agent {

    private ai_prompt_service : AIPromptService;

    static nodeMetadata() : NodeMetadata {
        return new NodeMetadata(
            ["GOAL", "<until-EOL>"], 
            ["GOAL", "sub-goal description"], 
            "Create a sub-goal as part of a complex plan",
        [
            GoalPlanningAgent,
            ReadFileAgent, 
            GetFilepathOfActiveEditorAgent,
            GetDirectoryStructureAgent,
            RequestClarificationAgent,
            ReadCurrentlySelectedTextInActiveEditorAgent,
            WriteCodeAgent,

            /*
            ReplaceCurrentSelectionAgent,
            InsertAtCursorPositionAgent */
        ])
    };

    constructor(arg1 : string, arg2 : string, boss: Agent, context: vscode.ExtensionContext, progressWindow : ProgressWindow) {
        super(arg1, arg2, boss, context, progressWindow);   
        this.ai_prompt_service = new AIPromptService(this.context);
    }

    purpose() : string {
        return `Fulfill goal: "${this.arg1}"`;
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
            await currentMinion.execute();

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

    // Creates new minions needed to execute complex work.
    async createPlan() : Promise<Array<Agent>|AIResponseError> {

        // Create descriptions of work done thus far (completed minions)
        const alreadyFinishedMinions = this.minions.filter(m => !m.notStarted());
        const completedWorkDescriptions = alreadyFinishedMinions.map(m => `- ${m.status}: "${m.purpose()}"`);

        // Ask AI to select relevant knowledge foir planning purposes
        const knowledgeSelector = new KnowledgeSelector(this.context);
        const promptForSelectingKnowledgeForPlanning = [
            `You have been asked to "${this.purpose()}".`,
            `In order to achieve this goal, you are gathering knowledge from others."`,
            `The knowledge available to you has been gathered into a numbered list.`,
        ];
        const selectedKnowledgeForPlanning = await knowledgeSelector.selectRelevantKnowledgeUsingAI(promptForSelectingKnowledgeForPlanning, knowledgeSelector.getAgentAndBossKnowledge(this));
        if (this.isFailure(selectedKnowledgeForPlanning)) {
            return selectedKnowledgeForPlanning;
        }

        const knowledgeList = knowledgeSelector.renderAsQnAItems(selectedKnowledgeForPlanning);

        // Describe available response options
        const nodeMetadata = (this.constructor as any).nodeMetadata() as NodeMetadata;
        const grammarDescriptionsForPrompt = nodeMetadata.agentPalette.map(agentKlass => agentKlass.nodeMetadata().renderGrammarForPrompt())
        const bulletedActionsListForPrompt = grammarDescriptionsForPrompt.map(description => "- " + description);
        
        // Build a prompt telling the AI what has been done thus far, what knowledge it has, and what it can do to re-plan the next steps
        const planningPromptLines = [
            `You have been asked to create a plan to "${this.purpose()}".`,
            `This is what has been done so far:`,
            ...completedWorkDescriptions,
            `And this is what you know in a question and answer format:`,
            ...knowledgeList,
            `In order to finish your goal, you have the following actions available to you:`,
            ...bulletedActionsListForPrompt,
            `Please generate a list of actions to finish the work, one per line, using the formats described.`,
            `If you would like to refuse, respond on a single line with: REFUSE`,
            `If achieving the goal is impossible using the above commands, respond on a single line with: IMPOSSIBLE`
        ];
        const planningPrompt = planningPromptLines.join("\n");

        // Get a response from the AI for the planning prompt we made
        const no_context = new Map<string,string>();
        const response = await this.ai_prompt_service.getAIResponse(null, planningPrompt, no_context);
        if (this.isFailure(response)) {
            return response;
        }

        // Parse the response into new minions
        const grammars = nodeMetadata.agentPalette.map(agentKlass => agentKlass.nodeMetadata().grammar);
        const parser = new AICommandParser(grammars);
        const parsedResponses = parser.parse_commands(response);
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