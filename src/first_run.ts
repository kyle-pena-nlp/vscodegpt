import * as vscode from 'vscode';
import * as path from 'path';
import { CONSTANTS } from './constants';
import { WorkspaceConfiguration } from './workspace_configuration';

const base64PepperWithAnAttitude = "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"

function getWelcomeScreenContent() {
    return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Welcome to ${CONSTANTS.exttitle}</title>
           
            <style>
                .container {
                    display: flex;
                    align-items: center;
                }
            </style>
        </head>
        <body>
            <h1 class="container"><img id="mascot" src="data:image/gif;base64,${base64PepperWithAnAttitude}" alt="What seems to be the pepper, officer?"> ${CONSTANTS.exttitle}</h1>
            
            <h2>Quick Start</h2>
            <p>This extension uses the OpenAI API to talk to ChatGPT.  That means it needs an API key. Here's how you get started:</p>
            <ol>
                <li>If you haven't already, <a href="">sign up for OpenAI API access</a> and <a href="">get an API access key</a>.</li>
                <li>Execute the "Enter API Key" command by opening the command palette with <code>Ctrl-Shift-P</code>.</li>
                <li>That's it!</li>
            </ol>
            
            
            <h2>About</h2>
            <p>${CONSTANTS.exttitle} is the most advanced integration of ChatGPT into VS Code available.  Features include:</p>
            <ul>
                <li>Ability to fetch and analyze 3rd party dependencies (including ones that have been updated since 2019)</li>
                <li>Intelligently avoids exceeding the token limit for large files</li>
                <li>Generates dynamic "gameplans" that response to new information and unexpected errors</li>
                <li>Asks you for clarifications when needed</li>
                <li>Shows its thought process in an 'AI Command Panel'</li>
                <li>Can create entire projects from scratch by creating new files, moving files, and etc.</li>
                <li>...and more</li>
            </ul>
            

            <h2>Features</h2>
            <ul>
                <li>
                <dt>Replace Selection</dt>
                <dd>Right-click selected code, and then tell ${CONSTANTS.exttitle} how you want it to be modified</dd>
                </li>

                <li>
                <dt>Analyze Selection</dt>
                <dd>Right-click selected code, and then ask ${CONSTANTS.exttitle} questions about the code</dd>   
                </li>

                <li>
                <dt>Write Code</dt>
                <dd>Right-click at any position in the editor and then tell ${CONSTANTS.exttitle} what code to write</dd>
                </li>

                <li>
                <dt>Execute Goal</dt>
                <dd>Right-click on any folder and give ${CONSTANTS.exttitle} a general goal, and watch ${CONSTANTS.exttitle} build a project for you</dd>
                </li>

                <li>
                <dt>Analyze File or Folder</dt>
                <dd>Right-click a file or folder, and then ask ${CONSTANTS.exttitle} questions about it</dd>  
                </li>
            </ul>

            <h3>Command Panel</h3>
            <p>
            </p>
            
            <h3>How Does It Work?</h3>
            <p>${CONSTANTS.exttitle} is inspired by classic goal oriented AI algorithms, but puts a Chat GPT twist on it.  By careful prompt engineering,
            we ask Chat GPT to pretend it is instructing another LLM to perform tasks, and in this way Chat GPT acts as its own planning engine.
            We also make ChatGPT aware of a "memory bank" where it can store and retrieve values (like code blocks or code summaries).
            Thus, ChatGPT's effective knowledge far exceeds the token limit imposed by the model.  And so on...
            </p>
            
            <h4>How To Address The Thread Of Deep Fakes</h4>
            <p>View the write-up <a>here</a>.</p>
        </body>
        </html>
    `;
}

export function viewWelcomeScreen() {
    const panel = vscode.window.createWebviewPanel(
        'welcomeScreen',
        `Welcome to {CONSTAMTS.exttitle}`,
        vscode.ViewColumn.One,
        { enableScripts: true }
    );

    // Set the content of the webview
    panel.webview.html = getWelcomeScreenContent();
}

const doFirstRun = async () => {
    viewWelcomeScreen();
};

export const maybeDoFirstRun = async (context : vscode.ExtensionContext) => {
    // Check if the extension is being activated for the first time
    const isFirstRun = !context.globalState.get('isFirstRun');

    if (isFirstRun) {
        //context.globalState.update('isFirstRun', false);
        await doFirstRun();
    }
};

export const resetIsFirstRun = async (context : vscode.ExtensionContext) => {
    context.globalState.update('isFirstRun', true);
}