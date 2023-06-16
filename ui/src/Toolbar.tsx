import { Key } from '@mui/icons-material';
import { Box, IconButton, Paper, Stack, Tooltip, Typography, useTheme } from '@mui/material';
import React from 'react';
import ApiKeySelector from './ApiKeyEditor';

export default function Toolbar({ apiKey, setApiKey }: {
    apiKey: string | null,
    setApiKey: (apiKey: string | null) => void
}) {
    const [ApiKeySelectorOpen, setApiKeySelectorOpen] = React.useState(false);

    const theme = useTheme();

    return <Box
        position="sticky"
        top={0}
        bgcolor={theme.palette.background.default}
    >
        <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
        >
            <Box>
                <Typography variant="h1">
                    <a
                        style={{
                            color: theme.palette.text.primary,
                            textDecoration: 'none'
                        }}
                        href="/"
                    >ChatGPT Code Writer</a>
                </Typography>
            </Box>
            <Box>
                <Tooltip title="API Key">
                    <IconButton onClick={() => setApiKeySelectorOpen(true)}>
                        <Key />
                    </IconButton>
                </Tooltip>
            </Box>
        </Stack>
        <ApiKeySelector apiKey={apiKey} setApiKey={setApiKey} open={ApiKeySelectorOpen} close={() => setApiKeySelectorOpen(false)} />
    </Box>
}
