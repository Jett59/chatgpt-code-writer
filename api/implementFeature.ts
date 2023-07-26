import { BeginImplementingResponse } from '../data/api';
import { Status } from '../data/feature';
import { Project } from '../data/project';
import { applyDiff } from './diff';
import { Feature, changeFeatureState, subscribe, unsubscribe } from './feature';
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
        id,
        title,
        description,
        project,
        completed: false,
        statusUpdates: [],
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

export function subscribeToFeature(id: string, statusListener: (status: Status) => void, completionListener: () => void) {
    const feature = inProgressFeatures[id];
    if (feature === undefined) {
        throw new Error(`No feature with id '${id}'`);
    }

    subscribe(feature, completionListener, statusListener);
}

export function unsubscribeFromFeature(id: string, statusListener: (status: Status) => void, completionListener: () => void) {
    const feature = inProgressFeatures[id];
    if (feature === undefined) {
        throw new Error(`No feature with id '${id}'`);
    }

    unsubscribe(feature, completionListener, statusListener);
}

export function getStatusUpdatesForFeature(featureId: string) {
    return inProgressFeatures[featureId].statusUpdates;
}

async function implementFeature(feature: Feature): Promise<void> {
    changeFeatureState(feature, false, 'Checking out code');
    const repoPath = await checkoutRepo(feature.project.owner, feature.project.repo);
    changeFeatureState(feature, false, 'Checked out code', repoPath);
    console.log(repoPath);
    changeFeatureState(feature, false, 'Summarizing');
    const summary = await summarize(feature.project.owner, feature.project.repo, repoPath);
    changeFeatureState(feature, false, 'Summarized', summary);

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

    await respondToPrompt(`I want help implementing a feature called '${feature.title}' with a description of '${feature.description}'. From what you know about the project I'm working on, can you give me the steps I need to take to implement this feature? I would like steps to be named like commit messages, but they should each encompass an entire distinct aspect of the overall feature.`);

    changeFeatureState(feature, false, 'Generated steps', steps);
    console.log(steps);

    changeFeatureState(feature, false, 'Generating interface descriptions');
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

    changeFeatureState(feature, false, 'Generated interface descriptions', interfaceDescriptions);
    console.log(interfaceDescriptions);

    changeFeatureState(feature, false, 'Determining files concerned by each step');

    let filesForSteps: { [step: string]: string[] } = {};

    const registerFilesForSteps = async ({ files }: { files: { [step: string]: string[] } }) => {
        for (const step in files) {
            if (files[step].some === undefined) {
                console.log(files[step]);
                return 'files must contain a single array of strings per step';
            }
            // Return an error if any of the files don't start with a /.
            if (files[step].some(file => !file.startsWith('/'))) {
                return 'Files must start with a /';
            }
        }
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
                    description: 'Key: step name, Value: List of files concerned by this step',
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

    changeFeatureState(feature, false, 'Determined files concerned by each step', filesForSteps);
    console.log(filesForSteps);

    changeFeatureState(feature, false, 'Implementing the feature');

    for (const step of steps) {
        changeFeatureState(feature, false, `Implementing step '${step.name}'`);
        for (const file of filesForSteps[step.name]) {
            // Hopefully the descriptions of the steps are good enough (they are pretty good from my observations), so we can delete the history. We have to as we need to give it the entire file contents, which may only just fit in the maximum context length.
            history = [];
            availableFunctions = [];

            try {
                const fileContents = await readFile(repoPath + file, 'utf-8');

                changeFeatureState(feature, false, `Modifying '${file}'`);

                let diff = null;
                const registerChanges = async ({ diff: newDiff }: { diff: string }) => {
                    console.log(newDiff);
                    diff = newDiff;
                };

                availableFunctions.push({
                    name: 'registerChanges',
                    description: 'Registers changes to the current file',
                    invoke: registerChanges,
                    parameters: [
                        {
                            name: 'diff',
                            schemar: {
                                description: '.patch file format',
                                type: 'string'
                            },
                            required: true,
                        }
                    ]
                });

                history.push({
                    role: 'system',
                    content: `Below is the contents of the file '/src/fake_main.c' in the 'test-thingo' project:\n\`\`\`\n#include <stdio.h>\n\nint main() {\n  printf("Hello, World!");\n  return 0;\n}\n\n\`\`\`\nI have a summary of the interfaces for this new feature:\nNo new functions or data structures need to be created for this feature.`,
                }, {
                    role: 'user',
                    content: `What changes would I need to make to this file in step 'Change the printf' (described as "Make the printf print 'Hello, new world!' instead.")? This is for the feature called 'Improve messages' and described as "Change the messages to see that our latest batch of changes made a difference". Be sure to only implement what is required by this step, not what is required for the entire feature. Also, I would recommend working out what line numbers you need to change in the file now.`,
                }, {
                    role: 'assistant',
                    content: 'In order to implement this step of the feature, you need to change the printf to print the new message. This change would have to made on line 4 of the file.',
                }, {
                    role: 'user',
                    content: 'Please register those changes in the system for me.',
                }, {
                    role: 'assistant',
                    functionCall: {
                        name: 'registerChanges',
                        arguments: {
                            diff:
                                `
--- /src/fake_main.c
+++ /src/fake_main.c
@@ -3,4 +3,4 @@
 int main() {
-  printf("Hello, World!");
+  printf("Hello, new world!");
   return 0;
 }`
                        }
                    }
                });
                history.push({
                    role: 'system',
                    content: `Below is the contents of the file '${file}' in the '${feature.project.repo}' project:\n\`\`\`\n${fileContents}\n\`\`\`\nI have a summary of the interfaces for this new feature:\n${interfaceDescriptions}`,
                });

                await respondToPrompt(`What changes would I need to make to the file '${file}' in step '${step.name}' (described as "${step.description}")? This is for the feature called '${feature.title}' and described as "${feature.description}". Don't worry about anything after the current step, as I will handle that once I've got your changes for this one down. I will use this as a draft for the feature implementation.`);

                await respondToPrompt("Please register those changes in the system for me. Try to avoid putting massive numbers of unmodified lines if possible (a few either side is ok). If you make a single mistake in the unmodified or deleted lines, the diff will be rejected. Note: context lines are the lines without a plus, which must have existed in the original file. The code which applies the diff uses this to find where in the file to apply the changes.");
                const maxRetries = 3;
                for (let attempt = 0; attempt < maxRetries; attempt++) {
                    try {
                        changeFeatureState(feature, false, `Applying diff for attempt ${attempt + 1}`, diff);
                        const newContents = applyDiff(diff!, fileContents);

                        await writeFile(repoPath + file, newContents);
                        break;
                    } catch (error) {
                        changeFeatureState(feature, false, `Attempt ${attempt + 1} failed`);
                        console.log(error);
                        diff = null;
                        await respondToPrompt(`Applying the diff failed with error:\n${error}\nWhat did you do wrong? How can you fix this?`);
                        await respondToPrompt("Please register those changes in the system for me.");
                    }
                }
                // It might seem like a terrible idea, but I don't think we should throw an error if it exceeded its retries.
                // The reason for this is that future steps will likely be able to fix the problem, and even if they don't we should catch it when we do our debugging cycle below.
            } catch (error: any) {
                if (error.code === 'ENOENT') {
                    changeFeatureState(feature, false, `Creating '${file}'`);
                    let fileContents = '';
                    const registerNewFile = async ({ contents }: { contents: string }) => {
                        fileContents = contents;
                    };

                    availableFunctions.push({
                        name: 'registerNewFile',
                        description: 'Registers a new file',
                        invoke: registerNewFile,
                        parameters: [
                            {
                                name: 'contents',
                                schemar: {
                                    type: 'string',
                                    description: 'The contents of the new file',
                                },
                                required: true,
                            }
                        ]
                    });

                    history.push({
                        role: 'system',
                        content: `You are working in the ${feature.project.repo} project.\nHere is a summary of the interfaces for this feature:\n${interfaceDescriptions}`,
                    });

                    await respondToPrompt(`I just created the ${file} file. What should I put in it? This is the '${step.name}' step (described as '${step.description}') for the feature called '${feature.title}' and described as "${feature.description}". Be sure to only implement what is required by this step, not what is required for the entire feature.`);

                    changeFeatureState(feature, false, `Writing '${file}'`, fileContents);

                    await writeFile(repoPath + file, fileContents);
                } else {
                    throw error;
                }
            }
        }
    }

    // TODO: Build and test the project.

    changeFeatureState(feature, true, 'Finished implementing the feature');
    delete inProgressFeatures[feature.id];
}
