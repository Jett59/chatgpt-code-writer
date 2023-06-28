import axios from "axios";

async function sleep(duration: number): Promise<void> {
    return new Promise<void>(resolve => setTimeout(resolve, duration));
}

const OPENAI_KEY = process.env.OPENAI_API_KEY;

const DEFAULT_MODEL = 'gpt-3.5-turbo-0613';
const DEFAULT_16K_MODEL = 'gpt-3.5-turbo-16k-0613';

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
    parameters: {
        type: string;
        name: string;
        description: string;
        required: boolean;
    }[];

    invoke: (parameters: any) => Promise<any>;
}

const CHAT_COMPLETIONS_PATH = 'v1/chat/completions';
const DEFAULT_OPENAI_DOMAIN = 'https://api.openai.com';
const BACKUP_OPENAI_DOMAIN = 'https://chatgpt-proxy.mycodefu.com';

export async function generateMessage(history: ChatMessage[], functions: Function[]): Promise<ChatMessage[]> {
    let currentModel = DEFAULT_MODEL;
    let currentOpenaiDomain = DEFAULT_OPENAI_DOMAIN;
    let remainingRetries = 3;
    let lastError = null;
    let generatedMessages: ChatMessage[] = [];
    while (remainingRetries-- > 0) {
        let allMessages = history.concat(generatedMessages);
        try {
            const response = await axios.post(`${currentOpenaiDomain}/${CHAT_COMPLETIONS_PATH}`, {
                model: currentModel,
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

            if (response.data.choices && response.data.choices.length === 1 && response.data.choices[0].message) {
                let generatedMessage = response.data.choices[0].message;
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
                        continue;
                    }
                } else {
                    throw new Error('Unexpected response from OpenAI (doesn\'t include a content or function_call)');
                }
            }
        } catch (error: any) {
            // If the connection was reset, it may be that the domain was blocked by a proxy.
            // In this case we try the backup domain in case it isn't blocked.
            if (error.cause && error.cause.code === 'ECONNRESET' && currentOpenaiDomain === DEFAULT_OPENAI_DOMAIN) {
                currentOpenaiDomain = BACKUP_OPENAI_DOMAIN;
                remainingRetries++;
                continue;
            } else if (error.response && error.response.data && error.response.data.error && error.response.data.error.type === 'server_error' || error.response && error.response.data && error.response.data.message === 'Service Unavailable') {
                console.log('OpenAI server error, retrying...');
                await sleep(1000);
                lastError = error;
                continue;
            } else if (error.response && error.response.data && error.response.data.error && error.response.data.error.code === 'context_length_exceeded') {
                if (currentModel === DEFAULT_MODEL) {
                    currentModel = DEFAULT_16K_MODEL;
                    remainingRetries++;
                    continue;
                } else {
                    throw error;
                }
            } else {
                throw error;
            }
        }
    }
    throw lastError;
}
