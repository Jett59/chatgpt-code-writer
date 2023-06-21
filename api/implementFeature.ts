import { BeginImplementingResponse } from '../data/api';
import { Project } from '../data/project';
import { Feature } from './feature';
import { listRepository } from './github';
import { generateMessage } from './openai';

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
    const summary = await summarize(feature.project.owner, feature.project.repo, '');
    console.log(generateMessage([
        {
            role: 'user',
            content: feature.description
        }
    ], []));
}

async function summarize(owner: string, repo: string, directory: string): Promise<{ [path: string]: string }> {
    let summary: { [path: string]: string } = {};

    let files = await listRepository(owner, repo, directory);

    for (let file of files) {
        if (file.isFile) {
            summary[`${directory}/${file.name}`] = file.name;
        } else {
            let subSummary = await summarize(owner, repo, `${directory}/${file.name}`);
            for (let path in subSummary) {
                summary[path] = subSummary[path];
            }
        }
    }

    return summary;
}
