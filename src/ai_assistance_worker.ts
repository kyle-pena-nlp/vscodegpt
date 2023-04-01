import { AICommandDispatcher } from "./ai_command_dispatcher";
import { AICommandParser } from "./ai_command_parser";
import { WorkspaceConfiguration } from "./workspace_configuration";
import { UI } from "./ui"
import { ChatGPTClient,  } from "./chat_gpt_client";
import { MAIN_PROMPT } from "./prompts";
import { ChatHistory } from "./chat_history";
import { OpenAIApi, Configuration, CreateChatCompletionRequest, ChatCompletionRequestMessage, ChatCompletionRequestMessageRoleEnum } from 'openai';

export class AIAssistanceWorker {

    private apiKey : string;
    private chat_history : ChatHistory;
    private ai_command_dispatcher : AICommandDispatcher;
    private ai_command_parser : AICommandParser;
    private workspace_configuration : WorkspaceConfiguration;
    private ui : UI;
    private chat_gpt_client : ChatGPTClient;
    private context : Map<string,string>;
    private definitions : Map<string,string>;

    constructor() {

        this.chat_history = new ChatHistory();
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

        const goals = await this.workspace_configuration.get_AI_goals();
        
        // ask for goals if there are none
        if (goals.length === 0) {
            const goal = await this.ui.prompt_for_goal();
            if (goal) {
                await this.workspace_configuration.add_AI_goal(goal);
            }
            return;
        }

        // automatically apply commands otherwise.
        // if (mode == "UNATTENDED") { ...

        let retries = 0;

        while (true) {
            
            if (retries >= 2) {
                break;
            }

            const prompt_response = await this.build_and_send_prompt();
            if (prompt_response && prompt_response.success) {
                const commands = this.ai_command_parser.parse_commands(prompt_response.text);
                if (commands.length) {
                    await this.ai_command_dispatcher.dispatch_commands(commands, this.definitions, this.context);
                    break;
                }
            }

            retries++;
        }
    }

    async get_AI_response(messages : Array<ChatCompletionRequestMessage>) {
        const response = await this.chat_gpt_client.respond(messages);
    }

    /*async summarize_chat_history() {
        const chat_messages = this.build_chat_history_messages()
        const summarize_it_all_messages = chat_messages.push(this.summarize_conversation_prompt_message())
        const response = this.get_AI_response(summarize_it_all_messages);
        this.chat_history.condense_prompts_and_responses(response);
    }*/

    async remind_ai_to_use_commands() {
        const messages = []; //this.build_chat_history_messages()
        const USER_ROLE = ChatCompletionRequestMessageRoleEnum.User;
        messages.push({ role : USER_ROLE, content: "Revise your response to use only commands." } as ChatCompletionRequestMessage);
        const response = await this.chat_gpt_client.respond(messages);
        return response;
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

        // Per guidance, 3.5-turbo (v301) doesn't pay enough attention to system messages (https://platform.openai.com/docs/guides/chat/introduction)
        const ROLE_FOR_SYSTEM_MESSAGE = this.chat_gpt_client.get_model() == "gpt-3.5-turbo" ? USER_ROLE : SYSTEM_ROLE;

        messages.push({ role: ROLE_FOR_SYSTEM_MESSAGE, content: MAIN_PROMPT } as ChatCompletionRequestMessage);

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