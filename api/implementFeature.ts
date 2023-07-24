import { BeginImplementingResponse } from '../data/api';
import { Project } from '../data/project';
import { Feature, changeFeatureState } from './feature';
import { checkoutRepo } from './git';
import { listRepository } from './github';
import { ChatMessage, Function, generateMessage } from './openai';
import { summarize } from './summary';
import { readFile, writeFile, open } from 'fs/promises';

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

    await respondToPrompt("Now register these steps in the system for me. They will be put as tasks on the Github issue. Please name the steps like commit messages, and ensure they are of a suitable size for a commit.");

    console.log(steps);

    let interfaceDescriptions = '';
    const registerInterfaceDescriptions = async ({ descriptions }: { descriptions: string }) => {
        interfaceDescriptions = descriptions;
    };

    availableFunctions.push({
        name: 'registerInterfaceDescriptions',
        description: 'Registers a summary of the interfaces (signatures, public data structures etc.).',
        invoke: registerInterfaceDescriptions,
        parameters: [
            {
                name: 'descriptions',
                schemar: {
                    type: 'string',
                    description: 'A summary of the interfaces (signatures, public data structures etc.)',
                },
                required: true,
            },
        ]
    });

    await respondToPrompt("Now I need a summary of the new interfaces (function signatures, public data structures etc.) which you will create for this feature. Please register this in the system for me. This will be put as a comment on the Github issue.");
    console.log(interfaceDescriptions);

    let filesForSteps: { [step: string]: string[] } = {};

    const registerFilesForSteps = async ({ files }: { files: { [step: string]: string[] } }) => {
        filesForSteps = files;
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

    await respondToPrompt("Please register the names of the files to create/edit/delete in the system for me.");

    console.log(filesForSteps);

    for (const step of steps) {
        for (const file of filesForSteps[step.name]) {
            // Hopefully the descriptions of the steps are good enough (they are pretty good from my observations), so we can delete the history. We have to as we need to give it the entire file contents, which may only just fit in the maximum context length.
            history = [];
            availableFunctions = [];

            try {
                const fileContents = await readFile(repoPath + file, 'utf-8');
                history.push({
                    role: 'system',
                    content: `Below is the contents of the file '${file}':\n\`\`\`\n${fileContents}\n\`\`\`\nI have a summary of the interfaces for this feature:\n${interfaceDescriptions}`,
                });

                await respondToPrompt(`What changes would I need to make to the file '${file}' in step '${step.name}' (described as "${step.description}")? This is for the feature called '${feature.title}' and described as "${feature.description}. Be sure to only implement what is required by this step, not what is required for the entire feature.`);

                let newContents = fileContents;
                const registerChanges = async ({ changes }: { changes: { lineNumber: number, newContents?: string, insert?: boolean }[] }) => {
                    console.log(changes);
                    // We need to keep a copy of the old line numbers since we want to be able to match the changes with the old line numbers.
                    // Newly inserted lines should have a line number of -1 so they don't get mixed up with the old line numbers.
                    let newLines: [string, number][] = newContents.split('\n').map((value, index) => [value, index + 1]);
                    for (const change of changes) {
                        const index = newLines.findIndex(([_, lineNumber]) => lineNumber === change.lineNumber);
                        if (index === -1) {
                            throw new Error(`Could not find line number ${change.lineNumber} in file '${file}'`);
                        }
                        if (change.newContents) {
                            if (change.insert) {
                                newLines.splice(index, 0, [change.newContents, -1]);
                            } else {
                                newLines[index] = [change.newContents, -1];
                            }
                        } else {
                            newLines.splice(index, 1);
                        }
                    }
                    newContents = newLines.map(([value, _]) => value).join('\n');
                };

                availableFunctions.push({
                    name: 'registerChanges',
                    description: 'Registers changes to the current file',
                    invoke: registerChanges,
                    parameters: [
                        {
                            name: 'changes',
                            schemar: {
                                description: 'The changes to the file. All changes are applied simultaneously, meaning line numbers are relative to the original file.',
                                type: 'array',
                                items: {
                                    type: 'object',
                                    properties: {
                                        newContents: {
                                            type: 'string',
                                            description: 'The value to place at the given line (leave undefined to remove the line). Note: this may include multiple lines.',
                                        },
                                        insert: {
                                            type: 'boolean',
                                            description: 'When true, inserts the new contents before the specified line number'
                                        },
                                        lineNumber: {
                                            type: 'number',
                                            description: 'The number of the line to modify (or insert at) (1-indexed). Line numbers are based purely on the original file, and do not change after a change is made.',
                                        }
                                    },
                                    required: ['lineNumber']
                                }
                            },
                            required: true,
                        }
                    ]
                });

                await respondToPrompt("Please register those changes in the system for me.");

                await writeFile(repoPath + file, newContents);
            } catch (error: any) {
                if (error.code === 'ENOENT') {
                    const fileHandle = await open(repoPath + file, 'w');
                    await fileHandle.close();
                }
            }
        }
    }
}
