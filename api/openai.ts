import axios from "axios";

async function sleep(duration: number): Promise<void> {
    return new Promise<void>(resolve => setTimeout(resolve, duration));
}

const OPENAI_KEY = process.env.OPENAI_API_KEY;

const DEFAULT_MODEL = 'gpt-4';
const DEFAULT_16K_MODEL = 'gpt-4-32k';

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
        name: string;
        schemar: any;
        required: boolean;
    }[];

    // If it returns undefined, it is assumed that the function doesn't want to get a response from the model.
    invoke: (parameters: any) => Promise<string | void>;
}

const CHAT_COMPLETIONS_PATH = 'v1/chat/completions';
const DEFAULT_OPENAI_DOMAIN = 'https://api.openai.com';
const BACKUP_OPENAI_DOMAIN = 'https://chatgpt-proxy.mycodefu.com';

export async function generateMessage(history: ChatMessage[], functions: Function[]): Promise<ChatMessage[]> {
    let currentModel = DEFAULT_MODEL;
    let currentOpenaiDomain = DEFAULT_OPENAI_DOMAIN;
    const totalRetries = 3;
    let remainingRetries = totalRetries;
    let lastError = null;
    let generatedMessages: ChatMessage[] = [];
    while (remainingRetries-- > 0) {
        let allMessages = history.concat(generatedMessages);
        try {
            const response = await axios.post(`${currentOpenaiDomain}/${CHAT_COMPLETIONS_PATH}`, {
                model: currentModel,
                temperature: 0.1,
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
                            properties[parameter.name] = { ...parameter.schemar, name: parameter.name };
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
                        let functionResult = await functionDescriptor.invoke(functionArguments);
                        if (functionResult !== undefined) {
                            generatedMessages.push({
                                role: 'system',
                                content: functionResult
                            });
                            remainingRetries++;
                            continue;
                        } else {
                            return generatedMessages;
                        }
                    }
                } else {
                    throw new Error('Unexpected response from OpenAI (doesn\'t include a content or function_call)');
                }
            }
        } catch (error: any) {
            // If the connection was reset, it may be that the domain was blocked by a proxy (probably the school wifi).
            // In this case we try the backup domain in case it isn't blocked.
            if (error.cause && error.cause.code === 'ECONNRESET' && currentOpenaiDomain === DEFAULT_OPENAI_DOMAIN) {
                currentOpenaiDomain = BACKUP_OPENAI_DOMAIN;
                remainingRetries++;
                continue;
            } else if (error.response && error.response.data && error.response.data.error && error.response.data.error.type === 'server_error' || error.response && error.response.data && error.response.data.message === 'Service Unavailable') {
                console.log('OpenAI server error, retrying...');
                await sleep(1000 * (totalRetries - remainingRetries));
                lastError = error;
                continue;
            } else if (error.response && error.response.data && error.response.data.error && error.response.data.error.code === 'rate_limit_exceeded') {
                console.log('OpenAI rate limit exceeded, retrying...');
                // First wait for 20 seconds, then 40, then 60 (which should completely clear the rate limit).
                await sleep(20000 * (totalRetries - remainingRetries));
                lastError = new Error('OpenAI rate limit exceeded');
                continue;
            } else if (error.response && error.response.data && error.response.data.error && error.response.data.error.code === 'context_length_exceeded') {
                if (currentModel === DEFAULT_MODEL) {
                    currentModel = DEFAULT_16K_MODEL;
                    remainingRetries++;
                    continue;
                } else {
                    throw new Error('Context length exceeded');
                }
            } else {
                throw error;
            }
        }
    }
    throw lastError;
}
