import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useProjects } from './ProjectDashboard';
import { Button, Grid, Stack, TextField, Typography } from '@mui/material';
import { useApi } from './api';

import { BeginImplementingRequest, BeginImplementingResponse } from '../../data/api';

export default function NewFeature() {
    const { owner, repo } = useParams();
    const navigate = useNavigate();

    const { projects } = useProjects();
    const project = projects.find(project => project.owner === owner && project.repo === repo);

    const beginImplementingApi = useApi('implement', 'POST');

    const [featureTitle, setFeatureTitle] = React.useState('');
    const [featureDescription, setFeatureDescription] = React.useState('');

    const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

    if (!project) {
        return <Typography variant="h3" color="error">{`Project ${owner}/${repo} not found`}</Typography>;
    }

    return <Stack
        direction="column"
        justifyContent="center"
        alignItems="center"
        spacing={2}
        padding={2}
    >
        <Typography variant="h2">{`Project ${owner}/${repo}`}</Typography>
        <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
                <TextField
                    label="Feature Title"
                    value={featureTitle}
                    onChange={e => setFeatureTitle(e.target.value)}
                    fullWidth
                />
            </Grid>
            <Grid item xs={12} md={6}>
                <TextField
                    label="Feature Description"
                    value={featureDescription}
                    onChange={e => setFeatureDescription(e.target.value)}
                    fullWidth
                    multiline
                />
            </Grid>
            <Grid item xs={12}>
                <Button
                    variant="contained"
                    color="primary"
                    onClick={() => {
                        setErrorMessage(null);
                        beginImplementingApi.request<BeginImplementingRequest, BeginImplementingResponse>({
                            title: featureTitle,
                            description: featureDescription,
                            project,
                        }).then(response => {
                            if (!response.data) {
                                if (response.statusCode === 401) {
                                    setErrorMessage(`Invalid API key (${response.message})`);
                                } else {
                                    setErrorMessage(`Error in API: ${response.statusCode} ${response.message}`);
                                }
                            } else {
                                navigate(`/project/${owner}/${repo}/feature/${response.data.featureId}`);
                            }
                        })
                    }}
                >
                    Implement Feature
                </Button>
                {errorMessage && <Typography variant="body1" color="error">{errorMessage}</Typography>}
            </Grid>
        </Grid>
    </Stack >
}
