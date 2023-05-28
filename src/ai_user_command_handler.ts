const path = require('path');
import * as vscode from 'vscode';
import { WorkspaceConfiguration } from "./workspace_configuration";
import { AICommand, HasID } from './ai_com_types';
import { AISummarizationService } from './ai_summarization_service';
import { Workspace, toWorkspaceRelativeFilepath, isInvalidWorkspace } from './workspace';
import { AIPromptService } from './ai_prompt_service';
import { ProgressWindow } from "./progress_window";
import { PROMPTS } from './prompts';
import { Agent } from './agent';
import { GoalPlanningAgent } from './goal_planning_agent';
import { CONSTANTS } from "./constants";

interface Advice extends HasID {
  advice: string
};

export class AIUserCommandHandler {
    showAICommandPanel() {
      throw new Error('Method not implemented.');
    }
    makeSelectionRecommendations() {
      throw new Error('Method not implemented.');
    }
    analyzeSelection() {
      throw new Error('Method not implemented.');
    }
    makeEditorRecommendations() {
      throw new Error('Method not implemented.');
    }
    analyzeEditor() {
      throw new Error('Method not implemented.');
    }
    makeFileRecommendations(uri: any) {
      throw new Error('Method not implemented.');
    }
    analyzeFile(uri: any) {
      throw new Error('Method not implemented.');
    }
    makeFolderRecommendations(uri: any) {
      throw new Error('Method not implemented.');
    }
    analyzeFolder(uri: any) {
      throw new Error('Method not implemented.');
    }

    private workspace_configuration : WorkspaceConfiguration;
    private ai_summarization_service : AISummarizationService;
    private ai_prompt_service : AIPromptService;
    private workspace : Workspace;
    private context: vscode.ExtensionContext;

    constructor(context : vscode.ExtensionContext) {
        this.workspace_configuration = new WorkspaceConfiguration(context);
        this.ai_summarization_service = new AISummarizationService(context);
        this.ai_prompt_service = new AIPromptService(context);
        this.workspace = new Workspace();
        this.context = context;
    }

    async giveSelectionCommand() : Promise<undefined> {
      try {
        const goal = await this.promptUserForCommand("Tell me what to do", "How should I change this code?", "Add more comments");
        if (!goal) {
          return;
        }


        const progressWindow = new ProgressWindow("Replacing selected code");
        const goalPrompt = "The user would like you to replace the currently selected code with modified code.  This is how they would like you to modify the code: '" + goal + "'";
        const replaceCodePlanningAgent = new GoalPlanningAgent(goalPrompt, null, null, null, this.context, progressWindow);
        const activeEditorFilepath = await this.getCurrentEditorUri();
        if (!activeEditorFilepath) {
          return;
        }
        const fsPath = toWorkspaceRelativeFilepath(activeEditorFilepath.fsPath);
        
        const currentlySelectedCode = this.getSelectedText();
        if (!currentlySelectedCode) {
          return;
        }

        replaceCodePlanningAgent.mergeInKnowledge(new Map<string,string>([
          ["What is the filename that contains currently selected code?", fsPath],
          ["What is the currently selected code?", currentlySelectedCode]
        ]))
        await replaceCodePlanningAgent.execute()
      }
      catch (exception) {
        return;
      }
    }


    async refreshEditorSummary() {
      throw new Error('Method not implemented.');
    }

    async addEditorAdvice() {
      const uri = await this.getCurrentEditorUri();
      if (!uri) {
        return;
      }
      const fsPath = this.workspace.makeUriRelativeToWorkspaceRoot(uri);
      const advice = await this.promptUserForCommand("Advice to AI", "Enter your advice", "Write code with plenty of comments");
      const adviceObj = {
        id : fsPath,
        advice : advice
      } as Advice;
      this.workspace_configuration.add_to_workspace_by_id<Advice>("advice", adviceObj);
    }
    
    async giveEditorCommand() {
      try {
        const goal = await this.promptUserForCommand("Tell me what to do", "What could should I write?", "Write a function that adds togther two numbers");
        if (!goal) {
          return;
        }
        const progressWindow = new ProgressWindow("Inserting code at current position");
        const replaceCodePlanningAgent = new GoalPlanningAgent(goal, null, null, null, this.context, progressWindow);
        await replaceCodePlanningAgent.execute()
      }
      catch (exception) {
        return;
      }
    }

    async refreshFileSummary(uri : vscode.Uri) {
      throw new Error('Method not implemented.');
    }

    async addFileAdvice(uri : vscode.Uri) {
      throw new Error('Method not implemented.');
    }

    async giveFileCommand(uri : vscode.Uri) {
      throw new Error('Method not implemented.');
    }

    async refreshFolderSummary(uri : vscode.Uri) {
      throw new Error('Method not implemented.');
    }

    async addFolderAdvice(uri : vscode.Uri) {
      throw new Error('Method not implemented.');
    }

    async giveFolderCommand(uri : vscode.Uri) {
      throw new Error('Method not implemented.');
    }

    async setApiKey() {
      const looksLikeOpenAIApiKey = (input : string) => {
        input = input.trim();
        if (input.length == 0) {
          return "Must be non-empty";
        }
        if (input.length == 0) {
          return "Must be non-empty";
        }
        if (!(input.startsWith("sk-") || input.startsWith("pk-"))) {
          return "OpenAI API Keys start with sk- or pk-"
        }        
      }
      this.showInputBox("OpenAI API Key", "Enter an Open API Key", "", looksLikeOpenAIApiKey).then((apiKey) => {
        if (apiKey) {
          this.workspace_configuration.set_apiKey(apiKey);
        }
      })
    }

    async pickModel() {
      const selectedModel = await vscode.window.showQuickPick(CONSTANTS.models, { placeHolder: `Pick your preferred AI model.  ${CONSTANTS.recommendedModel} recommended.` } as vscode.QuickPickOptions);
      if (selectedModel) {
        this.workspace_configuration.set_AI_model(selectedModel);
      }
    }

    private async getCurrentEditorUri() : Promise<vscode.Uri|null> {
      const textEditor = vscode.window.activeTextEditor;
      if (!textEditor) {
          return null;
      }
      return textEditor.document.uri;
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

    private async promptUserForCommand(title? : string|null, prompt? : string|null, placeholder? : string|null) : Promise<string|undefined> {
        const validateInput = (input : string) => {
            if (!input.trim()) {
                return "No command entered."
            }
        }
        const defaultTitle = "Give the AI a command."
        const defaultPrompt = "Tell me what to do."
        const defaultPlaceholder = "Write a function that..."
        const result = this.showInputBox(
          title || defaultTitle, 
          prompt || defaultPrompt, 
          placeholder || defaultPlaceholder, 
          validateInput);
        return result
    }

    private async showInputBox(title : string, prompt : string, placeholder : string, validateInput : (input: string) => string|undefined) {
      const result = await vscode.window.showInputBox({ 
          title : title, 
          prompt: prompt, 
          placeholder : placeholder, 
          ignoreFocusOut: false, 
          validateInput: validateInput } as vscode.InputBoxOptions);
      return result
    }
}