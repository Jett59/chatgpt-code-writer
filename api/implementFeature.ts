import { BeginImplementingResponse } from '../data/api';
import { Project } from '../data/project';
import { Feature } from './feature';
import { checkoutRepo } from './git';
import { listRepository } from './github';
import { generateMessage } from './openai';
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
    const repoPath = await checkoutRepo(feature.project.owner, feature.project.repo);
    const summary = await summarize(repoPath);
    console.log(summary);
}
