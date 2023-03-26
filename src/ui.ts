import * as vscode from 'vscode';
const constants = require("./constants");

export class UI {
    constructor() {
    }

    async pick_model() {
        return await vscode.window.showQuickPick([ "gpt-4", "gpt-3.5-turbo", "text-davinci-003" ], { placeHolder: "Pick a ChatGPT model..." })
    }

    async prompt_for_goal() {
        return await vscode.window.showInputBox({ "prompt": "Describe your development goal", "placeHolder": "Enter your development goal..." });
    }

    async ask_allow_read_perm(uri : vscode.Uri) {
        const items = this.make_allow_perm_items(uri);
        const title = `'${constants.extname}' wants to read '${uri.path}'`;
        const selection = await vscode.window.showQuickPick([...items.keys()], { placeHolder: title }) || "";
        let response = items.get(selection);
        return response;
    }

    async ask_allow_write_perm(uri : vscode.Uri) {
        const items = this.make_allow_perm_items(uri);
        const title = `'${constants.extname}' wants to write to '${uri.path}'`;
        const selection = await vscode.window.showQuickPick([...items.keys()], { placeHolder: title }) || "";
        let response = items.get(selection);
        return response;        
    }

    async ask_user_for_clarification(prompt : string) {
        return await vscode.window.showInputBox({ "prompt": "Clarify: " + prompt, "placeHolder": "Enter your response..." });
    }

    private make_allow_perm_items(uri : vscode.Uri) {
        const ext = this.split_ext(uri);
        const YKEY = `Yes (just '${uri.path}')`;
        const YSTARKEY = `Yes (all '*.${ext}')`;
        const NKEY = `No (just '${uri.path}')`;
        const NSTARKEY = `No (all '*.${ext}')`;        
        if (ext) {
            return new Map([
                [YKEY, "Y"],
                [YSTARKEY, "Y*"],
                [NKEY, "N"],
                [NSTARKEY, "N*"]
            ]);
        }
        else {
            return new Map([
                [YKEY, "Y"],
                [NKEY, "N"]
            ]);
        }        
    }

    private split_ext(uri : vscode.Uri) {
        var re = /(?:\.([^./\\]+))?$/;
        return re.exec(uri.path)?.[1]
    }
}