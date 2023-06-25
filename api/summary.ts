import { readdir, lstat, readFile } from 'fs/promises';
import { generateMessage } from './openai';

function isBinaryFile(contents: string): boolean {
    // If the file contains a null byte, it's binary.
    if (contents.indexOf('\0') !== -1) {
        return true;
    }

    // TODO: Check for other binary file signatures.
    return false;
}

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
            const content = (await readFile(filePath, { encoding: 'utf8' }));
            const projectRelativeFilePath = `${projectRelativePath}/${file}`;
            if (isBinaryFile(content)) {
                result[projectRelativeFilePath] = '[binary file]';
            } else {
                result[projectRelativeFilePath] = await generateFileSummary(projectRelativeFilePath, content);
            }
        }
    }

    return result;
}

async function generateFileSummary(projectRelativePath: string, content: string): Promise<string> {
    const response = await generateMessage([
        {
            role: 'system',
            content: 'You are a detailed summary generator. Given the path to a file and the contents of the file, you are responsible for generating a summary of the file.',
        },
        {
            role: 'user',
            content: '/src/main.c\n---\nint factorial(int n) {\n    if (n == 0) {\n        return 1;\n    }\n    return n * factorial(n - 1);\n}\n\nint main() {\n    printf("%d", factorial(5));\n}\n',
        },
        {
            role: 'assistant',
            content: 'This file does not import any headers. It has two functions: factorial and main. The factorial function takes an integer and returns an integer. The main function takes no arguments and returns an integer. The main function calls the factorial function with the argument 5 and prints the result. The factorial function is a recursive implementation of the factorial algorithm and doesn\'t call any other functions.',
        },
        {
            role: 'user',
            content: `## ${projectRelativePath}\n---\n${content}`,
        }
    ], []);

    return response[0].content!;
}
