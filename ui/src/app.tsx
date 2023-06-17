import { CssBaseline, ThemeProvider, createTheme, useMediaQuery } from '@mui/material';
import React from 'react';
import { useApiKeyStorage, ApiKeyContext } from './api';
import Toolbar from './Toolbar';
import ProjectViewer, { projectContext, useProjectsStorage } from './ProjectViewer';
import { HashRouter, Route, Routes } from 'react-router-dom';
import NewProject from './NewProject';

export default function App() {
    const shouldUseDarkMode = useMediaQuery('(prefers-color-scheme: dark)');

    const theme = createTheme({
        palette: {
            mode: shouldUseDarkMode ? 'dark' : 'light',
        },
    });

    const [apiKey, setApiKey] = useApiKeyStorage();
    const [projects, setProjects] = useProjectsStorage();

    return <ThemeProvider theme={theme}>
        <CssBaseline />
        <Toolbar apiKey={apiKey} setApiKey={setApiKey} />
        <ApiKeyContext.Provider value={apiKey}>
            <projectContext.Provider value={{ projects, setProjects }}>
                <HashRouter>
                    <Routes>
                        <Route index element={<ProjectViewer />} />
                        <Route path="/project/new" element={<NewProject />} />
                    </Routes>
                </HashRouter>
            </projectContext.Provider>
        </ApiKeyContext.Provider>
    </ThemeProvider>
}
