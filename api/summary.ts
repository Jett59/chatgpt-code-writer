import { readdir, lstat, readFile } from 'fs/promises';

export async function summarize(directoryPath: string, projectRelativePath: string = ''): Promise<{ [relativePath: string]: string }> {
    let result: any = {};

    const files = await readdir(directoryPath);

    for (const file of files) {
        if (file === ".git") {
            continue;
        }

        const filePath = `${directoryPath}/${file}`;
        const stats = await lstat(filePath);

        if (stats.isDirectory()) {
            const subResult = await summarize(filePath, `${projectRelativePath}/${file}`);
            result = { ...result, ...subResult };
        } else {
            const content = (await readFile(filePath, { encoding: 'utf8' })).substring(0, 100).replace(/\n/g, ' ');
            result[`${projectRelativePath}/${file}`] = content;
        }
    }

    return result;
}
