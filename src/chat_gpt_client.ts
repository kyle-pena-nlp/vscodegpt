
import { OpenAIApi, Configuration, CreateChatCompletionRequest, ChatCompletionRequestMessage, ChatCompletionRequestMessageRoleEnum } from 'openai';

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
                    status: response.status
                };
            }

            return {
                success: true,
                text: response.data.choices[0].message?.content,
                status: response.status
            };
        } catch (error : any) {
			return {
                success: false,
                text: error,
                status: null
            }
        }
    }
}