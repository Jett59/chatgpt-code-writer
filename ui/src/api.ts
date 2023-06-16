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
