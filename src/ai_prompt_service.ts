
import * as vscode from "vscode";
import { ChatCompletionRequestMessage, ChatCompletionRequestMessageRoleEnum } from 'openai';
import { PROMPTS } from "./prompts";
import { ChatGPTClient } from "./chat_gpt_client";
import { WorkspaceConfiguration } from "./workspace_configuration";
import { AICommandParser } from "./ai_command_parser";
import { AICommand } from "./ai_com_types";

export class AIPromptService {

    private chatClient : ChatGPTClient;
    private workspace_configuration : WorkspaceConfiguration;

    constructor(context : vscode.ExtensionContext) {
        this.workspace_configuration = new WorkspaceConfiguration(context);
        this.chatClient = new ChatGPTClient(context);
    }

    async getCommandResponse(prompt_key : string, promptText : string, context?: Map<string,string>) : Promise<AICommand[]> {
        const responseText = await this.getTextResponse(prompt_key, promptText, context || new Map<string,string>());
        if (!responseText) {
            return [];
        }
        const promptDef = PROMPTS.get(prompt_key)!;
        const prompt = promptDef.prompt;
        const commandGrammars = Object.values(promptDef.responseGrammar);
        const parser = new AICommandParser(commandGrammars);
        const commands = parser.parse_commands(responseText);  
        return commands;      
    }

    async getTextResponse(prompt_key : string, promptText : string, context? : Map<string,string>) : Promise<string|null> {        
        const promptDef = PROMPTS.get(prompt_key)!;
        const prompt = promptDef.prompt;
        const request = await this.buildRequest(prompt, promptText, context || new Map<string,string>());
        const response = await this.chatClient.respond(request);

        if (response.bad_api_key) {
            return null;
        }
        
        if (response.rate_limited) {
            return null;
        }
        
        if (!response.success) {
            return null;
        }

        const responseText = response.text;

        return responseText;
    }
 
    private async buildRequest(prompt : string, promptText: string, context_items : Map<string,string>) {

        const messages = [];
        const SYSTEM_ROLE = ChatCompletionRequestMessageRoleEnum.System;
        const USER_ROLE = ChatCompletionRequestMessageRoleEnum.User;

        // Per guidance, 3.5-turbo (v301) doesn't pay enough attention to system messages (https://platform.openai.com/docs/guides/chat/introduction)
        const ROLE_FOR_SYSTEM_MESSAGE = await this.workspace_configuration.get_AI_model() == "gpt-3.5-turbo" ? USER_ROLE : SYSTEM_ROLE;
        messages.push({ role: ROLE_FOR_SYSTEM_MESSAGE, content: prompt } as ChatCompletionRequestMessage);      

        for (const key of context_items.keys()) {
            const entry = context_items.get(key);
            if (!entry) {
                continue;
            }
            const contextMessageToAI = {
                role : USER_ROLE,
                content: `${key}: ${entry}`
            }
            messages.push(contextMessageToAI);
        }

        messages.push({ role : USER_ROLE, content: "Your assignment: " + promptText });

        return messages;        
    }
}