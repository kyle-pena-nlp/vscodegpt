import * as vscode from 'vscode';
import { Agent, AgentStatusReport, NodeMetadata } from "./agent";
import { Workspace, WorkspacePathFailureReason, fromWorkspaceRelativeFilepath, isInvalidWorkspace } from "./workspace";
import { ProgressWindow } from './progress_window';
import { AIPromptService, AIResponseError } from './ai_prompt_service';
import { GoalPlanningAgent } from './goal_planning_agent';
import { ReadFileAgent } from './read_file_agent';
import { AICommandParser } from './ai_command_parser';
import { AICommand } from './ai_com_types';

class AnalyzeFileAgent extends Agent {

    private ai_prompt_service : AIPromptService;

    constructor(arg1 : string|null, arg2 : string|null, arg3 : string|null, boss: Agent|null, context: vscode.ExtensionContext, progressWindow: ProgressWindow) {
        // arg1: workspace root relative filepath
        // arg2: memory location key for answer
        // arg3: what is the question
        super(arg1, arg2, arg3, boss, context, progressWindow);
        this.ai_prompt_service = new AIPromptService(this.context);
    }

    purpose(): string {
        return `Answer this question about the file '{this.arg1}': '${this.arg3}', and store the answer in memory bank location '{this.arg2}'`;
    }

    async execute_impl(): Promise<AgentStatusReport> {

        // workspace-root relative filepath
        if (!this.arg1) {
            return { state: 'FailedMissingArgument' };
        }

        // memory location key to store code
        if (!this.arg2) {
            return  { state: 'FailedMissingArgument' };
        }

        // memory location key to store analysis
        if (!this.arg3) {
            return { state: 'FailedMissingArgument' };
        }

        const relativeFsPath = this.arg1!;
        const analysisQuestion = this.arg3!;
        const destMemoryLocationKey = this.arg2!;
        

        const fileContents = await this.readFile(this.arg1);
        if (isInvalidWorkspace(fileContents)) {
            return { state: 'FailedInvalidWorkspace' };
        }
        if (!fileContents) {
            return { state: 'FailedInvalidArgument' };
        }

        const dependencyQuestions = await this.gatherDependencyQuestions(relativeFsPath, analysisQuestion, fileContents);
        if (this.isFailure(dependencyQuestions)) {
            return { state: dependencyQuestions };
        }
        for (const dependencyQuestion in dependencyQuestions) {
            //this.answerQuestionAboutDependency(dependencyQuestion);
        }

        //const answer = this.answerQuestionAboutFileContents(analysisQuestion, fileContents);

        //this.storeKnowledgeItem(destMemoryLocationKey, answer);

        return {
            state: 'Finished'
        };
    }

    private async answerQuestionAboutDependency(dependencyQuestion: AICommand) {
        
    }

    private async gatherDependencyQuestions(relativeFsPath : string, question : string, fileContents : string) : Promise<AIResponseError|AICommand[]> {
        const promptLines = [
            `In order to answer this question about the file '${relativeFsPath}': '${question}'`,
            `please list any dependencies that are absolutely necessary to answer this question.`,
            `When you list a dependency, following this format: DEPENDENCY <dependency-type> "<dependency-location>" "<reason>"`,
            `The value for <dependency-type> is either: FIRST-PARTY, THIRD-PARTY or FIRST-OR-THIRD-PARTY.`,
            `1. Use FIRST-PARTY when the dependency is a local resource (for example, if it is located in another file in the current workspace).`,
            `2. Use THIRD-PARTY when the dependency is a package or library or similar resource which is not located as code in the current workspace`,
            `3. Use FIRST-0R-THIRD-PARTY if it is not clear from context whether the dependency should be FIRST-PARTY or THIRD-PARTY`,
            `The value of <dependency-location> is either`,
            `1. A workspace-root relative file location of the depedendency, if FIRST-PARTY`,
            `2. The name of a library or package or similar resource, if THIRD-PARTY`,
            `3. '?' if the FIRST-OR-THIRD-PARTY`,
            `The value of <reason> is what about the dependency that needs to be known in order to answer the question about '${relativeFsPath}'`,
            `When you respond, list one dependency per line, and start each line with the word DEPENDENCY, not a number or a bullet or anything else.`,
        ];
        const prompt = promptLines.join('\n');
        const context_items = new Map<string,string>();
        const response = await this.ai_prompt_service.getAIResponse(null, prompt, context_items);
        // TODO: if token limited, fall back on selective summarization scheme
        if (this.isFailure(response)) {
            return response;
        }
        const grammar = [ "DEPENDENCY", "<quoted-string>", "<quoted-string>", "<until-EOL>"];
        const parser = new AICommandParser([grammar]);
        const commands = parser.parse_commands(response.response);
        const invalidCommands = commands.filter(c => c.verb != "DEPENDENCY");
        console.debug(invalidCommands);
        return commands;
    }

    protected shareKnowledgeWithBoss_impl(): void {
        this.boss!.mergeInKnowledge(this.selectKnowledge([this.arg2!]))
    }
    
    private async readFile(arg1: string) : Promise<string|WorkspacePathFailureReason|null> {
        try {
            const fsPath = fromWorkspaceRelativeFilepath(arg1);
            if (isInvalidWorkspace(fsPath)) {
                return fsPath;
            }
            const uri = vscode.Uri.file(fsPath);
            const fileBytes = await vscode.workspace.fs.readFile(uri);
            const fileText = new TextDecoder().decode(fileBytes);
            return fileText;
        }
        catch(exception) {
            return null;
        }
    }

    triggersReplan(): boolean {
        return true;
    }    
}