import { CssBaseline, ThemeProvider, createTheme, useMediaQuery } from '@mui/material';
import React from 'react';
import { useApiKeyStorage, ApiKeyContext } from './api';
import Toolbar from './Toolbar';
import ProjectViewer from './ProjectViewer';

export default function App() {
    const shouldUseDarkMode = useMediaQuery('(prefers-color-scheme: dark)');

    const theme = createTheme({
        palette: {
            mode: shouldUseDarkMode ? 'dark' : 'light',
        },
    });

    const [apiKey, setApiKey] = useApiKeyStorage();

    return <ThemeProvider theme={theme}>
        <CssBaseline />
        <Toolbar apiKey={apiKey} setApiKey={setApiKey} />
        <ApiKeyContext.Provider value={apiKey}>
            <ProjectViewer />
        </ApiKeyContext.Provider>
    </ThemeProvider>
}
