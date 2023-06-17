import { Project } from './project';

export interface BeginImplementingRequest {
    title: string;
    description: string;
    project: Project;
}

export interface BeginImplementingResponse {
    featureId: string;
}
