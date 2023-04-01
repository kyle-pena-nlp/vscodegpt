// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { CONSTANTS } from './constants';
import { AIAssistanceWorker } from './ai_assistance_worker';
import { UI } from "./ui";
import { BackgroundProcess } from "./background_process";
import { AICommandPanel } from "./ai_command_panel";
import { maybe_do_first_run } from './first_run';

function wait(ms: number) {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        console.log("Done waiting");
        resolve(ms)
      }, ms )
    })
  };  

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {


	const apiKey = vscode.workspace.getConfiguration().get(`${CONSTANTS.extname}.apiKey`) as string;
	const ai_assistance_worker = new AIAssistanceWorker(apiKey);
  const ui = new UI();
    
  const poll_ai_assistant = async () => { console.log("hi!"); }; //async () => await ai_assistance_worker.poll();
  const assistance_process = new BackgroundProcess("assistant_process", 3000, poll_ai_assistant);

	let suggestGoalsCommand = vscode.commands.registerCommand(`${CONSTANTS.extname}.suggestGoals`, () => {
		//TODO: ai_assistance_worker.suggest_goals();	
	});

    let stopAIassistantCommand = vscode.commands.registerCommand(`${CONSTANTS.extname}.stopAIassistant`, () => {
        assistance_process.stop();
    });

    let startAIassistantCommand = vscode.commands.registerCommand(`${CONSTANTS.extname}.startAIassistant`, () => {
        assistance_process.start();
    });    

    let doShowWebViewPanel = async () =>  {

      console.log("rendering panel")

      const panel = vscode.window.createWebviewPanel(
        'actionApproval',
        'Action Approval',
        vscode.ViewColumn.One,
        { enableScripts: true }
      );
  
      const actions = [
        { id: 1, description: 'Create a new file' },
        { id: 2, description: 'Delete a file' },
        { id: 3, description: 'Rename a file' },
      ];
  
      panel.webview.html = showWebViewPanel(actions);
  
      panel.webview.onDidReceiveMessage(async (message) => {
        switch (message.command) {
          case 'approve':
            console.log(`Action approved: ${message.id}`);
            break;
          case 'reject':
            console.log(`Action rejected: ${message.id}`);
            break;
        }
      });
    };

    let showWebViewCommand = vscode.commands.registerCommand(`${CONSTANTS.extname}.showWebView`, async () => {
      console.log("Executing command");
        await doShowWebViewPanel();
      });    

    let pickModelCommand = vscode.commands.registerCommand(`${CONSTANTS.extname}.pickModel`, async () => {
        const model = await ui.pick_model();
        if (model) {
            ai_assistance_worker.set_model(model);
        }
    }); 

  context.subscriptions.push(showWebViewCommand);
	context.subscriptions.push(suggestGoalsCommand);
	context.subscriptions.push(stopAIassistantCommand);
	context.subscriptions.push(startAIassistantCommand);
	context.subscriptions.push(pickModelCommand);


  vscode.commands.executeCommand(`${CONSTANTS.extname}.showWebView`);

  maybe_do_first_run();

}

// This method is called when your extension is deactivated
export function deactivate() {}
