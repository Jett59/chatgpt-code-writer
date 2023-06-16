import { Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField } from '@mui/material';
import React from 'react';

export default function ApiKeySelector({ apiKey, setApiKey, open, close }: {
    apiKey: string | null,
    setApiKey: (apiKey: string | null) => void,
    open: boolean,
    close: () => void,
}) {
    const [unsavedAPIKey, setUnsavedAPIKey] = React.useState<string | null>(apiKey);

    const onDone = () => {
        setApiKey(unsavedAPIKey || null);
        close();
    };

    return <Dialog open={open} onClose={() => close()}>
        <DialogTitle>API Key</DialogTitle>
        <DialogContent>
            <TextField
                autoFocus
                margin="dense"
                label="API Key"
                type="text"
                fullWidth
                autoComplete='off'
                value={unsavedAPIKey ?? ''}
                onChange={(e) => setUnsavedAPIKey(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                        onDone();
                        e.preventDefault();
                    }
                }}
            />
        </DialogContent>
        <DialogActions>
            <Button onClick={() => close()}>Cancel</Button>
            <Button variant="contained" onClick={() => onDone()}>Done</Button>
        </DialogActions>
    </Dialog>
}
