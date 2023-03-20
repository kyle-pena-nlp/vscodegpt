// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { OpenAIApi, Configuration, CreateChatCompletionRequest, ChatCompletionRequestMessage, ChatCompletionRequestMessageRoleEnum } from 'openai';
const dirTree = require("directory-tree");

class ChatGPTClient{
    private openAI: OpenAIApi;

    constructor(apiKey : string) {
		
        const configuration = new Configuration({
            apiKey: apiKey,
        });
        this.openAI = new OpenAIApi(configuration);
    }

    async respond(chatGPTMessages: Array<ChatCompletionRequestMessage>) {
        try {
            if (!chatGPTMessages) {
                return {
                    text: 'No chatGPTMessages',
                };
            }

            const request: CreateChatCompletionRequest = {
                messages: chatGPTMessages,
                model: 'gpt-3.5-turbo',
       
            };

            const response = await this.openAI.createChatCompletion(request);
            if (!response.data || !response.data.choices) {
                
                return {
                    text: "The bot didn't respond. Please try again later.",
                };
            }

            return {
                text: response.data.choices[0].message?.content,
                messageId: response.data.id,
            };
        } catch (error : any) {
			throw error;
        }
    }
}

const only_list_instructions =  'When you respond, you will respond with only the bulleted list and you do not include other words, phrases, or sentences describing or explaining your response.  Do not explain the response.  Do not include any words, phrases or sentences introducing your response.  Do not include comments before or after the list items, even on the same line.  Do not number the responses.  This is very important.';
const file_system_command_format_description = "`MOVE:X:Y'`;  This command moves the file or folder from path 'X' to path 'Y', where 'X' is the original path, and 'Y' is the new path, including the filenamne if the object being moved is a file.  `NEWFILE:X;` This command creates a new file with path 'X'.  `NEWFOLDER:'X';` This commands creates a new folder with path 'X'.  All paths in these emitted instructions are relative to the project directory root." 
const suggestGoalsSystemPrompt =  'You are a vscode extension which suggests development goals based on the code you are given by the user, with the filename of the code as auxilliary input. You respond with goals in a bulleted list.' + only_list_instructions;
const executeGoalSystemPrompt = 'You are a vscode extension which provides revisions to code provided by the user according to the goal supplied by the user, with the filename of the code as auxilliary input.  You are revising the code the user sends you, but in a way that fulfills the user-provided goal. Your will respond with only the revised code.  Do not include any other words, phrases, or sentences describin or explaining your response.  Also, do not include the ``` before and after the code.  This is very important.';
const generateDirectoryChangeCommandsSystemCommand = 'You are a vscode extension which has the power to create new file, create new folders, rename files, and rename folders, and modify file contents according to the goal provided by the user.  You accept a directory structure, code from the currently active file, and the filename of the currently active file as input.  As output, you emit a series of commands, one per line, with this format: ' + file_system_command_format_description + '. You must issue these commands in a logical order in order to fulfill the goal of the user.';
const suggestDirectoryChangesSystemPrompt = 'You are a vscode extension which has the power to modify the files in a project.  The user will provide you with JSON which describes the current project file system, and you will suggest changes to which files and folders are currently in the project, including renaming files and folders, or creating new files and folders.  Please suggest changes which conform to common practices and best practices according to the types of files and folders that the user has described.' + only_list_instructions;


