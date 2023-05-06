const path = require('path');
import * as vscode from 'vscode';
import { WorkspaceConfiguration } from "./workspace_configuration";
import { AICommand, HasID } from './ai_com_types';
import { AISummarizationService } from './ai_summarization_service';
import { Workspace } from './workspace';
import { AIPromptService } from './ai_prompt_service';
import { ProgressWindow } from "./progress_window";
import { PROMPTS } from './prompts';

interface Advice extends HasID {
  advice: string
};

class ReplaceSelectionCommandWorkflow {

  private ai_prompt_service : AIPromptService;
  private ai_summarization_service : AISummarizationService;
  private progressWindow : ProgressWindow;

  constructor(ai_prompt_service : AIPromptService, ai_summarization_service : AISummarizationService, progressWindow : ProgressWindow) {
    this.ai_prompt_service = ai_prompt_service;
    this.ai_summarization_service = ai_summarization_service;
    this.progressWindow = progressWindow;
  }

  async run(userCommand : string, context : Map<string,string>) : Promise<string|undefined|'UserCancelled'> {
    const commands = await this.progressWindow.wrapAsync("Generating code", () => this.ai_prompt_service.getCommandResponse("WRITE_CODE", userCommand, PROMPTS, context));
    if (commands == 'UserCancelled') {
      return 'UserCancelled'
    }
    if (!commands) {
      return;
    }
    const codeResponse = commands.filter(command => command.verb == "BEGINCODE")?.[0];
    if (!codeResponse) {
      return;
    }
    const code = codeResponse.arg1;
    if (!code) {
      return;
    }
    return code;
  }
}

export class AIUserCommandHandler {

    private workspace_configuration : WorkspaceConfiguration;
    private ai_summarization_service : AISummarizationService;
    private ai_prompt_service : AIPromptService;
    private workspace : Workspace;

    constructor(context : vscode.ExtensionContext) {
        this.workspace_configuration = new WorkspaceConfiguration(context);
        this.ai_summarization_service = new AISummarizationService(context);
        this.ai_prompt_service = new AIPromptService(context);
        this.workspace = new Workspace();
    }

    async giveSelectionCommand() {
      
      // Verify there is actually text selected
      const selection = this.getCurrentSelection();
      if (!selection) {
        return;
      }
      
      // Ask the user for directions
      const userCommand = await this.promptUserForCommand("Give the AI a command", "Tell me what to do.", "Write a function that...");
      if (!userCommand) {
        return;
      }

      // Update the context
      const context = new Map<string,string>();
      this.addSelectedTextToContext(context);

      // Ask the AI for a replacement (cancellable)
      const progressWindow = new ProgressWindow("Replacing selection...");
      const generatedText = await progressWindow.wrapAsync(`Getting replacement from AI`, () => this.getGeneratedTextForOpenEditor(userCommand, context, progressWindow))
      progressWindow.close();
      if (!generatedText) {
        return;
      }

      // Replace the selection in the text editor
      this.replaceSelection(generatedText, selection);

    }

    private addSelectedTextToContext(context : Map<string,string>) {
      const selectedText = this.getSelectedText();
      if (!selectedText) {
        return;
      }
      context.set("Code You Are Replacing", selectedText);
    }

    private getCurrentSelection() {
      const textEditor = vscode.window.activeTextEditor;
      if (!textEditor) {
        return null;
      }
      return textEditor.selection;
    }

    private async replaceSelection(generatedText : string, selection : vscode.Selection) {
      const textEditor = vscode.window.activeTextEditor;
      if (!textEditor) {
          return null;
      }
      await textEditor.edit(editBuilder => {
        editBuilder.replace(selection, generatedText);
      });      
    }

    private async buildContextForOpenEditor(context : Map<string,string>) {
      await this.addExtensionOfFileForOpenEditor(context);
      await this.possiblySummarizeCurrentFileContents(context);
      //await this.addPreviousAndNextPartsOfSelectedLines(context);
      await this.addPreviousAndNextLinesOfCode(context);
    }

