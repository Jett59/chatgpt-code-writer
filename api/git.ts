import { mkdtemp } from 'fs/promises';
import { tmpdir } from 'os';
import git from "simple-git";

/// Returns the path to the cloned repository
export async function checkoutRepo(owner: string, repo: string): Promise<string> {
    const fileName = await mkdtemp('code-writer');
    const path = `${tmpdir()}/${fileName}`;
    await git().clone(`https://github.com/${owner}/${repo}`, path);
    return path;
}