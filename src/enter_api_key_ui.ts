import * as vscode from 'vscode';
import * as path from 'path';
import { CONSTANTS } from './constants';
import { WorkspaceConfiguration } from './workspace_configuration';
import fs = require('fs');
import axios = require('axios');
import { AxiosError } from 'axios';
import { html }  from "./enter_api_key_webview.html";

export async function haveUserEnterAPIKey(context: vscode.ExtensionContext) {

    const panel = vscode.window.createWebviewPanel(
        'APIKeyInput',
        'Enter your API Key',
        vscode.ViewColumn.One,
        {
            enableScripts: true,
            retainContextWhenHidden: true
        }
    );

    // Load the webview HTML file
    panel.webview.html = html;

    const workspaceConfiguration = new WorkspaceConfiguration(context);
    const apiKey = await workspaceConfiguration.get_apiKey();
    if (apiKey) {
        panel.webview.postMessage({ type: 'setAPIKey', payload: apiKey });        
    }

    let closeTimeout : null | NodeJS.Timeout = null;

    // Handle messages from the webview
    panel.webview.onDidReceiveMessage(async message => {
        if (message.type === 'validateAPIKey') {
            const apiKey = message.payload;
            const isValid = await validateAPIKey(apiKey);
            panel.webview.postMessage({ type: 'validationResult', payload: isValid });
        }
        else if (message.type == 'saveAPIKey') {
            const apiKey = message.payload;
            await workspaceConfiguration.set_apiKey(apiKey);
            panel.webview.postMessage({ type: 'saveAPIKeySuccess', payload: 'success' });
            let closeTimeout = setTimeout(() => panel.dispose(), 1500);
        }
    });

    panel.onDidDispose(
        () => {
          // Handle user closing panel before the 5sec have passed
          if (closeTimeout) {
            clearTimeout(closeTimeout);
          }
        },
        null,
        context.subscriptions
      );    
};

export async function validateAPIKey(apiKey : string) : Promise<'valid'|'invalid'|'noaccess'> {
    // check endpoint is accessible
    const endpoint = 'https://api.openai.com/v1/engines';
    try {
        const response = await axios.get(endpoint, {headers: {'Authorization': `Bearer ${apiKey}`}});
        return 'valid';
    } 
    catch (error) {
        const axiosError = error as AxiosError;
        if (axiosError.response && (axiosError.response.status === 403 || axiosError.response.status === 401)) {
            return 'invalid';
        } 
        else {
            return 'noaccess';
        }
    }
}