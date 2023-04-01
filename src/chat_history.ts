export interface ChatMessage {
    prompt: string
    response: string
    summarizedMessages : Array<ChatMessage>
}

export interface Summarization {
    response: string
    summarizedMessages : Array<ChatMessage|Summarization>
}

export class ChatHistory {

    private chatMessages : Array<ChatMessage|Summarization>;

    constructor(chatMessages? : Array<ChatMessage|Summarization>|null) {
        this.chatMessages = chatMessages || [];
    }

    record_prompt_and_response(prompt: string, response: string) {
        this.chatMessages.push({
            prompt: prompt,
            response: response,
            summarizedMessages: []
        })
    }

    condense_prompts_and_responses(response: string) {
        this.chatMessages = [
            {
                response: response,
                summarizedMessages: this.chatMessages
            }
        ]
    }

    get_history() {
        return this.chatMessages;
    }
    
}