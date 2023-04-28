import * as vscode from 'vscode';
import { CONSTANTS } from './constants';
import { WorkspaceConfiguration } from './workspace_configuration';
import { maybe_do_first_run } from './first_run';
import { BackgroundProcess } from './background_process';
import { AIUserCommandHandler } from './ai_user_command_handler';

const logExceptions = (fn: (...args : any[]) => Promise<void>) => async (...args : any[]) => {
  try {
    await fn(...args);
  } catch (error) {
    console.error('An error occurred:', error);
  }
};

// I give you fire.
export async function activate(context: vscode.ExtensionContext) {

    const workspace_configuration = new WorkspaceConfiguration(context);


    let startAIassistantCommand = vscode.commands.registerCommand(`${CONSTANTS.extname}.startAIassistant`, logExceptions(async () => {
      //ai_assistant_worker_background_process.start();
    }));    

    let stopAIassistantCommand = vscode.commands.registerCommand(`${CONSTANTS.extname}.stopAIassistant`, logExceptions(async () => {
      //await ai_assistant_worker_background_process.stop();
    }));        

    // Let the user pcik the preferred model
    let pickModelCommand = vscode.commands.registerCommand(`${CONSTANTS.extname}.pickModel`, logExceptions(async () => {
      const selectedModel = await vscode.window.showQuickPick(CONSTANTS.models, { placeHolder: `Pick your preferred AI model.  ${CONSTANTS.recommendedModel} recommended.` } as vscode.QuickPickOptions);
      if (selectedModel) {
        workspace_configuration.set_AI_model(selectedModel);
      }
    }));
    
    // idea: recently issued commands show up as context menu items

    const userCommandHandler = new AIUserCommandHandler(context);

    let giveFolderCommandCommand = vscode.commands.registerCommand(`${CONSTANTS.extname}.giveFolderCommand`, logExceptions(async (uri) => {
        console.debug(uri);
        await userCommandHandler.giveFolderCommand(uri);
    }));

    let addFolderAdviceCommand = vscode.commands.registerCommand(`${CONSTANTS.extname}.addFolderAdvice`, logExceptions(async (uri) => {
      await userCommandHandler.addFolderAdvice(uri);
    }));

    let refreshFolderSummaryCommand = vscode.commands.registerCommand(`${CONSTANTS.extname}.refreshFolderSummary`, logExceptions(async (uri) => {
      await userCommandHandler.refreshFolderSummary(uri);
    }));    


    let giveFileCommandCommand = vscode.commands.registerCommand(`${CONSTANTS.extname}.giveFileCommand`, logExceptions(async (uri) => {
      await userCommandHandler.giveFileCommand(uri);
    }));

    let addFileAdviceCommand = vscode.commands.registerCommand(`${CONSTANTS.extname}.addFileAdvice`, logExceptions(async (uri) => {
      await userCommandHandler.addFileAdvice(uri);
    }));

    let refreshFileSummaryCommand = vscode.commands.registerCommand(`${CONSTANTS.extname}.refreshFileSummary`, logExceptions(async (uri) => {
      await userCommandHandler.refreshFileSummary(uri);
    })); 
    

    let giveEditorCommandCommand = vscode.commands.registerCommand(`${CONSTANTS.extname}.giveEditorCommand`, logExceptions(async () => {
      await userCommandHandler.giveEditorCommand();
    }));

    let addEditorAdviceCommand = vscode.commands.registerCommand(`${CONSTANTS.extname}.addEditorAdvice`, logExceptions(async () => {
      await userCommandHandler.addEditorAdvice();
    }));

    let refreshEditorSummaryCommand = vscode.commands.registerCommand(`${CONSTANTS.extname}.refreshEditorSummary`, logExceptions(async () => {
      await userCommandHandler.refreshEditorSummary();
    }));   


    let giveSelectionCommandCommand = vscode.commands.registerCommand(`${CONSTANTS.extname}.giveSelectionCommand`, logExceptions(async () => {
      await userCommandHandler.giveSelectionCommand();
    }));

  
  context.subscriptions.push(startAIassistantCommand);
  context.subscriptions.push(stopAIassistantCommand);
	context.subscriptions.push(pickModelCommand);

  context.subscriptions.push(giveFolderCommandCommand);
  context.subscriptions.push(addFolderAdviceCommand);
  context.subscriptions.push(refreshFolderSummaryCommand);

  context.subscriptions.push(giveFileCommandCommand);
  context.subscriptions.push(addFileAdviceCommand);
  context.subscriptions.push(refreshFileSummaryCommand);  

  context.subscriptions.push(giveEditorCommandCommand);
  context.subscriptions.push(addEditorAdviceCommand);
  context.subscriptions.push(refreshEditorSummaryCommand);    

  context.subscriptions.push(giveEditorCommandCommand);


  maybe_do_first_run(context);

}

// This method is called when your extension is deactivated
export function deactivate() {}
