// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
const constants = require("./constants.ts");
import { AIAssistanceWorker } from './ai_assistance_worker';
import { UI } from "./ui";
import { make_background_process } from "./background_process";

function make_progress_options(message : string) {
	const progressOptions: vscode.ProgressOptions = {
		location: vscode.ProgressLocation.Window,
		title: message,
		cancellable: false
	};
	return progressOptions;
};

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	const apiKey = vscode.workspace.getConfiguration().get(`${constants.extname}.apiKey`) as string;
	const ai_assistance_worker = new AIAssistanceWorker(apiKey);
    const ui = new UI();
    const poll_ai_assistant = async () => await ai_assistance_worker.poll();
    const worker = make_background_process(100, poll_ai_assistant);

    //const ui_workpanel_renderer = new AIWorkpanelRenderer();
    //const ui_workpanel_renderer = async () => await ui_workpanel_worker.poll();    
    //const ui_worker = make_background_process(10, ui_worker);

	let suggestGoalsCommand = vscode.commands.registerCommand(`${constants.extname}.suggestGoals`, () => {
		//TODO: ai_assistance_worker.suggest_goals();	
	});

    let stopAIassistantCommand = vscode.commands.registerCommand(`${constants.extname}.stop`, () => {
        worker.stop();
    });

    let startAIassistantCommand = vscode.commands.registerCommand(`${constants.extname}.start`, () => {
        worker.start();
    });    

    let pickModelCommand = vscode.commands.registerCommand(`${constants.extname}.pickModel`, async () => {
        const model = await ui.pick_model();
        if (model) {
            ai_assistance_worker.set_model(model);
        }
    }); 

	context.subscriptions.push(suggestGoalsCommand);
	context.subscriptions.push(stopAIassistantCommand);
	context.subscriptions.push(startAIassistantCommand);
	context.subscriptions.push(pickModelCommand);

    worker.start();
    //ui_worker.start();

}

// This method is called when your extension is deactivated
export function deactivate() {}
