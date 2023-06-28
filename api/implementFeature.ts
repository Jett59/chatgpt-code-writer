import { BeginImplementingResponse } from '../data/api';
import { Project } from '../data/project';
import { Feature, changeFeatureState } from './feature';
import { checkoutRepo } from './git';
import { listRepository } from './github';
import { ChatMessage, Function, generateMessage } from './openai';
import { summarize } from './summary';

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
    changeFeatureState(feature, false, 'Summarizing');
    const summary = await summarize(repoPath);

    // Now begins the long part of this function.
    let history: ChatMessage[] = [];
    let availableFunctions: Function[] = [];

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
            {
                role: 'system',
                content: 'Below is a JSON description of the project:\n```json\n' + JSON.stringify(summary) + '\n```',
            },
            ...history
        ], availableFunctions);

        history = history.concat(response);
    };

    changeFeatureState(feature, false, 'Dividing the problem');
    await respondToPrompt(`I would like help implementing a feature called ${feature.title}. The provided description is ${feature.description}. What simple steps would I need to undertake to do this? Please be specific about what code I need to write.`);

    let steps: string[] = [];
    const registerStep = async ({ name, description }: { name: string, description: string }) => {
        steps.push(`${name}: ${description}`);
        return `Registered step ${name}`;
    };
    const deleteStep = async ({ name }: { name: string }) => {
        steps = steps.filter(step => step !== name);
        return `Deleted step ${name}`;
    };
    const modifyStepDescription = async ({ name, description }: { name: string, description: string }) => {
        steps = steps.map(step => step === name ? `${name}: ${description}` : step);
        return `Modified step ${name}`;
    };

    availableFunctions.push({
        name: 'registerStep',
        description: 'Registers a step in the implementation process',
        invoke: registerStep,
        parameters: [
            {
                name: 'name',
                description: 'The name of the step',
                type: 'string',
                required: true,
            },
            {
                name: 'description',
                description: 'The description of the step (including outline of code to write)',
                type: 'string',
                required: true,
            },
        ]
    });

    await respondToPrompt("Are you sure? I don't think that's right. Can you now register the corrected steps in the system? Be sure to only put one step in at a time as it will break the system otherwise.");

    console.log(steps);
}
