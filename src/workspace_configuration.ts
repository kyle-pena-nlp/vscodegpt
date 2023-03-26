import * as vscode from 'vscode';
const constants = require(".constants.ts");

export class WorkspaceConfiguration {

    constructor() {
    }

    async get_AI_deny_read_file_patterns() {
        await this.maybe_do_first_run_auto_configuration();
        return this.get_config_property<Array<string>>("AI_deny_read_patterns", []);
    }

    async get_AI_allow_read_file_patterns() {
        await this.maybe_do_first_run_auto_configuration();
        return this.get_config_property<Array<string>>("AI_allow_read_patterns", []);
    }

    async add_AI_deny_read_file_pattern(pattern : string) {
        await this.maybe_do_first_run_auto_configuration();
        await this.append_to_config_property("AI_deny_read_patterns", pattern);
    }

    async add_AI_allow_read_file_patterns(pattern : string) {
        await this.maybe_do_first_run_auto_configuration();
        await this.append_to_config_property("AI_allow_read_patterns", pattern);
    }

    async get_AI_deny_write_file_patterns() {
        await this.maybe_do_first_run_auto_configuration();
        return this.get_config_property<Array<string>>("AI_deny_write_patterns", []);
    }

    async get_AI_allow_write_file_patterns() {
        await this.maybe_do_first_run_auto_configuration();
        return this.get_config_property<Array<string>>("AI_allow_write_patterns", []);
    }

    async add_AI_deny_write_file_pattern(pattern : string) {
        await this.maybe_do_first_run_auto_configuration();
        await this.append_to_config_property("AI_deny_write_patterns", pattern);
    }

    async add_AI_allow_write_file_patterns(pattern : string) {
        await this.maybe_do_first_run_auto_configuration();
        await this.append_to_config_property("AI_allow_write_patterns", pattern);
    }

    async get_AI_goals() {
        await this.maybe_do_first_run_auto_configuration();
        return this.get_config_property<Array<string>>("AI_goals", []);
    }

    async add_AI_goal(goal : string) {
        await this.maybe_do_first_run_auto_configuration();
        await this.append_to_config_property("AI_goals", goal);
    }
    
    async maybe_do_first_run_auto_configuration() {
        if (this.get_config_property("first_run", true)) {
            await this.do_first_run_setup();
            await this.set_config_property("first_run", false);
        }
    }

    private async do_first_run_setup(){
        // TODO: read in some hardcoded, default patterns (pem, cert, key, etc.)
        return;
    }

    private async set_config_property(property : string, value: any) {
        await vscode.workspace.getConfiguration(`${constants.extname}`).update(property, value, vscode.ConfigurationTarget.Workspace);          
    }

    private async append_to_config_property(property : string, new_item : string) {
        const current_list = this.get_config_property<Array<string>>(property, []);
        const new_list = [...current_list, new_item];
        await vscode.workspace.getConfiguration(`${constants.extname}`).update(property, new_list, vscode.ConfigurationTarget.Workspace);
    }

    private get_config_property<T>(property : string, default_value : T ) {
        return vscode.workspace.getConfiguration(`${constants.extname}`).get<T>(property, default_value);
    }    
}