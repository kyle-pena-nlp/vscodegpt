import { AICommandPanel } from "./ai_command_panel";
import { WorkspaceConfiguration } from "./workspace_configuration";
import { AICommandDispatcher } from "./ai_command_dispatcher";
import { AICommandParser } from "./ai_command_parser";
import { UI } from "./ui"
import { ChatGPTClient,  } from "./chat_gpt_client";
import { PROMPTS, COMMAND_GRAMMARS } from "./prompts";
import { ChatHistory } from "./chat_history";
import { OpenAIApi, Configuration, CreateChatCompletionRequest, ChatCompletionRequestMessage, ChatCompletionRequestMessageRoleEnum } from 'openai';
import * as vscode from 'vscode';

interface ChatResponse {
    success : boolean
    next_state : string|null
    error : string|null
}

export class AIAssistantWorker {

    private workspace_configuration : WorkspaceConfiguration;
    private ai_command_panel : AICommandPanel;
    private chat_history : ChatHistory;
    private ai_command_dispatcher : AICommandDispatcher;
    private ai_command_parser : AICommandParser;
    private ui : UI;
    private chat_gpt_client : ChatGPTClient;
    private state : string;

    constructor(ai_command_panel : AICommandPanel, context : vscode.ExtensionContext) {
        this.workspace_configuration = new WorkspaceConfiguration(context)
        this.ai_command_panel = ai_command_panel;
        this.chat_history = new ChatHistory();
        this.ai_command_dispatcher = new AICommandDispatcher(context);
        this.ai_command_parser = new AICommandParser();
        this.ui = new UI();
        this.chat_gpt_client = new ChatGPTClient(context);
        this.state = "idle";
    }    

    async poll() {
        await this.ask_AI_what_to_do();
    }

    private async ask_AI_what_to_do() {

        if (this.state == "idle") {
            this.state = await this.AI_chooses_next_step();
        }
        else if (this.state == "coding") {
            return null;
            /*
            const action = await this.ask_AI_for_recommended_action();
            this.workspace_configuration.add_recommended_action(action);
            this.ai_command_panel.refresh();
            */
            this.state = "idle";
        }
        else if (this.state == "inspecting") {
            return null;
            /*
            const inspectionActions = await this.ask_AI_to_inspect_filesystem();
            this.ai_command_dispatcher.dispatch_commands(inspectionActions);
            this.ai_command_panel.refresh();
            */
            this.state = "idle";
        }
        else if (this.state == "summarizing") {

            return null;
            
            /*
            const goalSummarization = await this.ask_AI_to_summarize_goals();
            this.workspace_configuration.replace_goals_and_clarifications_with_summarizations(goalSummarization, this.get_goals_and_clarifications_and_summarizations());
            
            const workspaceSummarization = await this.ask_AI_to_summarize_workspace();
            this.workspace_configuration.replace_workspace_fs_with_summarization(workspaceSummarization, this.get_workspace_descriptions());

            const fileSummarizations = await this.ask_AI_to_summarize_files();
            this.workspace_configuration.replace_file_contents_with_summarizations(fileSummarizations, this.get_file_descriptions());
            */
           this.state = "idle";
        }
        else if (this.state == "clarifying") {
            return null;
            /*
            const clarificationQuestion = await this.ask_AI_for_clarification_question();
            this.workspace_configuration.add_clarification_question(clarificationQuestion);
            */
            this.state = "idle";
        }
        else if (this.state == "notifying") {
            return null;
        }
        else if (this.state == "badAPIkey") {

        }
        else if (this.state == "rateLimited") {

        }
        else {
            return null;
        }
    }

    private async ask_AI_to_choose_next_step() {
        
        const context_items = new Map<string,Array<string>>();

        const goals = await this.workspace_configuration.get_AI_goals();
        this.build_context(context_items, goals);
        
        const clarifications = await this.workspace_configuration.get_AI_clarifications();
        this.build_context(context_items, clarifications);

        const goalSummarizations = await this.workspace_configuration.get_goal_summarizations();
        this.build_context(context_items, goalSummarizations);

        const workspace_fs_info = await this.workspace_configuration.get_workspace_fs_info();
        this.build_context(context_items, workspace_fs_info);

        const workspace_fs_summarizations = await this.workspace_configuration.get_workspace_fs_summarizations();
        this.build_context(context_items, workspace_file_summarizations);

        const workspace_file_contents = await this.workspace_configuration.get_workspace_file_contents();
        this.build_context(context_items, workspace_file_contents);

        const workspace_file_summarizations = await this.workspace_configuration.get_workspace_file_summarizations();
        this.build_context(context_items, workspace_file_summarizations);

        await this.send_prompt_and_parse_response(PROMPTS.CHOOSE_NEXT_ACTION, context_items = context_items, GRAMMARS.CHOOSE_NEXT_ACTION);
    }

    private async send_prompt_and_parse_response(prompt_key : string, context_items : Map<string,Array<string>>) {

        const messages = this.build_messages(prompt_key, context_items);
        const response = await this.chat_gpt_client.respond(messages);
        
        if (response.bad_api_key) {

        }
        
        if (response.rate_limited) {

        }
        
        if (!response.success) {

        }

        const responseText = response.text;
        const command_grammars = COMMAND_GRAMMARS.get(prompt_key)!;
        const commands = this.ai_command_parser.parse_commands(responseText, command_grammars);

        return {
            success : true,
            commands : commands
        } as AIPromptResponse;
    }

    private build_messages(prompt_key : string, context_items : Map<string,Array<string>>) {
        
        const messages = [];
        const SYSTEM_ROLE = ChatCompletionRequestMessageRoleEnum.System;
        const USER_ROLE = ChatCompletionRequestMessageRoleEnum.User;

        for (const key of context_items.keys()) {
            const entries = context_items.get(key) || [];
            for (const entry of entries) {
                const contextMessageToAI = {
                    role : USER_ROLE,
                    content: `${key}: ${entry}`
                }
            }
        }

        // Per guidance, 3.5-turbo (v301) doesn't pay enough attention to system messages (https://platform.openai.com/docs/guides/chat/introduction)
        const ROLE_FOR_SYSTEM_MESSAGE = await this.workspace_configuration.get_AI_model() == "gpt-3.5-turbo" ? USER_ROLE : SYSTEM_ROLE;
        const prompt_text = PROMPTS.get(prompt_key)!;
        messages.push({ role: ROLE_FOR_SYSTEM_MESSAGE, content: prompt_text } as ChatCompletionRequestMessage);      

        return messages;
    }

}