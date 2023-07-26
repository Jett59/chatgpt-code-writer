import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { openWebSocket } from './api';
import { Status } from "../../data/feature";
import { Accordion, AccordionDetails, AccordionSummary, Box, Button, Collapse, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import { Expand } from '@mui/icons-material';

function StatusMessage({ statusMessage }: { statusMessage: Status }) {
    const [showingData, setShowingData] = useState(false);

    if (statusMessage.data) {
        return <Stack direction="row" spacing={1}>
            <Typography>{statusMessage.event}</Typography>
            <Box display="inline-block">
                <Accordion expanded={showingData} onChange={() => setShowingData(!showingData)}>
                    <AccordionSummary>
                        <Typography>Data</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                        <Typography whiteSpace="pre">{JSON.stringify(statusMessage.data, null, 2)}</Typography>
                    </AccordionDetails>
                </Accordion>
            </Box>
        </Stack>
    } else {
        return <Typography>{statusMessage.event}</Typography>
    }
}

export default function FeatureView() {
    const { owner, repo, id } = useParams();

    const [webSocket, setWebSocket] = useState<WebSocket>();
    useEffect(() => {
        const webSocket = openWebSocket();
        webSocket.addEventListener('open', () => {
            setWebSocket(webSocket);
        });
        return () => {
            webSocket.close();
        };
    }, []);

    useEffect(() => {
        if (webSocket && id) {
            webSocket.send(id);
        }
    }, [webSocket, id]);

    const [statusMessages, setStatusMessages] = useState<Status[]>();

    useEffect(() => {
        if (webSocket) {
            webSocket.onmessage = event => {
                const data = event.data;
                if (data === 'complete') {
                    webSocket.close();
                } else {
                    const parsedData = JSON.parse(data);
                    if (Array.isArray(parsedData)) {
                        const currentStatus = parsedData as Status[];
                        setStatusMessages(currentStatus);
                    } else {
                        const statusUpdate = parsedData as Status;
                        setStatusMessages(statusMessages => statusMessages ? [...statusMessages, statusUpdate] : [statusUpdate]);
                    }
                }
            };
        }
    }, [webSocket]);

    return <Stack direction="column" spacing={2} padding={2}>
        {statusMessages?.map((statusMessage, index) => (
            <StatusMessage key={index} statusMessage={statusMessage} />
        ))}
    </Stack>
}
