import * as vscode from 'vscode';
import { Workspace } from "./workspace";
import { UI } from "./ui";
import { Permissions } from "./permissions";

/*
    1. DEFINEFILECONTENTS
    2. MOVEFILE
    3. CREATEFILE
    4. CREATEDIR
    5. READDIR
    6. READFILE
    7. CLARIFY
*/

export class AICommandDispatcher {

    private workspace : Workspace;
    private ui: UI;
    private permissions: Permissions;

    constructor() {
        this.workspace = new Workspace();
        this.ui = new UI();
        this.permissions = new Permissions();
    }

    async dispatch_commands(commands : Array<Array<string>>, definitions : Map<string,string>, context : Map<string,string>) {
        for (const command of commands) {
            await this.gather_definitions(command, definitions, context);
        }
        for (const command of commands) {
            await this.gather_context_command(command, definitions, context);
        }
        for (const command of commands) {
            await this.execute_ui_command(command, definitions, context);
        }
        for (const command of commands) {
            await this.execute_workspace_command(command, definitions, context);
        }
    }

    async gather_definitions(command : Array<string>, definitions : Map<string,string>, context : Map<string,string>) {
        const verb = command[0];
        const arg1 = command[1];
        const arg2 = command[2];  
        if (verb == "DEFINEFILECONTENTS") {
            definitions.set(arg1, arg2);
        }
    }

    async gather_context_command(command : Array<string>, definitions : Map<string,string>, context : Map<string,string>) {
        const verb = command[0];
        const arg1 = command[1];
        const arg2 = command[2];        
        if (verb == "READDIR") {
            const workspace_root = vscode.Uri.parse("./", false);
            const filesystem = await this.workspace.command_readdir(workspace_root);
            if (await this.permissions.maybeAskToReadFilesystem(workspace_root)) {
                context.set("FILESYSTEM", JSON.stringify(filesystem));
            }
            else {
                context.delete("FILESYSTEM");
            }
        }
        else if (verb == "READFILE") {
            const uri = vscode.Uri.parse(arg1, false);
            if (await this.permissions.maybeAskToReadFile(uri)) {
                const file_contents = await this.workspace.command_readfile(uri);
                context.set(arg1, file_contents); 
            }
            else {
                context.delete(arg1);
            }
        }
    }

    async execute_ui_command(command : Array<string>, definitions : Map<string,string>, context : Map<string,string>) {
        const verb = command[0];
        const arg1 = command[1];
        const arg2 = command[2];
        if (verb == "CLARIFY") {
            const answer = ( await this.ui.ask_user_for_clarification(arg1) || "").trim();
            if (answer) {
                context.set(arg1, answer);
            }
        }
    }

    async execute_workspace_command(command : Array<string>, definitions : Map<string,string>, context : Map<string,string>) {
        const verb = command[0];
        const arg1 = command[1];
        const arg2 = command[2];
        if (verb == "MOVEFILE") {
            const from = vscode.Uri.parse(arg1, false);
            const to = vscode.Uri.parse(arg2, false);
            if (await this.permissions.maybeAskToMove(from, to)) {
                await this.workspace.command_movefile(from, to);   
            }
        }
        else if (verb == "CREATEFILE") {
            const uri = vscode.Uri.parse(arg1, false);
            const content = definitions.get(arg2) || "";
            if (await this.permissions.maybeAskToCreateFile(uri)) {
                await this.workspace.command_createfile(uri, content);
            }
        }
        else if (verb == "CREATEDIR") {
            const uri = vscode.Uri.parse(arg1, false);
            if (await this.permissions.maybeAskToCreateDir(uri)) {
                await this.workspace.command_createdir(uri);
            }
        }
    }
}