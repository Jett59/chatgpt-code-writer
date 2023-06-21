import axios, { all } from "axios";

const OPENAI_KEY = process.env.OPENAI_API_KEY;

const DEFAULT_MODEL = 'gpt-3.5-turbo-16k-0613';

export interface ChatMessage {
    role: 'assistant' | 'user' | 'system';
    content?: string;
    functionCall?: {
        name: string;
        arguments: any;
    };
}

export interface Function {
    name: string;
    description: string;
    parameters: [{
        type: string;
        name: string;
        description: string;
        required: boolean;
    }];

    invoke: (parameters: any) => Promise<any>;
}

const CHAT_COMPLETIONS_URL = 'https://chatgpt-proxy.mycodefu.com/v1/chat/completions';

export async function generateMessage(history: ChatMessage[], functions: Function[]): Promise<ChatMessage[]> {
    let remainingRetries = 3;
    let generatedMessages: ChatMessage[] = [];
    while (remainingRetries-- > 0) {
        let allMessages = history.concat(generatedMessages);
        try {
            const response = await axios.post(CHAT_COMPLETIONS_URL, {
                model: DEFAULT_MODEL,
                temperature: 0.3,
                messages: allMessages.map(message => ({
                    role: message.role,
                    content: message.content ?? null,
                    function_call: message.functionCall ? {
                        name: message.functionCall.name,
                        arguments: JSON.stringify(message.functionCall.arguments),
                    } : undefined
                })),
                functions: functions.length > 0 ? functions.map(functionDescription => ({
                    name: functionDescription.name,
                    description: functionDescription.description,
                    parameters: {
                        type: 'object',
                        properties: functionDescription.parameters.reduce<any>((properties, parameter) => {
                            properties[parameter.name] = {
                                type: parameter.type,
                                description: parameter.description
                            };
                            return properties;
                        }, {}),
                    },
                    required: functionDescription.parameters.filter(parameter => parameter.required).map(parameter => parameter.name)
                })) : undefined,
            }, {
                headers: {
                    Authorization: `Bearer ${OPENAI_KEY}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.status !== 200) {
                throw new Error(`Unexpected status code ${response.status}`);
            }

            if (response.data.choices && response.data.choices.length === 1) {
                let generatedMessage = response.data.choices[0];
                if (generatedMessage.content) {
                    generatedMessages.push({
                        role: 'assistant',
                        content: generatedMessage.content
                    });
                    return generatedMessages;
                } else if (generatedMessage.function_call) {
                    let functionName = generatedMessage.function_call.name;
                    let functionArguments = JSON.parse(generatedMessage.function_call.arguments);
                    let functionDescriptor = functions.find(functionDescription => functionDescription.name === functionName);
                    if (!functionDescriptor) {
                        throw new Error(`Unknown function ${functionName}`);
                    } else {
                        generatedMessages.push({
                            role: 'assistant',
                            functionCall: {
                                name: functionName,
                                arguments: functionArguments
                            }
                        });
                        // Call the function.
                        let functionResult = await functionDescriptor.invoke(functionArguments);
                        generatedMessages.push({
                            role: 'system',
                            content: functionResult
                        });
                        remainingRetries++;
                    }
                } else {
                    throw new Error('Unexpected response from OpenAI (doesn\'t include a content or function_call)');
                }
            }
        } catch (error: any) {
            if (error.response && error.response.data && error.response.data.error && error.response.data.error.type === 'server_error') {
                continue;
            } else {
                throw error;
            }
        }
    }
    throw new Error('Retries exceeded');
}
