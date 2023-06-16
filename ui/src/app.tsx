import { CssBaseline, ThemeProvider, createTheme, useMediaQuery } from '@mui/material';
import React from 'react';
import { useApiKey } from './api';

export default function App() {
    const shouldUseDarkMode = useMediaQuery('(prefers-color-scheme: dark)');

    const theme = createTheme({
        palette: {
            mode: shouldUseDarkMode ? 'dark' : 'light',
        },
    });

    const [apiKey, setApiKey] = useApiKey();

    return <ThemeProvider theme={theme}>
        <CssBaseline />
    </ThemeProvider>
}