    private async addExtensionOfFileForOpenEditor(context : Map<string,string>) {
      const uri = await this.getCurrentEditorUri();
      if (!uri) {
        return;
      }
      const extname = path.extname(uri.path);
      context.set("Current File Extension", extname);
    }

    private async possiblySummarizeCurrentFileContents(context : Map<string,string>) {
      const text = this.getCurrentEditorText();
      const uri = await this.getCurrentEditorUri();
      if (!text) {
        return;
      }
      if (!uri) {
        return;
      }
      const summary = await this.ai_summarization_service.getOrMakeCachedEditorContentsSummary(text, uri);
      if (summary) {
        context.set("Summary of other contents in file, strictly for informative purposes", summary);
      }
    }

    private async addPreviousAndNextLinesOfCode(context : Map<string,string>) {
    
      const positions = await this.getStartAndEndPosition();
      if (!positions) {
        return;
      }
      
      const [startPos, endPos] = positions;

      const textEditor = vscode.window.activeTextEditor;
      if (!textEditor) {
        return null;
      }

      let startLine = startPos.line;
      while (startLine >= 0) {
        const line = textEditor.document.lineAt(startLine);
        if (!line.isEmptyOrWhitespace) {
          
          context.set("Previous Line of Code", line.text);
          break;
        }
        startLine--;
      }

      
      let endLine = endPos.line;
      while (endLine < textEditor.document.lineCount) {
        const line = textEditor.document.lineAt(endLine);
        if (!line.isEmptyOrWhitespace) {
          context.set("Next Line of Code", line.text);
          break;
        }
        endLine++;
      }
    }

    private async getStartAndEndPosition() {
      const currentSelection = await this.getCurrentSelection();
      const cursorPosition = await this.getCurrentCursorPosition();
      if (currentSelection) {
        return [currentSelection.start, currentSelection.end]
      }
      else if (cursorPosition) {
        return [cursorPosition, cursorPosition];
      }
      else {
        return null;
      }
    }

    private getCurrentEditorText() {
      const textEditor = vscode.window.activeTextEditor;
      if (!textEditor) {
          return null;
      }
      return textEditor.document.getText();
    }

    private async getGeneratedTextForOpenEditor(userCommand : string, context : Map<string,string>, progressWindow : ProgressWindow) {
      if (!userCommand) {
        return;
      }
      if (!vscode.window.activeTextEditor) {
        return;
      }
      await this.buildContextForOpenEditor(context);
      const generatedText = await new ReplaceSelectionCommandWorkflow(this.ai_prompt_service, this.ai_summarization_service, progressWindow).run(userCommand, context);
      return generatedText;     
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
      const context = new Map<string,string>();
      const currentPosition = await this.getCurrentCursorPosition();
      if (!currentPosition) {
        return;
      }
      const userCommand = await this.promptUserForCommand("Give the AI a command", "Tell me what to do", "Write a function that adds two numbers");
      if (!userCommand) {
        return;
      }
      const progressWindow = new ProgressWindow("Generate code");
      const generatedText = await this.getGeneratedTextForOpenEditor(userCommand, context, progressWindow);
      if (!generatedText) {
        return;
      }
      this.insertTextAtCurrentPosition(generatedText, currentPosition);
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

    private async getCurrentEditorUri() : Promise<vscode.Uri|null> {
      const textEditor = vscode.window.activeTextEditor;
      if (!textEditor) {
          return null;
      }
      return textEditor.document.uri;
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
        const result = await vscode.window.showInputBox({ 
            title : title || defaultTitle, 
            prompt: prompt || defaultPrompt, 
            placeholder : placeholder || defaultPlaceholder, 
            ignoreFocusOut: false, 
            validateInput: validateInput } as vscode.InputBoxOptions);
        return result
    }

    
}