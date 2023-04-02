
import { OpenAIApi, Configuration, CreateChatCompletionRequest, ChatCompletionRequestMessage, ChatCompletionRequestMessageRoleEnum } from 'openai';
import { WorkspaceConfiguration } from './workspace_configuration';
import * as vscode from 'vscode';

export interface ChatGPTResponse {
    success : boolean,
    text: string,
    status: number|null,
    finish_reason : string|null,
    prompt_tokens: number|null,
    completion_tokens: number|null, 
    total_tokens: number|null,
    rate_limited: boolean|null,
    bad_api_key : boolean|null
}

export class ChatGPTClient{

    private workspace_configuration : WorkspaceConfiguration;

    constructor(context : vscode.ExtensionContext) {
        this.workspace_configuration = new WorkspaceConfiguration(context);		
    }

    async respond(chatGPTMessages: Array<ChatCompletionRequestMessage>) {


        const configuration = new Configuration({
            apiKey: await this.workspace_configuration.get_apiKey()
        });

        const openAI = new OpenAIApi(configuration);

        const model = await this.workspace_configuration.get_AI_model();

        try {

            const request: CreateChatCompletionRequest = {
                messages: chatGPTMessages,
                model: model
            };

            const response = await openAI.createChatCompletion(request);

            if (!response.data || !response.data.choices) {
                
                return {
                    success: false,
                    text: response.statusText,
                    status: response.status,
                    finish_reason: null,
                    prompt_tokens: null,
                    completion_tokens: null,
                    total_tokens : null,
                    rate_limited: response.status == 429,
                    bad_api_key: response.status == 401
                } as ChatGPTResponse;
            }

            return {
                success: true,
                text: response.data.choices[0].message?.content,
                status: response.status,
                finish_reason: response.data.choices[0].finish_reason,
                prompt_tokens: response.data.usage?.prompt_tokens,
                completion_tokens: response.data.usage?.completion_tokens,
                total_tokens: response.data.usage?.total_tokens,
                rate_limited: response.status == 429,
                bad_api_key: response.status == 401
            } as ChatGPTResponse;
        } catch (error : any) {
			return {
                success: false,
                text: error,
                status: null,
                finish_reason: null,
                prompt_tokens: null,
                completion_tokens: null,
                total_tokens : null,  
                rate_limited: null,
                bad_api_key: null                          
            } as ChatGPTResponse
        }
    }
}