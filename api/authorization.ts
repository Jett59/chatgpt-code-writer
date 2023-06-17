import { RequestHandler } from "express";

const API_KEYS = process.env.CHATGPT_CODE_WRITER_API_KEYS?.split(',') ?? []

export function checkAuthorization(): RequestHandler {
    return (request, result, next) => {
        if (!request.path.startsWith('/api')) {
            next();
            return true;
        }

        const authHeader = request.headers['authorization'];
        if (authHeader === undefined) {
            result.status(401).send('Missing authorization header');
            return false;
        }

        if (!authHeader.startsWith('Bearer ')) {
            result.status(401).send('Invalid authorization header');
            return false;
        }

        const apiKey = authHeader.substring('Bearer '.length);
        if (API_KEYS.indexOf(apiKey) === -1) {
            result.status(401).send('Invalid API key');
            return false;
        }

        next();
        return true;
    };
}
