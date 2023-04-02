import { AICommandPanel } from "./ai_command_panel";
import { WorkspaceConfiguration } from "./workspace_configuration";
import { AICommandDispatcher } from "./ai_command_dispatcher";
import { AICommandParser } from "./ai_command_parser";
import { UI } from "./ui"
import { ChatGPTClient,  } from "./chat_gpt_client";
import { MAIN_PROMPT } from "./prompts";
import { ChatHistory } from "./chat_history";
import { OpenAIApi, Configuration, CreateChatCompletionRequest, ChatCompletionRequestMessage, ChatCompletionRequestMessageRoleEnum } from 'openai';
import * as vscode from 'vscode';

export class AIAssistantWorker {

    private workspace_configuration : WorkspaceConfiguration;
    private ai_command_panel : AICommandPanel;
    private chat_history : ChatHistory;
    private ai_command_dispatcher : AICommandDispatcher;
    private ai_command_parser : AICommandParser;
    private ui : UI;
    private chat_gpt_client : ChatGPTClient;

    constructor(ai_command_panel : AICommandPanel, context : vscode.ExtensionContext) {
        this.workspace_configuration = new WorkspaceConfiguration(context)
        this.ai_command_panel = ai_command_panel;
        this.chat_history = new ChatHistory();
        this.ai_command_dispatcher = new AICommandDispatcher(context);
        this.ai_command_parser = new AICommandParser();
        this.ui = new UI();
        this.chat_gpt_client = new ChatGPTClient(context);
    }    

    async poll() {
        const recommendedActions = await this.workspace_configuration.get_recommended_actions();
        if (recommendedActions.length > 0) {
            return;
        }
        const prompt_response = await this.build_and_send_prompt();
        if (!prompt_response) {
            console.log("No response");
            return;
        }        
        if (prompt_response.bad_api_key) {
            // tell the user somehow in command panel
            console.log("bad api key");
            return;
        }
        else if (prompt_response.rate_limited) {
            // tell the user somehow in command panel
            console.log("Rate limited");
            return;
        }
        else if (!prompt_response.success) {
            console.log(prompt_response.text);
            return;
        }
        const prompt_response_text = prompt_response.text;
        const action = this.ai_command_parser.parse_action(prompt_response_text);
        if (!action || action.commands.length == 0) {
            console.log("Could not parse prompt response into action");
            return;
        }
        this.workspace_configuration.add_recommended_action(action);
        this.ai_command_panel.refresh();
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
        const goals = await this.workspace_configuration.get_AI_goals();
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

        const model = await this.workspace_configuration.get_AI_model();

        // Per guidance, 3.5-turbo (v301) doesn't pay enough attention to system messages (https://platform.openai.com/docs/guides/chat/introduction)
        const ROLE_FOR_SYSTEM_MESSAGE = model == "gpt-3.5-turbo" ? USER_ROLE : SYSTEM_ROLE;

        messages.push({ role: ROLE_FOR_SYSTEM_MESSAGE, content: MAIN_PROMPT } as ChatCompletionRequestMessage);

        const command_execution_context = await this.workspace_configuration.get_command_execution_context();
        const command_execution_definitions = await this.workspace_configuration.get_command_execution_definitions();

        for (const context_key of command_execution_context.keys()) {
            messages.push({ role : USER_ROLE, content: this.build_context_message(context_key, command_execution_definitions.get(context_key) || "") } as ChatCompletionRequestMessage);
        }

        const goals = await this.workspace_configuration.get_AI_goals();
        if (goals) {
            for (const goal of goals) {
                messages.push({ role : USER_ROLE, content: this.build_goal_message(goal.description) } as ChatCompletionRequestMessage);
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