import { BeginImplementingResponse } from '../data/api';
import { Project } from '../data/project';
import { Feature } from './feature';

let inProgressFeatures: { [id: string]: Feature } = {};

export default function implementFeature(title: string, description: string, project: Project): BeginImplementingResponse {
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

    return {
        featureId: id
    };
}
