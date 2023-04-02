import * as vscode from 'vscode';
import * as path from 'path';
import { CONSTANTS } from './constants';
import { WorkspaceConfiguration } from './workspace_configuration';

const  write_empty_config_file = async () => {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;

    if (!workspaceFolder) {
      vscode.window.showErrorMessage('No workspace folder open');
      return;
    }
  
    const vscodeDirectory = path.join(workspaceFolder, '.vscode');
    const filePath = path.join(vscodeDirectory, `${CONSTANTS.extname}`);
  
    const fileUri = vscode.Uri.file(filePath);
    
    await vscode.workspace.fs.writeFile(fileUri, Buffer.from(""));
}

const do_first_run = async () => {
    // this file will control stuff like auto-view panel etc.
    // goals and etc will be stored in vscode configuartions
    await write_empty_config_file();
};

export const maybe_do_first_run = async (context : vscode.ExtensionContext) => {
    const configuration = new WorkspaceConfiguration(context);
    if (await configuration.get_is_first_run()) {
        await do_first_run();
        configuration.set_is_first_run(false);
    }
};