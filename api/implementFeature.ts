import { BeginImplementingResponse } from '../data/api';
import { Project } from '../data/project';
import { Feature, changeFeatureState } from './feature';
import { checkoutRepo } from './git';
import { listRepository } from './github';
import { ChatMessage, Function, generateMessage } from './openai';
import { summarize } from './summary';
import { readFile, writeFile } from 'fs/promises';

let inProgressFeatures: { [id: string]: Feature } = {};

export function beginImplementingFeature(title: string, description: string, project: Project): BeginImplementingResponse {
    // A random UUId
    const id = crypto.randomUUID();

    let feature: Feature = {
        title,
        description,
        project,
        completed: false,
        status: 'In progress',
        completionListeners: [],
        statusListeners: []
    };

    inProgressFeatures[id] = feature;

    // We don't want to wait (it will time out), so we just start and give the client the id to get the status from.
    implementFeature(feature);

    return {
        featureId: id
    };
}

async function implementFeature(feature: Feature): Promise<void> {
    changeFeatureState(feature, false, 'Checking out code');
    const repoPath = await checkoutRepo(feature.project.owner, feature.project.repo);
    console.log(repoPath);
    changeFeatureState(feature, false, 'Summarizing');
    const summary = await summarize(feature.project.owner, feature.project.repo, repoPath);

    // Now begins the long part of this function.
    let history: ChatMessage[] = [];
    let availableFunctions: Function[] = [];

    history.push({
        role: 'system',
        content: 'Below is a JSON description of the project:\n```json\n' + JSON.stringify(summary) + '\n```',
    });

    const respondToPrompt = async (prompt: string): Promise<void> => {
        history.push({
            role: 'user',
            content: prompt
        });
        const response = await generateMessage([
            {
                role: 'system',
                content: 'You are a good programmer. You must compose responses with care to ensure timely delivery of the solution. Avoid bugs at all costs.',
            },
            ...history
        ], availableFunctions);

        history = history.concat(response);
    };

    changeFeatureState(feature, false, 'Generating steps');

    await respondToPrompt(`I would like help implementing a feature called '${feature.title}'. The provided description is: "${feature.description}". What steps would I need to do to implement it? Try to be reasonably specific, but be sure to only include steps which require code changes to avoid cluttering the system. There's no point giving me code just now as I need to review the steps first.`);

    let steps: { name: string, description: string }[] = [];
    const registerSteps = async ({ steps: newSteps }: { steps: { name: string, description: string }[] }) => {
        steps = steps.concat(newSteps);
        return `Registered ${steps.length} steps`;
    };

    availableFunctions.push({
        name: 'registerSteps',
        description: 'Registers steps in the system',
        invoke: registerSteps,
        parameters: [
            {
                name: 'steps',
                schemar: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            name: {
                                type: 'string',
                                description: 'The name of the step',
                            },
                            description: {
                                type: 'string',
                                description: 'The description of the step',
                            }
                        },
                        required: ['name', 'description']
                    }
                },
                required: true,
            },
        ]
    });

    await respondToPrompt("Now register these steps in the system for me. These will be put as tasks on the Github issue.");

    console.log(steps);

    let filesForSteps: { [step: string]: string[] } = {};

    const registerFilesForSteps = async ({ files }: { files: { [step: string]: string[] } }) => {
        filesForSteps = files;
        return `Registered files for ${Object.keys(files).length} steps`;
    };

    availableFunctions.push({
        name: 'registerFilesForSteps',
        description: 'Registers the files to create/edit/delete for each step',
        invoke: registerFilesForSteps,
        parameters: [
            {
                name: 'files',
                schemar: {
                    type: 'object',
                    description: 'Key: step name, Value: files to create/edit/delete',
                    properties: {},
                    additionalProperties: {
                        type: 'array',
                        items: {
                            type: 'string'
                        }
                    }
                },
                required: true
            }
        ]
    });

    await respondToPrompt("Please register these in the system for me.");

    console.log(filesForSteps);

    // Hopefully the descriptions of the steps are good enough (they are pretty good from my observations), so we can delete the history. We have to as we need to give it the entire file contents.
    history = [];
    availableFunctions = [];

    for (const step of steps) {
        for (const file of filesForSteps[step.name]) {
            const fileContents = await readFile(repoPath + file, 'utf-8');
            history.push({
                role: 'system',
                content: `Below is the contents of the file '${file}':\n\`\`\`\n${fileContents}\n\`\`\``,
            });

            await respondToPrompt(`What changes would I need to make to the file '${file}' in step '${step.name}'?`);

            let newContents = fileContents;
            const registerChanges = async ({ changes }: { changes: { lineNumber: number, newContents?: string, insert?: boolean }[] }) => {
                for (const change of changes) {
                    if (change.newContents) {
                        if (change.insert) {
                            const lines = newContents.split('\n');
                            lines.splice(change.lineNumber, 0, change.newContents);
                            newContents = lines.join('\n');
                        } else {
                            newContents = newContents.split('\n').map((line, index) => index === change.lineNumber ? change.newContents : line).join('\n');
                        }
                    } else {
                        newContents = newContents.split('\n').filter((_, index) => index !== change.lineNumber).join('\n');
                    }
                }
                return `Registered ${changes.length} changes`;
            };

            availableFunctions.push({
                name: 'registerChanges',
                description: 'Registers changes to the current file',
                invoke: registerChanges,
                parameters: [
                    {
                        name: 'changes',
                        schemar: {
                            description: 'The changes to the file',
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    lineNumber: {
                                        type: 'number',
                                        description: 'The line number to change (starts at 0)',
                                    },
                                    newContents: {
                                        type: 'string',
                                        description: 'The new contents of the line (leave out to delete the line)',
                                    },
                                    insert: {
                                        type: 'boolean',
                                        description: 'When true, inserts the new contents at the line number (moving the previous contents of the line down).'
                                    }
                                },
                                required: ['lineNumber']
                            }
                        },
                        required: true,
                    }
                ]
            });

            await respondToPrompt(`Please register the all of the code changes in the system for me. This will be used in a draft of the feature implementation.`);
            console.log(history[history.length - 1]);

            await writeFile(repoPath + file, newContents);
        }
    }
}
