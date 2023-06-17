import React, { useState } from 'react';
import { useProjects } from './ProjectDashboard';
import { ProjectBuilder } from '../../data/project';
import { Button, Chip, FormControl, FormControlLabel, FormLabel, Grid, IconButton, Radio, RadioGroup, Stack, TextField, Typography } from '@mui/material';
import { Add, Delete } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

export default function NewProject() {
    const { projects, setProjects } = useProjects();

    const navigate = useNavigate();

    const [owner, setOwner] = useState('');
    const [repo, setRepo] = useState('');

    const [builder, setBuilder] = useState<ProjectBuilder>({
        baseImage: '',
        architecture: 'amd64',
        packages: [],
        additionalSetupCommands: [],
        buildCommands: [],
        environment: {},
    });

    const [testCommand, setTestCommand] = useState('');

    const [additionalPackageName, setAdditionalPackageName] = useState('');

    const removePackageByIndex = (index: number) => {
        setBuilder({ ...builder, packages: builder.packages.filter((_, i) => i !== index) });
    };

    const [additionalSetupCommand, setAdditionalSetupCommand] = useState('');

    const removeSetupCommandByIndex = (index: number) => {
        setBuilder({ ...builder, additionalSetupCommands: builder.additionalSetupCommands.filter((_, i) => i !== index) });
    };

    const [additionalEnvironmentVariable, setAdditionalEnvironmentVariable] = useState<{ key: string, value: string }>({ key: '', value: '' });

    const [additionalBuildCommand, setAdditionalBuildCommand] = useState('');

    const removeBuildCommandByIndex = (index: number) => {
        setBuilder({ ...builder, buildCommands: builder.buildCommands.filter((_, i) => i !== index) });
    };

    return <form onSubmit={(event) => {
        event.preventDefault();
        setProjects([{
            owner,
            repo,
            builder,
            testCommand,
        }, ...projects]);
        navigate(-1);
    }}>
        <Stack
            direction="column"
            justifyContent="center"
            alignItems="center"
            padding={2}
            spacing={2}
        >
            <Typography variant="h2">New Project</Typography>
            <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                    <TextField
                        required
                        label="Owner"
                        value={owner}
                        onChange={(e) => setOwner(e.target.value)}
                        fullWidth
                    />
                </Grid>
                <Grid item xs={12} md={6}>
                    <TextField
                        required
                        label="Repo"
                        value={repo}
                        onChange={(e) => setRepo(e.target.value)}
                        fullWidth
                    />
                </Grid>
                <Grid item xs={12}>
                    <Typography variant="h3">Build Machine</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                    <TextField
                        required
                        label="Docker Image"
                        value={builder.baseImage}
                        onChange={(e) => setBuilder({ ...builder, baseImage: e.target.value })}
                        fullWidth
                    />
                </Grid>
                <Grid item xs={12} md={6}>
                    <FormControl fullWidth variant="standard">
                        <FormLabel htmlFor='architecture'>Architecture</FormLabel>
                        <RadioGroup
                            id='architecture'
                            value={builder.architecture}
                            onChange={(e) => setBuilder({ ...builder, architecture: e.target.value as "aarch64" | "amd64" })}
                            row
                        >
                            <FormControlLabel value="amd64" control={<Radio />} label="amd64" />
                            <FormControlLabel value="aarch64" control={<Radio />} label="aarch64" />
                        </RadioGroup>
                    </FormControl>
                </Grid>
                <Grid item xs={12}>
                    <Typography variant="h3">Build Configuration</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                    <Typography variant="h4">Packages</Typography>
                    <TextField
                        label="Name"
                        value={additionalPackageName}
                        onChange={(e) => setAdditionalPackageName(e.target.value)}
                        fullWidth
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                setBuilder({ ...builder, packages: [...builder.packages, additionalPackageName] });
                                setAdditionalPackageName('');
                                e.preventDefault();
                            }
                        }}
                    />
                    <Stack
                        direction="row"
                        flexWrap="wrap"
                        spacing={1}
                    >
                        {builder.packages.map((packageName, i) => <Chip
                            key={i}
                            label={packageName}
                            onDelete={() => removePackageByIndex(i)}
                            onClick={() => removePackageByIndex(i)}
                        />)}
                    </Stack>
                </Grid>
                <Grid item xs={12} md={6}>
                    <Typography variant="h4">Additional setup commands</Typography>
                    <TextField
                        label="Command"
                        value={additionalSetupCommand}
                        onChange={(e) => setAdditionalSetupCommand(e.target.value)}
                        fullWidth
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                setBuilder({ ...builder, additionalSetupCommands: [...builder.additionalSetupCommands, additionalSetupCommand] });
                                setAdditionalSetupCommand('');
                                e.preventDefault();
                            }
                        }}
                    />
                    <Stack
                        direction="column"
                        spacing={1}
                    >
                        {builder.additionalSetupCommands.map((command, i) => <Chip
                            key={i}
                            label={command}
                            onDelete={() => removeSetupCommandByIndex(i)}
                            onClick={() => removeSetupCommandByIndex(i)}
                        />)}
                    </Stack>
                </Grid>
                <Grid item xs={12} md={6}>
                    <Grid container spacing={1}>
                        <Grid item xs={12}>
                            <Typography variant="h4">Environment Variables</Typography>
                        </Grid>
                        <Grid item xs={5}>
                            <TextField
                                label="Key"
                                value={additionalEnvironmentVariable.key}
                                onChange={(e) => setAdditionalEnvironmentVariable({ ...additionalEnvironmentVariable, key: e.target.value })}
                                fullWidth
                            />
                        </Grid>
                        <Grid item xs={6}>
                            <TextField
                                label="Value"
                                value={additionalEnvironmentVariable.value}
                                onChange={(e) => setAdditionalEnvironmentVariable({ ...additionalEnvironmentVariable, value: e.target.value })}
                                fullWidth
                            />
                        </Grid>
                        <Grid item xs={1}>
                            <IconButton
                                aria-label="add"
                                onClick={() => {
                                    setBuilder({ ...builder, environment: { ...builder.environment, [additionalEnvironmentVariable.key]: additionalEnvironmentVariable.value } });
                                    setAdditionalEnvironmentVariable({ key: '', value: '' });
                                }}
                                disabled={additionalEnvironmentVariable.key === '' || additionalEnvironmentVariable.value === '' || Object.keys(builder.environment).includes(additionalEnvironmentVariable.key)}
                            >
                                <Add />
                            </IconButton>
                        </Grid>
                        {Object.entries(builder.environment).map(([key, value], index) => (
                            <React.Fragment key={index}>
                                <Grid item xs={5}>
                                    <TextField
                                        label="Key"
                                        value={key}
                                        onChange={(e) => {
                                            const newEnvironment = { ...builder.environment };
                                            delete newEnvironment[key];
                                            newEnvironment[e.target.value] = value;
                                            setBuilder({ ...builder, environment: newEnvironment });
                                        }}
                                        fullWidth
                                    />
                                </Grid>
                                <Grid item xs={6}>
                                    <TextField
                                        label="Value"
                                        value={value}
                                        onChange={(e) => setBuilder({ ...builder, environment: { ...builder.environment, [key]: e.target.value } })}
                                        fullWidth
                                    />
                                </Grid>
                                <Grid item xs={1}>
                                    <IconButton
                                        aria-label="delete"
                                        onClick={() => {
                                            const newEnvironment = { ...builder.environment };
                                            delete newEnvironment[key];
                                            setBuilder({ ...builder, environment: newEnvironment });
                                        }}
                                    >
                                        <Delete />
                                    </IconButton>
                                </Grid>
                            </React.Fragment>
                        ))}
                    </Grid>
                </Grid>
                <Grid item xs={12} md={6}>
                    <Typography variant="h4">Build Commands</Typography>
                    <TextField
                        label="Command"
                        value={additionalBuildCommand}
                        onChange={(e) => setAdditionalBuildCommand(e.target.value)}
                        fullWidth
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                setBuilder({ ...builder, buildCommands: [...builder.buildCommands, additionalBuildCommand] });
                                setAdditionalBuildCommand('');
                                e.preventDefault();
                            }
                        }}
                    />
                    <Stack
                        direction="column"
                        spacing={1}
                    >
                        {builder.buildCommands.map((command, i) => <Chip
                            key={i}
                            label={command}
                            onDelete={() => removeBuildCommandByIndex(i)}
                            onClick={() => removeBuildCommandByIndex(i)}
                        />)}
                    </Stack>
                </Grid>
                <Grid item xs={12}>
                    <Typography variant="h3">Test Command</Typography>
                </Grid>
                <Grid item xs={12}>
                    <TextField
                        required
                        label="Command"
                        value={testCommand}
                        onChange={(e) => setTestCommand(e.target.value)}
                        fullWidth
                    />
                </Grid>
                <Grid item xs={12}>
                    <Stack
                        direction="row"
                        justifyContent="flex-end"
                        spacing={1}
                    >
                        <Button
                            variant="outlined"
                            onClick={() => {
                                navigate(-1);
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="contained"
                            type="submit"
                        >
                            Save
                        </Button>
                    </Stack>
                </Grid>
            </Grid>
        </Stack>
    </form>
}
