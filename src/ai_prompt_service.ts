
import * as vscode from "vscode";
import { ChatCompletionRequestMessage, ChatCompletionRequestMessageRoleEnum } from 'openai';
import { PromptDef } from "./prompts";
import { ChatGPTClient } from "./chat_gpt_client";
import { WorkspaceConfiguration } from "./workspace_configuration";
import { AICommandParser } from "./ai_command_parser";
import { AICommand } from "./ai_com_types";

export type AIResponseError = 'BadAPIKey' | 'RateLimited' | 'TokenLimited' | 'OtherAPIError';
export type AIResponse = { response: string }

export class AIPromptService {

    private chatClient : ChatGPTClient;
    private workspace_configuration : WorkspaceConfiguration;

    constructor(context : vscode.ExtensionContext) {
        this.workspace_configuration = new WorkspaceConfiguration(context);
        this.chatClient = new ChatGPTClient(context);
    }

    async getCommandResponse(prompt_key : string, promptText : string, promptDefinitions : Map<string,PromptDef>, context?: Map<string,string>) : Promise<AICommand[]> {
        const responseText = await this.getTextResponse(prompt_key, promptText, promptDefinitions, context || new Map<string,string>());
        if (!responseText) {
            return [];
        }
        const promptDef = promptDefinitions.get(prompt_key)!;
        const commandGrammars = Object.values(promptDef.responseGrammar);
        const parser = new AICommandParser(commandGrammars);
        const commands = parser.parse_commands(responseText);  
        return commands;      
    }

    async getTextResponse(prompt_key : string, promptText : string, promptDefinitions : Map<string,PromptDef>, context? : Map<string,string>) : Promise<string|null> {        
        const promptDef = promptDefinitions.get(prompt_key)!;
        const systemPrompt = promptDef.prompt;


        if (systemPrompt) {
            console.debug(systemPrompt);
        }

        if (promptText) {
            console.debug(promptText);
        }

        const request = await this.buildRequest(systemPrompt, promptText, context || new Map<string,string>());
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

        console.debug(responseText);

        return responseText;
    }

    isFailureResponse<T>(value: T|AIResponseError) : value is AIResponseError {
        if (value == 'BadAPIKey') {
            return true;
        }
        else if (value == 'RateLimited') {
            return true;
        }
        else if (value == 'OtherAPIError') {
            return true;
        }
        else if (value == 'TokenLimited') {
            return true;
        }
        return false;
    }

    async getAIResponse(systemPrompt : string|null, userPrompt : string, context_items : Map<string,string>) : Promise<AIResponseError|AIResponse > {
        
        try {
            const request = await this.buildRequest(systemPrompt, userPrompt, context_items);
            const response = await this.chatClient.respond(request);
    
            if (response.bad_api_key) {
                return 'BadAPIKey';
            }
            
            if (response.rate_limited) {
                return 'RateLimited';
            }
    
            // TODO: detect when response is token limited
            
            if (!response.success) {
                return 'OtherAPIError';
            }
    
            const responseText = response.text;
    
            return { response: responseText };
        }
        catch(exception) {
            console.debug(exception);
            return 'OtherAPIError';
        }

    }
 
    private async buildRequest(systemPrompt : string|null, userPrompt: string, context_items : Map<string,string>) {

        const messages = [];
        const SYSTEM_ROLE = ChatCompletionRequestMessageRoleEnum.System;
        const USER_ROLE = ChatCompletionRequestMessageRoleEnum.User;

        // Per guidance, 3.5-turbo (v301) doesn't pay enough attention to system messages (https://platform.openai.com/docs/guides/chat/introduction)
        const ROLE_FOR_SYSTEM_MESSAGE = await this.workspace_configuration.get_AI_model() == "gpt-3.5-turbo" ? USER_ROLE : SYSTEM_ROLE;

        if (systemPrompt) {
            messages.push({ role: ROLE_FOR_SYSTEM_MESSAGE, content: systemPrompt } as ChatCompletionRequestMessage); 
        }     

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

        messages.push({ role : USER_ROLE, content: userPrompt });

        return messages;        
    }
}