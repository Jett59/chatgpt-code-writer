export interface Project {
    owner: string;
    repo: string;

    builder: ProjectBuilder;

    testCommand: string;
}

/**
 * Describes how to build the project from a Docker container.
 */
export interface ProjectBuilder {
    baseImage: string;
    architecture: 'aarch64' | 'amd64';

    dependencies: string[];
    environment: { [key: string]: string };
    additionalSetupCommands: string[];

    buildCommands: string[];
}
