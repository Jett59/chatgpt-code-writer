import { CssBaseline, ThemeProvider, createTheme, useMediaQuery } from '@mui/material';
import React from 'react';
import Toolbar from './Toolbar';
import ProjectDashboard, { projectContext, useProjectsStorage } from './ProjectDashboard';
import { HashRouter, Route, Routes } from 'react-router-dom';
import NewProject from './NewProject';
import ProjectViewer from './ProjectViewer';
import NewFeature from './NewFeature';
import FeatureView from './FeatureView';

export default function App() {
    const shouldUseDarkMode = useMediaQuery('(prefers-color-scheme: dark)');

    const theme = createTheme({
        palette: {
            mode: shouldUseDarkMode ? 'dark' : 'light',
        },
    });

    const [projects, setProjects] = useProjectsStorage();

    return <ThemeProvider theme={theme}>
        <CssBaseline />
        <Toolbar />
        <projectContext.Provider value={{ projects, setProjects }}>
            <HashRouter>
                <Routes>
                    <Route index element={<ProjectDashboard />} />
                    <Route path="/project/new" element={<NewProject />} />
                    <Route path="/project/:owner/:repo" element={<ProjectViewer />} />
                    <Route path="/project/:owner/:repo/feature/new" element={<NewFeature />} />
                    <Route path="/project/:owner/:repo/feature/:id" element={<FeatureView />} />
                </Routes>
            </HashRouter>
        </projectContext.Provider>
    </ThemeProvider>
}
