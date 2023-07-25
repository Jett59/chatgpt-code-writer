export function applyDiff(diff: string, oldFileContents: string): string {
    console.log("Applying diff...");
    const diffLines = diff.split('\n');
    const oldLines = oldFileContents.split('\n');
    let newLines = [...oldLines];

    // This would be a nice, simple task under normal circumstances.
    // However, we aren't just trying to apply any old well-written diff (out of git or something).
    // We're trying to apply an AI-generated diff, created by a model that can't work out what line numbers to put in the header.
    // For this reason, we have to do a bunch of extra work to get around this problem.
    // We will take the unmodified and deleted lines, and try to match them to the original file.
    // Then we can deduce what the line numbers should've been, and we have a simple task again.

    // First, we must parse out the chunks.
    // Ref: GPT-4 (the thing which got us in this mess in the first place)
    const diffChunks = diffLines.reduce<string[][]>((accumulator, current) => {
        if (current.startsWith('@@')) {
            accumulator.push([]);
        }
        if (accumulator.length > 0) {
            accumulator[accumulator.length - 1].push(current);
        }
        return accumulator;
    }, []);

    for (const chunk of diffChunks) {
        const headerLine = chunk[0];
        chunk.splice(0, 1); // We need to treat the header line separately.
        if (chunk[chunk.length - 1] === '') {
            chunk.splice(chunk.length - 1, 1); // Remove the trailing newline (otherwise it confuses the below logic).
        }
        const contextLines = chunk.filter(line => !line.startsWith('+')).map(line => line.substring(1));

        let startingLineIndex = -1;
        for (let i = 0; i < newLines.length; i++) {
            if (newLines.slice(i, i + contextLines.length).join('\n') === contextLines.join('\n')) {
                if (startingLineIndex !== -1) {
                    throw new Error(`Found multiple matches for context lines in file:\n${contextLines.join('\n')}`);
                }
                startingLineIndex = i;
            }
        }
        if (startingLineIndex === -1) {
            throw new Error(`Could not find context lines in file:\n${contextLines.join('\n')}`);
        }

        const newChunkContents = chunk.filter(line => !line.startsWith('-')).map(line => line.substring(1));
        newLines.splice(startingLineIndex, contextLines.length, ...newChunkContents);
    }

    return newLines.join('\n');
}
