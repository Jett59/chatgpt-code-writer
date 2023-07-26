import { Project } from "../data/project";
import { Status } from "../data/feature";

export interface Feature {
    id: string;
    title: string;
    description: string;
    project: Project;

    completed: boolean;
    statusUpdates: Status[];

    completionListeners: (() => void)[];
    statusListeners: ((status: Status) => void)[];
}

export function subscribe(feature: Feature, completionListener: () => void, statusListener: (status: Status) => void): void {
    feature.completionListeners.push(completionListener);
    feature.statusListeners.push(statusListener);
}

export function unsubscribe(feature: Feature, completionListener: () => void, statusListener: (status: Status) => void): void {
    feature.completionListeners = feature.completionListeners.filter(l => l !== completionListener);
    feature.statusListeners = feature.statusListeners.filter(listener => listener !== statusListener);
}

export function changeFeatureState(feature: Feature, completed: boolean, event: string, data?: any): void {
    feature.completed = completed;
    feature.statusUpdates.push({ event, data });

    feature.statusListeners.forEach(listener => listener({ event, data }));

    if (completed) {
        feature.completionListeners.forEach(listener => listener());
    }
}
