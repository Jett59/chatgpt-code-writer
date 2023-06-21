import { mkdtemp } from 'fs';
import { tmpdir } from 'os';
import git from "simple-git";

async function mkdtempPromise(prefix: string): Promise<string> {
    return new Promise((resolve, reject) => {
        mkdtemp(prefix, (err, folder) => {
            if (err) {
                reject(err);
            } else {
                resolve(folder);
            }
        });
    });
}

/// Returns the path to the cloned repository
export async function checkoutRepo(owner: string, repo: string): Promise<string> {
    const path = await mkdtempPromise(tmpdir());
    await git().clone(`https://github.com/${owner}/${repo}`, path);
    return path;
}