import { Project } from "../data/project";

export interface Feature {
    title: string;
    description: string;
    project: Project;

    completed: boolean;
    status: string;

    completionListeners: (() => void)[];
    statusListeners: ((status: string) => void)[];
}

export function subscribe(feature: Feature, completionListener: () => void, statusListener: (status: string) => void): void {
    feature.completionListeners.push(completionListener);
    feature.statusListeners.push(statusListener);
}

export function unsubscribe(feature: Feature, completionListener: () => void, statusListener: (status: string) => void): void {
    feature.completionListeners = feature.completionListeners.filter(l => l !== completionListener);
    feature.statusListeners = feature.statusListeners.filter(l => l !== statusListener);
}

export function changeFeatureState(feature: Feature, completed: boolean, status: string): void {
    feature.completed = completed;
    feature.status = status;

    feature.statusListeners.forEach(l => l(status));

    if (completed) {
        feature.completionListeners.forEach(l => l());
    }
}
