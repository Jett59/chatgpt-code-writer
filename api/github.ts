import axios from "axios";

export async function listRepository(owner: string, repo: string, path: string): Promise<{ name: string, isFile: boolean }[]> {
    const response = await axios.get(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`);

    return response.data.map((item: any) => {
        return {
            name: item.name,
            isFile: item.type === 'file'
        };
    });
}
