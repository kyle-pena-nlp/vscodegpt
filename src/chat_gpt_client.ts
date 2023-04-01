
import { OpenAIApi, Configuration, CreateChatCompletionRequest, ChatCompletionRequestMessage, ChatCompletionRequestMessageRoleEnum } from 'openai';

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

    private openAI: OpenAIApi;
    private model: string;

    constructor(apiKey : string, model : string) {
		
        const configuration = new Configuration({
            apiKey: apiKey,
        });
        this.openAI = new OpenAIApi(configuration);
        this.model = model;
    }

    set_model(model : string) {
        this.model = model;
    }

    get_model() {
        return this.model;
    }

    async respond(chatGPTMessages: Array<ChatCompletionRequestMessage>) {
        try {

            const request: CreateChatCompletionRequest = {
                messages: chatGPTMessages,
                model: this.model
            };

            const response = await this.openAI.createChatCompletion(request);

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