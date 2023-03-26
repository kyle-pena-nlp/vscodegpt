import { AICommandDispatcher } from "./ai_command_dispatcher";
import { AICommandParser } from "./ai_command_parser";
import { WorkspaceConfiguration } from "./workspace_configuration";
import { UI } from "./ui"
import { ChatGPTClient } from "./chat_gpt_client";
import { prompt_map } from "./prompts";
import { OpenAIApi, Configuration, CreateChatCompletionRequest, ChatCompletionRequestMessage, ChatCompletionRequestMessageRoleEnum } from 'openai';

export class AIAssistanceWorker {

    private apiKey : string;
    private ai_command_dispatcher : AICommandDispatcher;
    private ai_command_parser : AICommandParser;
    private workspace_configuration : WorkspaceConfiguration;
    private ui : UI;
    private chat_gpt_client : ChatGPTClient;
    private context : Map<string,string>;
    private definitions : Map<string,string>;

    constructor(apiKey : string) {
        this.apiKey = apiKey;
        this.ai_command_dispatcher = new AICommandDispatcher();
        this.ai_command_parser = new AICommandParser();
        this.workspace_configuration = new WorkspaceConfiguration();
        this.ui = new UI();
        this.chat_gpt_client = new ChatGPTClient(this.apiKey, 'gpt-3.5-turbo');
        this.context = new Map<string,string>();
        this.definitions = new Map<string,string>();
    }

    set_model(model : string) {
        this.chat_gpt_client.set_model(model);
    }

    async poll() {

        const goals = this.workspace_configuration.get_AI_goals();
        
        if (!goals) {
            const goal = await this.ui.prompt_for_goal();
            if (goal) {
                await this.workspace_configuration.add_AI_goal(goal);
            }
            return;
        }

        const prompt_response = await this.build_and_send_prompt();
        if (prompt_response) {
            const commands = this.ai_command_parser.parse_commands(prompt_response);
            if (commands) {
                this.ai_command_dispatcher.dispatch_commands(commands, this.definitions, this.context);
            }
        }
    }

    async build_and_send_prompt() {
        const goals = this.workspace_configuration.get_AI_goals();
        if (!goals) {
            return;
        }
        const messages = (await this.build_messages()) || [];
        const response = await this.chat_gpt_client.respond(messages);
        return response;
    }

    async build_messages() {

        const messages : Array<ChatCompletionRequestMessage> = [];

        const SYSTEM_ROLE = ChatCompletionRequestMessageRoleEnum.System;
        const USER_ROLE = ChatCompletionRequestMessageRoleEnum.User;
        const MAIN_PROMPT = prompt_map.get("MAIN_PROMPT");

        messages.push({ role: USER_ROLE, content: MAIN_PROMPT } as ChatCompletionRequestMessage);

        for (const context_key of this.context.keys()) {
            messages.push({ role : USER_ROLE, content: this.build_context_message(context_key, this.context.get(context_key) || "") } as ChatCompletionRequestMessage);
        }

        const goals = await this.workspace_configuration.get_AI_goals();
        if (goals) {
            for (const goal of goals) {
                messages.push({ role : USER_ROLE, content: this.build_goal_message(goal) } as ChatCompletionRequestMessage);
            }
        }
        
        return messages;
    }

    build_context_message(context_key : string, context_value : string) {
        if (context_key && context_value) {
            return [`For CONTEXT about ${context_key}`, context_value].join("\n");
        }
    }

    build_goal_message(goal : string) {
        return `GOAL: ${goal}`;
    }
}