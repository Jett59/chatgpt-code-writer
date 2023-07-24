import { createHash } from 'crypto';
import path from 'path';

import { readdir, lstat, readFile, writeFile, mkdir } from 'fs/promises';
import { generateMessage } from './openai';

const IGNORE_PATTERNS: RegExp[] = [
    /^.git$/,
    /^package-lock.json$/,
    /^Cargo.lock$/,
    /^LICENSE$/,
];

function isBinaryFile(contents: string): boolean {
    // If the file contains a null byte, it's binary.
    if (contents.indexOf('\0') !== -1) {
        return true;
    }

    // TODO: Check for other binary file signatures.
    return false;
}

const SUMMARY_CACHE_DIRECTORY: string = process.env.SUMMARY_CACHE_DIR || './.summary_cache';

function getCacheFile(repoOwner: string, repoName: string): string {
    return `${repoOwner}/${repoName}.json`;
}

interface SummaryCacheEntry {
    hash: string;
    summary: string;
}

type SummaryCache = { [relativePath: string]: SummaryCacheEntry };

async function getSummaryCache(repoName: string, repoOwner: string): Promise<SummaryCache | null> {
    const cacheFile = getCacheFile(repoOwner, repoName);
    try {
        const cacheEntry: SummaryCache = JSON.parse(await readFile(`${SUMMARY_CACHE_DIRECTORY}/${cacheFile}`, { encoding: 'utf8' }));
        return cacheEntry;
    } catch (e) {
        return null;
    }
}

async function writeSummaryCache(repoName: string, repoOwner: string, cache: SummaryCache): Promise<void> {
    const cacheFile = getCacheFile(repoOwner, repoName);
    const cacheParentDirectory = path.dirname(`${SUMMARY_CACHE_DIRECTORY}/${cacheFile}`);
    await mkdir(cacheParentDirectory, { recursive: true });

    await writeFile(`${SUMMARY_CACHE_DIRECTORY}/${cacheFile}`, JSON.stringify(cache), {
        encoding: 'utf8'
    });
}

export async function summarize(repoOwner: string, repoName: string, directoryPath: string, projectRelativePath: string = '', cache: SummaryCache = {}): Promise<{ [relativePath: string]: string }> {
    const isRoot = projectRelativePath === '';

    if (Object.keys(cache).length === 0 && isRoot) {
        cache = await getSummaryCache(repoName, repoOwner) ?? {};
    }

    let result: any = {};

    const files = await readdir(directoryPath);

    for (const file of files) {
        if (IGNORE_PATTERNS.some(pattern => pattern.test(file))) {
            continue;
        }

        const filePath = `${directoryPath}/${file}`;
        const stats = await lstat(filePath);

        if (stats.isDirectory()) {
            const subResult = await summarize(repoOwner, repoName, filePath, `${projectRelativePath}/${file}`, cache);
            result = { ...result, ...subResult };
        } else {
            const content = (await readFile(filePath, { encoding: 'utf8' }));
            const projectRelativeFilePath = `${projectRelativePath}/${file}`;
            if (isBinaryFile(content)) {
                result[projectRelativeFilePath] = '[binary file]';
            } else {
                const hash = createHash('sha256').update(content).digest('hex');
                if (cache[projectRelativeFilePath]?.hash === hash) {
                    result[projectRelativeFilePath] = cache[projectRelativeFilePath].summary;
                } else {
                    result[projectRelativeFilePath] = await generateFileSummary(projectRelativeFilePath, content);
                    cache[projectRelativeFilePath] = {
                        hash,
                        summary: result[projectRelativeFilePath]
                    };
                }
            }
        }
    }

    if (isRoot) {
        await writeSummaryCache(repoName, repoOwner, cache);
    }

    return result;
}

async function generateFileSummary(projectRelativePath: string, content: string): Promise<string> {
    console.log("Cache miss: ", projectRelativePath);
    const response = await generateMessage([
        {
            role: 'system',
            content: 'You are a structured summary generator. Given the path to a file and the contents of the file, you are responsible for generating a summary of the file. Try to remove any details which are unimportant for implementing new features.',
        },
        {
            role: 'user',
            content: '/src/main.c\n---\n#include <stdio.h>\n\nint factorial(int n) {\n    if (n == 0) {\n        return 1;\n    }\n    return n * factorial(n - 1);\n}\n\nint main() {\n    printf("%d", factorial(5));\n}\n',
        },
        {
            role: 'assistant',
            content: 'Imported headers: [stdio.h], functions: [factorial: recursive implementation of factorial, main: prints the factorial of 5 using the factorial function]',
        },
        {
            role: 'user',
            content: '/README.md\n---\n# My Project\n\nThis is my project. It is a project to test out the features of various programming languages.',
        },
        {
            role: 'assistant',
            content: 'Description: a project to test out language features',
        },
        {
            role: 'user',
            content: '/.gitignore\n---\n*.o\n*.dll\n*.log\n*.exe\n.vscode/\nbin/',
        },
        {
            role: 'assistant',
            content: 'Ignored file types: [binary files, logs, IDE configuration files]',
        },
        {
            role: 'user',
            content: `## ${projectRelativePath}\n---\n${content}`,
        }
    ], []);

    return response[0].content!;
}