function strip_line_item(text : string) {
	const listitemstart_regex = /^(\d+\.|-|\*)\s+/gm;
	const backtick_regex = /`/gm;
	const remove_ending_semicolon_regex = /;\s+/gm;
	return text.replace(listitemstart_regex, '').replace(backtick_regex, '').replace(remove_ending_semicolon_regex, '').trim();
}


async function getDirectoryJSON(uri: vscode.Uri): Promise<object> {
    const entries = await vscode.workspace.fs.readDirectory(uri);
    const result : Record<string,any> = {};

    for (const [entryName, entryType] of entries) {
        const entryUri = vscode.Uri.joinPath(uri, entryName);

        if (entryType === vscode.FileType.Directory) {
            result[entryName] = await getDirectoryJSON(entryUri);
        } else if (entryType === vscode.FileType.File) {
            result[entryName] = 'file';
        } else {
            result[entryName] = 'unknown';
        }
    }

    return result;
}

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	const apiKey = vscode.workspace.getConfiguration().get('vscode-gpt.apiKey') as string;
	const chatgptClient = new ChatGPTClient(apiKey);

	let suggestGoalsCommand = vscode.commands.registerCommand('vscode-gpt.suggestGoals', () => {

		let activeWindowText = vscode.window.activeTextEditor?.document.getText();
		let currentWindowFilename = vscode.window.activeTextEditor?.document.fileName;
		
		const generateGoalMessages = [
			{
					role: ChatCompletionRequestMessageRoleEnum.System,
					content: suggestGoalsSystemPrompt
			} as ChatCompletionRequestMessage,
			{
				role: ChatCompletionRequestMessageRoleEnum.User,
				content: activeWindowText,
			} as ChatCompletionRequestMessage,
			{
				role: ChatCompletionRequestMessageRoleEnum.User,
				content: "The filename of the code is '" + currentWindowFilename + "'",
			} as ChatCompletionRequestMessage			
		];
		
		const progressOptions: vscode.ProgressOptions = {
			location: vscode.ProgressLocation.Window,
			title: 'Generating goals for this code...',
			cancellable: false
		};
		  
		vscode.window.withProgress(progressOptions,  async () => {
			const  { text, messageId } = await chatgptClient.respond(generateGoalMessages)
			let goal_options = text?.split("\n") as string[];
			const picked_goal = await vscode.window.showQuickPick(
				goal_options,
				{ placeHolder: 'Pick a goal...' });

			const goalMessage = [
				{
						role: ChatCompletionRequestMessageRoleEnum.System,
						content: executeGoalSystemPrompt
				} as ChatCompletionRequestMessage,
				{
					role: ChatCompletionRequestMessageRoleEnum.User,
					content: "The filename of the code is '" + currentWindowFilename + "'",
				} as ChatCompletionRequestMessage,	
				{
					role: ChatCompletionRequestMessageRoleEnum.User,
					content: "My goal is: " + picked_goal
				},						
				{
					role: ChatCompletionRequestMessageRoleEnum.User,
					content: activeWindowText,
				} as ChatCompletionRequestMessage
			];

			const progressOptions: vscode.ProgressOptions = {
				location: vscode.ProgressLocation.Window,
				title: 'Executing selected goal',
				cancellable: false
			};
			
			vscode.window.withProgress(progressOptions, async () => {
				try{
					const  { text, messageId } = await chatgptClient.respond(goalMessage);
					let document = vscode.window.activeTextEditor?.document;
					if (document != undefined) {
						let edit = new vscode.WorkspaceEdit();
						edit.replace(document.uri, new vscode.Range(0, 0, document.lineCount, 0), text as string);
						vscode.workspace.applyEdit(edit);
					}
				}
				catch  (error : any) {
					vscode.window.showErrorMessage(`Error: ${error.message}`);
				}
			});
		});		
	});

	let suggestProjectChanges = vscode.commands.registerCommand('vscode-gpt.suggestProjectChanges', () => {
		let activeWindowText = vscode.window.activeTextEditor?.document.getText();
		let currentWindowFilename = vscode.window.activeTextEditor?.document.fileName;
		let workspaceUri = vscode.workspace.workspaceFolders?.[0].uri!;
		const progressOptions: vscode.ProgressOptions = {
			location: vscode.ProgressLocation.Window,
			title: 'Generating layout suggestions for this project',
			cancellable: false
		};
		vscode.window.withProgress(progressOptions,  async () => {

			let projectDirectoryJson = await getDirectoryJSON(workspaceUri);
			console.log(projectDirectoryJson);
			const generateLayoutChangeGoalsMessages = [
				{
						role: ChatCompletionRequestMessageRoleEnum.System,
						content: suggestDirectoryChangesSystemPrompt
				} as ChatCompletionRequestMessage,
				{
					role: ChatCompletionRequestMessageRoleEnum.User,
					content: "This is the layout of my project described as a JSON object:\n" + JSON.stringify(projectDirectoryJson),
				} as ChatCompletionRequestMessage,		
			];

			const  { text, messageId } = await chatgptClient.respond(generateLayoutChangeGoalsMessages)
			let goal_options = text?.split("\n") as string[];
			const picked_goal = await vscode.window.showQuickPick(
				goal_options,
				{ placeHolder: 'Pick a goal...' });

			if (!picked_goal) {
				return;
			}

			const goalMessage = [
				{
						role: ChatCompletionRequestMessageRoleEnum.System,
						content: generateDirectoryChangeCommandsSystemCommand
				} as ChatCompletionRequestMessage,				
				{
					role: ChatCompletionRequestMessageRoleEnum.User,
					content: "This is the layout of my project described as a JSON object:\n" +JSON.stringify(projectDirectoryJson),
				} as ChatCompletionRequestMessage,
				{
					role: ChatCompletionRequestMessageRoleEnum.User,
					content: "My goal is: " + picked_goal
				}					
			];

			const progressOptions: vscode.ProgressOptions = {
				location: vscode.ProgressLocation.Window,
				title: 'Generating project layout changes based on selected goal',
				cancellable: false
			};
			
			vscode.window.withProgress(progressOptions, async () => {
				vscode.window.showInformationMessage("executing goal");
				try{
					const  { text, messageId } = await chatgptClient.respond(goalMessage);
					let document = vscode.window.activeTextEditor?.document;
					const workspaceFolderPath = vscode.workspace.workspaceFolders?.[0].uri!;
					if (workspaceFolderPath != undefined) {
						// parse and implement commands
						vscode.window.showInformationMessage(text as string);
						let commands = text?.split("\n")!;
						for (const command of commands) {
							let cleanedCommand = strip_line_item(command);
							if (cleanedCommand.indexOf(":") < 0) {
								vscode.window.showInformationMessage("Skipping: " + cleanedCommand);
								continue;								
							}
							let tokens = cleanedCommand.split(":");
							let bytecode = tokens[0];
							if (bytecode == "MOVE") {
								vscode.window.showInformationMessage(cleanedCommand);
								const srcUri = vscode.Uri.joinPath(workspaceFolderPath, tokens[1]);
								const destUri = vscode.Uri.joinPath(workspaceFolderPath, tokens[2]);
								await vscode.workspace.fs.rename(srcUri, destUri);
							}
							else if (bytecode == "NEWFILE") {
								vscode.window.showInformationMessage(cleanedCommand);
								const newFileUri = vscode.Uri.joinPath(workspaceFolderPath, tokens[1]);
								const newFileContent = "";
								const data = Buffer.from(newFileContent, 'utf-8');
								await vscode.workspace.fs.writeFile(newFileUri, data);
							}
							else if (bytecode == "NEWFOLDER") {
								vscode.window.showInformationMessage(cleanedCommand);
								const newDirectoryUri = vscode.Uri.joinPath(workspaceFolderPath, tokens[1]);
								await vscode.workspace.fs.createDirectory(newDirectoryUri);
							}
						}
					}
				}
				catch  (error : any) {
					vscode.window.showErrorMessage(`Error: ${error.message}`);
				}
			});		
	});
	});

	context.subscriptions.push(suggestGoalsCommand);
	context.subscriptions.push(suggestProjectChanges);
}

// This method is called when your extension is deactivated
export function deactivate() {}
