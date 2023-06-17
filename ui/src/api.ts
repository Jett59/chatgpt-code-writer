import React, { useEffect, useState } from "react";

const LOCAL_STORAGE_API_KEY_KEY = 'api_key';

export function useApiKeyStorage(): [string | null, (apiKey: string | null) => void] {
    const [apiKey, setApiKey] = useState<string | null>(() => localStorage.getItem(LOCAL_STORAGE_API_KEY_KEY));

    useEffect(() => {
        if (apiKey !== null) {
            localStorage.setItem(LOCAL_STORAGE_API_KEY_KEY, apiKey);
        } else {
            localStorage.removeItem(LOCAL_STORAGE_API_KEY_KEY);
        }
    }, [apiKey]);

    return [apiKey, setApiKey];
}

export const ApiKeyContext = React.createContext<string | null>(null);

export const useApiKey = () => React.useContext(ApiKeyContext);

export interface ApiResponse<T> {
    statusCode: number;
    data?: T;
    message?: string;
}

export type Method = 'GET' | 'POST' | 'PUT' | 'DELETE';

const API_BASE_URL = 'http://localhost:3001/api/';

export class Api {
    private apiKey: string;
    private path: string;
    private method: Method;

    constructor(apiKey: string, path: string, method: Method) {
        this.apiKey = apiKey;
        this.path = path;
        this.method = method;
    }

    async request<Request, Response>(body?: Request): Promise<ApiResponse<Response>> {
        const headers: any = {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
        };

        try {
            const response = await fetch(API_BASE_URL + this.path, {
                method: this.method,
                headers: headers,
                body: body !== undefined ? JSON.stringify(body) : undefined,
            });

            if (response.status < 200 || response.status >= 300) {
                return {
                    statusCode: response.status,
                    message: await response.text(),
                };
            }

            const responseBody = await response.json();

            return {
                statusCode: response.status,
                data: responseBody,
            };
        } catch (error: any) {
            return {
                statusCode: 0,
                message: error.message + ' (the devtools might help here)',
            };
        }
    }
}

export function useApi(path: string, method: Method): Api {
    const apiKey = useApiKey();
    return new Api(apiKey ?? '', path, method);
}
