import { CssBaseline, ThemeProvider, createTheme, useMediaQuery } from '@mui/material';
import React from 'react';
import { useApiKeyStorage, ApiKeyContext } from './api';
import Toolbar from './Toolbar';
import ProjectDashboard, { projectContext, useProjectsStorage } from './ProjectDashboard';
import { HashRouter, Route, Routes } from 'react-router-dom';
import NewProject from './NewProject';
import ProjectViewer from './ProjectViewer';
import NewFeature from './NewFeature';

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
                        <Route index element={<ProjectDashboard />} />
                        <Route path="/project/new" element={<NewProject />} />
                        <Route path="/project/:owner/:repo" element={<ProjectViewer />} />
                        <Route path="/project/:owner/:repo/feature/new" element={<NewFeature />} />
                    </Routes>
                </HashRouter>
            </projectContext.Provider>
        </ApiKeyContext.Provider>
    </ThemeProvider>
}
