import * as vscode from 'vscode';
import { WorkspaceConfiguration } from "./workspace_configuration";
import { UI } from "./ui";
const minimatch = require("minimatch");

export class Permissions {

    private workspace_configuration : WorkspaceConfiguration;
    private ui : UI;

    constructor() {
        this.workspace_configuration = new WorkspaceConfiguration();
        this.ui = new UI();
    }

    async maybeAskToReadFile(uri : vscode.Uri) {
        return (await this.maybeAskToReadUri(uri));
    }

    async maybeAskToReadFilesystem(uri : vscode.Uri) {
        return (await this.maybeAskToReadUri(uri));
    }

    async maybeAskToReadUri(uri : vscode.Uri) {

        if (await this.deny_read(uri)) {
            return false;
        }

        if (await this.allow_read(uri)) {
            return true;
        }

        const answer = (await this.ui.ask_allow_read_perm(uri)) || "";

        const extension_pattern = this.get_extension_pattern(uri);

        if (answer == "Y") {
            this.workspace_configuration.add_AI_allow_read_file_patterns(uri.path);
            return true;
        }
        else if (answer == "Y*" && extension_pattern) {
            this.workspace_configuration.add_AI_allow_read_file_patterns(extension_pattern);
            return true;
        }
        else if (answer == "N") {
            this.workspace_configuration.add_AI_deny_read_file_pattern(uri.path);
            return false;
        }
        else if (answer == "N*" && extension_pattern) {
            this.workspace_configuration.add_AI_deny_read_file_pattern(extension_pattern);
            return false;
        }
    }
    

    async maybeAskToMove(from : vscode.Uri, to : vscode.Uri) {
        return (await this.maybeAskToCreateFile(to));
    }

    async maybeAskToCreateFile(uri : vscode.Uri) {
        if (await this.deny_write(uri)) {
            return false;
        }

        if (await this.allow_write(uri)) {
            return true;
        }

        const answer = (await this.ui.ask_allow_write_perm(uri)) || "";

        const extension_pattern = this.get_extension_pattern(uri);

        if (answer == "Y") {
            this.workspace_configuration.add_AI_allow_write_file_patterns(uri.path);
            return true;
        }
        else if (answer == "Y*" && extension_pattern) {
            this.workspace_configuration.add_AI_allow_write_file_patterns(extension_pattern);
            return true;
        }
        else if (answer == "N") {
            this.workspace_configuration.add_AI_deny_write_file_pattern(uri.path);
            return false;
        }
        else if (answer == "N*" && extension_pattern) {
            this.workspace_configuration.add_AI_deny_write_file_pattern(extension_pattern);
            return false;
        }
    }

    async maybeAskToCreateDir(uri : vscode.Uri) {
        return (await this.maybeAskToCreateFile(uri));
    }

    private get_extension_pattern(uri : vscode.Uri) {
        const ext = uri.path.match(/\.([^./\\]+)$/)?.[1];
        const glob_pattern = `**/*.${ext}`;
        return glob_pattern;
    }

    private async allow_read(uri : vscode.Uri) {
        const path = uri.path;
        for (const pattern of (await this.workspace_configuration.get_AI_allow_read_file_patterns())) {
            if (this.glob_matches(pattern, path)) {
                return true;
            }
        }
        return false;
    }

    private async deny_read(uri : vscode.Uri) {
        const path = uri.path;
        for (const pattern of (await this.workspace_configuration.get_AI_deny_read_file_patterns())) {
            if (this.glob_matches(pattern, path)) {
                return true;
            }
        }
        return false;
    }

    private async allow_write(uri : vscode.Uri) {
        const path = uri.path;
        for (const pattern of (await this.workspace_configuration.get_AI_allow_write_file_patterns())) {
            if (this.glob_matches(pattern, path)) {
                return true;
            }
        }
        return false;
    }

    private async deny_write(uri : vscode.Uri) {
        const path = uri.path;
        for (const pattern of (await this.workspace_configuration.get_AI_deny_write_file_patterns())) {
            if (this.glob_matches(pattern, path)) {
                return true;
            }
        }
        return false;
    }

    private glob_matches(pattern : string, path : string) {
        const isMatch = minimatch(path, pattern);
        return isMatch;
    }
}