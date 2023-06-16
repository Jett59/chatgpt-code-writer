import React, { useEffect, useState } from 'react';
import { Project } from '../../data/project';
import { Button, IconButton, Paper, Stack, Tooltip, Typography } from '@mui/material';
import { Add } from '@mui/icons-material';

const LOCAL_STORAGE_PROJECTS_KEY = 'projects';

export default function ProjectViewer() {
    const [projects, setProjects] = useState<Project[]>(() => {
        const projects = localStorage.getItem(LOCAL_STORAGE_PROJECTS_KEY);
        if (projects) {
            return JSON.parse(projects);
        } else {
            return [];
        }
    });

    useEffect(() => {
        localStorage.setItem(LOCAL_STORAGE_PROJECTS_KEY, JSON.stringify(projects));
    }, [projects]);

    return <Stack
        direction="column"
        justifyContent="center"
        alignItems="center"
        padding={2}
        spacing={2}
    >
        <Typography variant="h2">Projects</Typography>
        <Button
            onClick={() => {
                setProjects([...projects, {
                    owner: 'owner',
                    repo: 'repo',
                    builder: {
                        baseImage: 'ubuntu:latest',
                        architecture: 'aarch64',
                        dependencies: [],
                        additionalSetupCommands: [],
                        environment: {},
                        buildCommands: [],
                    },
                    testCommand: 'echo "No test command specified"',
                }])
            }}
            endIcon={<Add />}
        >
            Add
        </Button>
        <Stack
            direction="row"
            flexWrap="wrap"
            justifyContent="center"
            alignItems="center"
        >
            {projects.map((project) => {
                const projectName = `${project.owner}/${project.repo}`;
                return <Paper
                    key={projectName}
                    // make it a square
                    sx={{
                        width: '100px',
                        height: '100px',
                        margin: '10px',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center'
                    }}
                >
                    <Typography variant="h6">{projectName}</Typography>
                </Paper>
            })}
        </Stack>
        {projects.length == 0 && <Typography variant="body1">No projects yet.</Typography>}
    </Stack >
}
