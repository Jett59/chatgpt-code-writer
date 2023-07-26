import React, { useEffect, useState } from "react";

export interface ApiResponse<T> {
    statusCode: number;
    data?: T;
    message?: string;
}

export type Method = 'GET' | 'POST' | 'PUT' | 'DELETE';

const API_HOST = 'localhost:3001';
const API_BASE_URL = `http://${API_HOST}/api/`;

export class Api {
    private path: string;
    private method: Method;

    constructor(path: string, method: Method) {
        this.path = path;
        this.method = method;
    }

    async request<Request, Response>(body?: Request): Promise<ApiResponse<Response>> {
        const headers: any = {
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
    return new Api(path, method);
}

export function openWebSocket() {
    return new WebSocket(`ws://${API_HOST}`);
}
