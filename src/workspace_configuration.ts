import * as vscode from 'vscode';
import { CONSTANTS } from './constants';
import { v4 as uuidv4 } from 'uuid';
import { AIAction, AICommand } from './ai_command';

export class WorkspaceConfiguration {

    private context : vscode.ExtensionContext;

    constructor(context : vscode.ExtensionContext) {
        this.context = context;
    }

    async get_AI_deny_read_file_patterns() {
        return this.get_config_property<Array<string>>("AI_deny_read_patterns", []);
    }

    async get_AI_allow_read_file_patterns() {
        return this.get_config_property<Array<string>>("AI_allow_read_patterns", []);
    }

    async add_AI_deny_read_file_pattern(pattern : string) {
        await this.append_to_config_property("AI_deny_read_patterns", pattern);
    }

    async add_AI_allow_read_file_patterns(pattern : string) {
        await this.append_to_config_property("AI_allow_read_patterns", pattern);
    }

    async get_AI_deny_write_file_patterns() {
        return this.get_config_property<Array<string>>("AI_deny_write_patterns", []);
    }

    async get_AI_allow_write_file_patterns() {
        return this.get_config_property<Array<string>>("AI_allow_write_patterns", []);
    }

    async add_AI_deny_write_file_pattern(pattern : string) {
        await this.append_to_config_property("AI_deny_write_patterns", pattern);
    }

    async add_AI_allow_write_file_patterns(pattern : string) {
        await this.append_to_config_property("AI_allow_write_patterns", pattern);
    }

    async get_AI_goals() {
        return this.get_config_property<Array<string>>("AI_goals", []);
    }

    async add_AI_goal(goal : string) {
        await this.append_to_config_property("AI_goals", goal);
    }

    async remove_AI_goal(goal : string) {
        await this.remove_item_from_arr_config_property("AI_goals", goal);
    }

    async get_is_first_run() {
        return await this.get_config_property("first_run", true);
    }

    async set_is_first_run(value: boolean) {
        await this.set_config_property("first_run", value);
    }

    async get_recommended_actions() {
        return this.context.workspaceState.get<Array<AIAction>>('recommendedActions') || [];
    }

    async add_recommended_action(commands : Array<AICommand>) {
        const new_id = uuidv4();
        const action = {
            id : new_id,
            commands : commands
        } as AIAction;
        const recommendedActions = this.context.workspaceState.get<Array<AIAction>>('recommendedActions') || [];
        recommendedActions.push(action);
        this.context.workspaceState.update('recommendedActions', recommendedActions);
    }

    async remove_recommended_action(id : string) {
        const recommendedActions = this.context.workspaceState.get<Array<AIAction>>('recommendedActions') || [];
        const filteredActions = recommendedActions.filter(action => action.id !== id);
        this.context.workspaceState.update('recommendedActions', filteredActions);        
    }

    async get_recommended_action_by_id(id : string) {
        const recommendedActions = this.context.workspaceState.get<Array<AIAction>>('recommendedActions') || [];
        const filteredActions = recommendedActions.filter(action => action.id === id);
        if (filteredActions.length === 1) {
            return filteredActions[0];
        }
        else if (filteredActions.length === 0) {
            return null;
        }
        else {
            throw `More than one action with id ${id}`;
        }
    }

    async get_command_execution_definitions() {
        return this.context.workspaceState.get<Map<string,string>>('command_execution_definitions') || new Map<string,string>();
    }

    async get_command_execution_context() {
        return this.context.workspaceState.get<Map<string,string>>('command_execution_context') || new Map<string,string>();
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
}