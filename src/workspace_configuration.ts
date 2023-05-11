import * as vscode from 'vscode';
import { CONSTANTS } from './constants';
import { AIAction, AIGoal, HasID } from './ai_com_types';

export class WorkspaceConfiguration {

    private context : vscode.ExtensionContext;

    constructor(context : vscode.ExtensionContext) {
        this.context = context;
    }

    async get_AI_deny_read_file_patterns() {
        return this.get_config_property<Array<string>>("AI_deny_read_patterns", []);
    }

    async add_AI_deny_read_file_pattern(pattern : string) {
        await this.append_to_config_property("AI_deny_read_patterns", pattern);
    }

    async get_AI_deny_write_file_patterns() {
        return this.get_config_property<Array<string>>("AI_deny_write_patterns", []);
    }

    async add_AI_deny_write_file_pattern(pattern : string) {
        await this.append_to_config_property("AI_deny_write_patterns", pattern);
    }

    async add_AI_allow_write_file_patterns(pattern : string) {
        await this.append_to_config_property("AI_allow_write_patterns", pattern);
    }

    async get_AI_deny_execution_patterns() {
        return this.get_config_property("AI_deny_execution_patterns", []);
    }

    async add_AI_deny_execution_patterns(pattern : string) {
        return this.append_to_config_property("AI_deny_execution_patterns", pattern);
    }

    async get_auto_show_AI_command_panel() {
        return await this.get_config_property<boolean>("auto_show_AI_command_panel", true);
    }

    async set_auto_show_AI_command_panel(value : boolean) {
        await this.set_config_property("auto_show_AI_command_panel", value);
    }

    async set_AI_model(value : string) {
        return await this.set_config_property("AI_model", value);
    }

    async get_AI_model() {
        return await this.get_config_property<string>("AI_model", "");
    }

    async get_apiKey() {
        return vscode.workspace.getConfiguration().get(`${CONSTANTS.extname}.apiKey`) as string;
    }

    async set_apiKey(apiKey : string) {
        vscode.workspace.getConfiguration().set(`${CONSTANTS.extname}.apiKey`, apiKey);
    }

    private async set_config_property(property : string, value: any) {
        await vscode.workspace.getConfiguration(`${CONSTANTS.extname}`).update(property, value, vscode.ConfigurationTarget.Workspace);          
    }

    private async append_to_config_property(property : string, new_item : string) {
        const current_list = this.get_config_property<Array<string>>(property, []);
        const new_list = [...current_list, new_item];
        await vscode.workspace.getConfiguration(`${CONSTANTS.extname}`).update(property, new_list, vscode.ConfigurationTarget.Workspace);
    }

    private async remove_item_from_arr_config_property(property : string, entry : string) {
        const current_list = this.get_config_property<Array<string>>(property, []);
        const new_list = current_list.filter(g => g !== entry);
        await vscode.workspace.getConfiguration(`${CONSTANTS.extname}`).update(property, new_list, vscode.ConfigurationTarget.Workspace);        
    }

    private get_config_property<T>(property : string, default_value : T ) {
        return vscode.workspace.getConfiguration(`${CONSTANTS.extname}`).get<T>(property, default_value);
    }    


    async get_workspace_property<T>(property : string, defaultValue? : T) {
        return this.context.workspaceState.get<T>(property, defaultValue!);
    }

    async set_workspace_property<T>(property : string, value : T) {
        this.context.workspaceState.update(property, value);
    }

    async append_to_workspace_property<T>(property : string, value : T) {
        const values = await this.get_workspace_property<Array<T>>(property) || [];
        values.push(value);
        await this.set_workspace_property<Array<T>>(property, values);
    }

    async remove_from_workspace_property<T>(property : string, value : T) {
        const values = await this.get_workspace_property<Array<T>>(property) || [];
        const new_values = values.filter(item => item !== value);
        await this.set_workspace_property(property, new_values);
    }

    async remove_from_workspace_property_by_id<T extends HasID>(property : string, id : string) {
        const values = await this.get_workspace_property<Array<T>>(property) || [];
        const new_values = values.filter(item => item.id !== id);
        await this.set_workspace_property(property, new_values);        
    }

    async get_from_workspace_by_id<T extends HasID>(property : string, id : string, defaultValue? : T) {
        const values = await this.get_workspace_property<Array<T>>(property) || [];
        const new_values = values.filter(item => item.id === id);
        if (new_values.length == 0) {
            if (defaultValue !== undefined) {
                return defaultValue;
            }
            else {
                return null;
            }
        }           
        else if (new_values.length == 1) {
            return new_values[0];
        }
        else {
            throw `More than one ${property} from workspace with id ${id}`;
        }
    }
    
    async add_to_workspace_by_id<T extends HasID>(property : string, value : T) {
        await this.remove_from_workspace_property_by_id(property, value.id);
        await this.append_to_workspace_property(property, value);
    }
}