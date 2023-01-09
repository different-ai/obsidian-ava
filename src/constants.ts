// TODO: firebase hosting custom domain name does not work with SSE somehow?
export const API_HOST = "https://obsidian-ai-c6txy76x2q-uc.a.run.app";

export const buildHeaders = (token: string, version: string) => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
    'X-Client-Version': version,
});
