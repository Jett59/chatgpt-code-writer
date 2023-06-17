import React from 'react';
import { useProjects } from './ProjectDashboard';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Stack, Typography } from '@mui/material';

export default function ProjectViewer() {
    const { owner, repo } = useParams();
    const navigate = useNavigate();

    const { projects } = useProjects();

    const project = projects.find(p => p.owner === owner && p.repo === repo);

    if (!project) {
        return <Typography variant="h3" color="error">{`Project ${owner}/${repo} not found`}</Typography>;
    } else {
        return <Stack
            direction="column"
            justifyContent="center"
            alignItems="center"
            spacing={2}
            padding={2}
        >
            <Typography variant="h3">{`Project ${owner}/${repo}`}</Typography>
            <Stack direction="row">
                <Button
                    variant="contained"
                    color="primary"
                    onClick={() => navigate(`/project/${owner}/${repo}/feature/new`)}
                >
                    Implement Feature
                </Button>
            </Stack>
        </Stack>;
    }
}
