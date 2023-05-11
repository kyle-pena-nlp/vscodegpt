import * as vscode from 'vscode';
import { CONSTANTS } from './constants';
import { WorkspaceConfiguration } from './workspace_configuration';
import { maybeDoFirstRun, resetIsFirstRun, viewWelcomeScreen } from './first_run';
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

    // idea: recently issued commands re-appear up as context menu items?

    const userCommandHandler = new AIUserCommandHandler(context);

    // Let the user pcik the preferred model
    const pickModelCommand = vscode.commands.registerCommand(`${CONSTANTS.extname}.pickModel`, logExceptions(async () => {
      await userCommandHandler.pickModel();
    }));
    const giveFolderCommandCommand = vscode.commands.registerCommand(`${CONSTANTS.extname}.giveFolderCommand`, logExceptions(async (uri) => {
        console.debug(uri);
        await userCommandHandler.giveFolderCommand(uri);
    }));
    const analyzeFolderCommand = vscode.commands.registerCommand(`${CONSTANTS.extname}.analyzeFolder`, logExceptions(async (uri) => {
      await userCommandHandler.analyzeFolder(uri);
    })); 
    const makeFolderRecommendationsCommand = vscode.commands.registerCommand(`${CONSTANTS.extname}.makeFolderRecommendations`, logExceptions(async (uri) => {
      await userCommandHandler.makeFolderRecommendations(uri);
    })); 


    const giveFileCommandCommand = vscode.commands.registerCommand(`${CONSTANTS.extname}.giveFileCommand`, logExceptions(async (uri) => {
      await userCommandHandler.giveFileCommand(uri);
    }));
    const analyzeFileCommand = vscode.commands.registerCommand(`${CONSTANTS.extname}.analyzeFile`, logExceptions(async (uri) => {
      await userCommandHandler.analyzeFile(uri);
    }));     
    const makeFileRecommendationsCommand = vscode.commands.registerCommand(`${CONSTANTS.extname}.makeFileRecommendations`, logExceptions(async (uri) => {
      await userCommandHandler.makeFileRecommendations(uri);
    })); 
    

    const giveEditorCommandCommand = vscode.commands.registerCommand(`${CONSTANTS.extname}.giveEditorCommand`, logExceptions(async () => {
      await userCommandHandler.giveEditorCommand();
    }));
    const analyzeEditorCommand = vscode.commands.registerCommand(`${CONSTANTS.extname}.analyzeEditor`, logExceptions(async () => {
      await userCommandHandler.analyzeEditor();
    })); 
    const makeEditorRecommendationsCommand = vscode.commands.registerCommand(`${CONSTANTS.extname}.makeEditorRecommendations`, logExceptions(async () => {
      await userCommandHandler.makeEditorRecommendations();
    }));       


    const giveSelectionCommandCommand = vscode.commands.registerCommand(`${CONSTANTS.extname}.giveSelectionCommand`, logExceptions(async () => {
      await userCommandHandler.giveSelectionCommand();
    }));
    const analyzeSelectionCommand = vscode.commands.registerCommand(`${CONSTANTS.extname}.analyzeSelection`, logExceptions(async () => {
      await userCommandHandler.analyzeSelection();
    }));
    const makeSelectionRecommendationsCommand = vscode.commands.registerCommand(`${CONSTANTS.extname}.makeSelectionRecommendations`, logExceptions(async () => {
      await userCommandHandler.makeSelectionRecommendations();
    }));    


    const resetIsFirstRunCommand = vscode.commands.registerCommand(`${CONSTANTS.extname}.resetIsFirstRun`, logExceptions( async () => {
      await resetIsFirstRun(context);
    }));

    const viewWelcomeScreenCommand = vscode.commands.registerCommand(`${CONSTANTS.extname}.viewWelcomeScreen`, logExceptions( async () => {
      await viewWelcomeScreen();
    }));    

    const setAPIKeyCommand = vscode.commands.registerCommand(`${CONSTANTS.extname}.setAPIKeyCommand`, logExceptions(async () => {
      await userCommandHandler.setApiKey();
    }));

    const showAICommandPanelCommand = vscode.commands.registerCommand(`${CONSTANTS.extname}.showAICommandPanel`, logExceptions(async () => {
      await userCommandHandler.showAICommandPanel();
    }));    

  
	context.subscriptions.push(pickModelCommand);
	context.subscriptions.push(setAPIKeyCommand);  
  context.subscriptions.push(resetIsFirstRunCommand);
  context.subscriptions.push(viewWelcomeScreenCommand);  
  context.subscriptions.push(showAICommandPanelCommand);     

  context.subscriptions.push(giveFolderCommandCommand);
  context.subscriptions.push(analyzeFolderCommand);
  context.subscriptions.push(makeFolderRecommendationsCommand);

  context.subscriptions.push(giveFileCommandCommand);
  context.subscriptions.push(analyzeFileCommand);
  context.subscriptions.push(makeFolderRecommendationsCommand);  

  context.subscriptions.push(giveEditorCommandCommand);
  context.subscriptions.push(analyzeEditorCommand);
  context.subscriptions.push(makeEditorRecommendationsCommand);  
  
  context.subscriptions.push(giveSelectionCommandCommand);
  context.subscriptions.push(analyzeSelectionCommand);
  context.subscriptions.push(makeSelectionRecommendationsCommand); 
  



  maybeDoFirstRun(context);

}

// This method is called when your extension is deactivated
export function deactivate() {}
