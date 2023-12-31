import React, { useEffect, useState } from 'react';
import { Project } from '../../data/project';
import { Box, Button, Paper, Stack, Typography } from '@mui/material';
import { Add } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const LOCAL_STORAGE_PROJECTS_KEY = 'projects';

export function useProjectsStorage(): [Project[], (projects: Project[]) => void] {
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

    return [projects, setProjects];
}

export interface ProjectContext {
    projects: Project[];
    setProjects: (projects: Project[]) => void;
}

export const projectContext = React.createContext<ProjectContext>({
    projects: [],
    setProjects: () => { },
});


export const useProjects = () => React.useContext(projectContext);

export default function ProjectDashboard() {
    const { projects, setProjects } = useProjects();

    const navigate = useNavigate();

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
                navigate('/project/new');
            }}
            endIcon={<Add />}
        >
            New
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
                    sx={{
                        width: '200px',
                        height: '200px',
                        margin: '8px',
                    }}
                >
                    <Button
                        onClick={() => {
                            navigate(`/project/${projectName}`);
                        }}
                        sx={{
                            width: '100%',
                            height: '100%',
                            justifyContent: 'center',
                            alignItems: 'center'
                        }}
                    >
                        <Stack direction="column">
                            <Typography>{project.owner}</Typography>
                            <Typography>{project.repo}</Typography>
                        </Stack>
                    </Button>
                </Paper>
            })}
        </Stack>
        {projects.length === 0 && <Typography variant="body1">No projects yet.</Typography>}
    </Stack >
}
