import * as vscode from 'vscode';
import { CONSTANTS } from './constants';
import { AICommandPanel } from "./ai_command_panel";
import { WorkspaceConfiguration } from './workspace_configuration';
import { maybe_do_first_run } from './first_run';
import { BackgroundProcess } from './background_process';
import { AIAssistantWorker } from './ai_assistant_worker';

// I give you fire.
export async function activate(context: vscode.ExtensionContext) {

    const ai_command_panel = new AICommandPanel(context);
    const workspace_configuration = new WorkspaceConfiguration(context);
    const ai_assistant_worker = new AIAssistantWorker(ai_command_panel, context);
    const ai_assistant_worker_background_process = new BackgroundProcess("ai_assistant_worker", 3000, async () => ai_assistant_worker.poll());


    let startAIassistantCommand = vscode.commands.registerCommand(`${CONSTANTS.extname}.startAIassistant`, async () => {
      ai_assistant_worker_background_process.start();
    });    

    let stopAIassistantCommand = vscode.commands.registerCommand(`${CONSTANTS.extname}.stopAIassistant`, async () => {
      await ai_assistant_worker_background_process.stop();
    });        

    // Show the command panel
    let showAICommandPanelCommand = vscode.commands.registerCommand(`${CONSTANTS.extname}.showAICommandPanel`, async () => {
        await ai_command_panel.refresh();
    });    

    // Let the user pcik the preferred model
    let pickModelCommand = vscode.commands.registerCommand(`${CONSTANTS.extname}.pickModel`, async () => {
      const selectedModel = await vscode.window.showQuickPick(CONSTANTS.models, { placeHolder: `Pick your preferred AI model.  ${CONSTANTS.recommendedModel} recommended.` } as vscode.QuickPickOptions);
      if (selectedModel) {
        workspace_configuration.set_AI_model(selectedModel);
      }
    }); 

  
  context.subscriptions.push(startAIassistantCommand);
  context.subscriptions.push(stopAIassistantCommand);
  context.subscriptions.push(showAICommandPanelCommand);
	context.subscriptions.push(pickModelCommand);

  if (await workspace_configuration.get_auto_show_AI_command_panel()) {
    vscode.commands.executeCommand(`${CONSTANTS.extname}.showAICommandPanel`);
    vscode.commands.executeCommand(`${CONSTANTS.extname}.startAIassistant`);
  }


  maybe_do_first_run(context);

}

// This method is called when your extension is deactivated
export function deactivate() {}
