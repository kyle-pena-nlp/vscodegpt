import * as vscode from 'vscode';
import { Workspace } from "./workspace";
import { UI } from "./ui";
import { Permissions } from "./permissions";
import { AICommand, AICommandExecutionResult } from './ai_command';
import { WorkspaceConfiguration } from './workspace_configuration';

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
    private workspace_configuration : WorkspaceConfiguration;
    private ui: UI;
    private permissions: Permissions;

    constructor(context : vscode.ExtensionContext) {
        this.workspace = new Workspace();
        this.workspace_configuration = new WorkspaceConfiguration(context);
        this.ui = new UI();
        this.permissions = new Permissions(context);
    }

    async dispatch_commands(commands : Array<AICommand>) {
        const definitions = await this.workspace_configuration.get_command_execution_definitions();
        const context = await this.workspace_configuration.get_command_execution_context();
        return await this.dispatch_commands_internal(commands, definitions, context);
    }

    private async dispatch_commands_internal(commands : Array<AICommand>, definitions : Map<string,string>, context : Map<string,string>) {
        try{
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
    
            return {
                success: true,
                commands: commands,
                definitions: definitions,
                context: context
            } as AICommandExecutionResult;
        }
        catch(e)  {
            console.debug(e);
            return {
                success: false,
                commands: commands,
                definitions : definitions,
                context: context
            } as AICommandExecutionResult;
        }
    }

    private async gather_definitions(command : AICommand, definitions : Map<string,string>, context : Map<string,string>) {
        const verb = command.verb;
        if (verb == "DEFINEFILECONTENTS") {
            const arg1 = command.arg1!;
            const arg2 = command.arg2!;              
            definitions.set(arg1, arg2);
        }
    }

    private async gather_context_command(command : AICommand, definitions : Map<string,string>, context : Map<string,string>) {
        const verb = command.verb;    
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
            const arg1 = command.arg1!;               
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

    private async execute_ui_command(command : AICommand, definitions : Map<string,string>, context : Map<string,string>) {
        const verb = command.verb;
        if (verb == "CLARIFY") {
            const arg1 = command.arg1!;
            const answer = ( await this.ui.ask_user_for_clarification(arg1) || "").trim();
            if (answer) {
                context.set(arg1, answer);
            }
        }
    }

    private async execute_workspace_command(command : AICommand, definitions : Map<string,string>, context : Map<string,string>) {
        const verb = command.verb;
        if (verb == "MOVEFILE") {
            const arg1 = command.arg1!;
            const arg2 = command.arg2!;            
            const from = vscode.Uri.parse(arg1, false);
            const to = vscode.Uri.parse(arg2, false);
            if (await this.permissions.maybeAskToMove(from, to)) {
                await this.workspace.command_movefile(from, to);   
            }
        }
        else if (verb == "CREATEFILE") {
            const arg1 = command.arg1!;
            const arg2 = command.arg2!;               
            const uri = vscode.Uri.parse(arg1, false);
            const content = definitions.get(arg2) || "";
            if (await this.permissions.maybeAskToCreateFile(uri)) {
                await this.workspace.command_createfile(uri, content);
            }
        }
        else if (verb == "CREATEDIR") {
            const arg1 = command.arg1!;          
            const uri = vscode.Uri.parse(arg1, false);
            if (await this.permissions.maybeAskToCreateDir(uri)) {
                await this.workspace.command_createdir(uri);
            }
        }
    }
}