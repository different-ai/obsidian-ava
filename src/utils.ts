import { SSE } from 'lib/sse';
import { camelCase, isArray, isObject, transform } from 'lodash';
import { App } from 'obsidian';
import posthog from 'posthog-js';
import { API_HOST, buildHeaders, EMBEDBASE_URL } from './constants';
import AvaPlugin from './main';

export const camelize = (obj: Record<string, unknown>) =>
  transform(
    obj,
    (result: Record<string, unknown>, value: unknown, key: string, target) => {
      const camelKey = isArray(target) ? key : camelCase(key);
      result[camelKey] = isObject(value)
        ? camelize(value as Record<string, unknown>)
        : value;
    }
  );

// TODO: threshold configurable in settings, maybe?
const SEMANTIC_SIMILARITY_THRESHOLD = 0.35;
export interface ISimilarFile {
  score: number;
  id: string;
  data: string;
}
export interface ISearchRequest {
  query: string;
}

export interface ISearchResponse {
  query: string;
  similarities: {
    id: string;
    data: string;
    score: number;
  }[];
}

// this is so that the model can complete something at least of equal length
export const REWRITE_CHAR_LIMIT = 5800;
export const EMBED_CHAR_LIMIT = 25000;
export const search = async (
  request: ISearchRequest,
  token: string,
  vaultId: string,
  version: string,
): Promise<ISearchResponse> => {
  const response = await fetch(`${EMBEDBASE_URL}/v1/${vaultId}/search`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'X-Client-Version': version,
    },
    body: JSON.stringify({
      query: request.query,
    }),
  }).then((res) => res.json());
  if (response.message) {
    throw new Error(`Failed to search: ${response.message}`);
  }
  return response;
};

export const createSemanticLinks = async (
  title: string,
  text: string,
  token: string,
  vaultId: string,
  version: string,
) => {
  const response = await search(
    {
      query: `File:\n${title}\nContent:\n${text}`,
    },
    token,
    vaultId,
    version,
  );

  if (!response.similarities) {
    return [];
  }
  const similarities = response.similarities.filter(
    (similarity) =>
      similarity.id !== title &&
      similarity.score > SEMANTIC_SIMILARITY_THRESHOLD
  );
  return similarities;
};

export interface ICompletion {
  stream?: boolean;
  stop?: string[];
  frequencyPenalty?: number;
  maxTokens?: number;
  presencePenalty?: number;
  temperature?: number;
  topP?: number;
  model?: string;
}
export const complete = async (
  prompt: string,
  token: string,
  version: string,
  options?: ICompletion
  // TODO how to use SSE type?
): Promise<any | string> => {
  // TODO: back-end
  prompt = prompt.trim();
  console.log('Prompt:', prompt);
  const stream = options?.stream !== undefined ? options?.stream : true;
  console.log('Options:', options, 'Stream:', stream);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const body: any = {
    frequency_penalty: options?.frequencyPenalty || 0,
    max_tokens: options?.maxTokens || 2000,
    model: options?.model || 'text-davinci-003',
    presence_penalty: options?.presencePenalty || 0,
    prompt: prompt,
    stream: stream,
    temperature: options?.temperature || 0.7,
    top_p: options?.topP !== undefined ? options?.topP : 1,
  };
  if (options?.stop) body.stop = options.stop;
  if (stream) {
    const source = new SSE(`${API_HOST}/v1/text/create`, {
      headers: buildHeaders(token, version),
      method: 'POST',
      payload: JSON.stringify(body),
    });
    return source;
  } else {
    const response = await fetch(`${API_HOST}/v1/text/create`, {
      method: 'POST',
      headers: buildHeaders(token, version),
      body: JSON.stringify(body),
    }).then((response) => response.json());
    console.log('Response:', response);
    const completion = response.choices[0].text;
    return completion;
  }
};

export const createParagraph = (
  text: string,
  token: string,
  version: string
) => {
  const prompt = `Write a paragraph about ${text}`;
  return complete(prompt, token, version);
};
export const buildRewritePrompt = (content: string, alteration: string) =>
  `You're a powerful AI editor that rewrites text exactly as humans say.\n\n Could you rewrite the following and ${alteration.trim()}:\n\n${content.trim()}`;
export const rewrite = (
  content: string,
  alteration: string,
  token: string,
  version: string
) => {
  const p = buildRewritePrompt(content, alteration);
  console.log('Prompt:', p);
  return complete(p, token, version);
};

export const deleteFromIndex = async (
  ids: string[],
  token: string,
  vaultId: string,
  version: string
) => {
  if (!token) {
    console.log('Tried to call delete without a token');
    return;
  }
  if (!vaultId) {
    console.log('Tried to call delete without a token');
    return;
  }
  console.log('deleting', ids.length, 'notes');
  const response = await fetch(`${EMBEDBASE_URL}/v1/${vaultId}`, {
    method: 'DELETE',
    headers: buildHeaders(token, version),
    body: JSON.stringify({
      ids,
    }),
  }).then((res) => res.json());
  if (response.message) {
    throw new Error(`Failed to delete: ${response.message}`);
  }
  return response;
};

interface SyncIndexRequest {
  id: string;
  data: string;
}
export const syncIndex = async (
  notes: SyncIndexRequest[],
  token: string,
  vaultId: string,
  version: string
) => {
  // stop silently not necessiraly need to span the user
  if (!token) {
    console.log('Tried to call refresh without a token');
    return;
  }
  if (!vaultId) {
    console.log('Tried to call refresh without a token');
    return;
  }
  console.log('refreshing', notes.length, 'notes');
  const response = await fetch(`${EMBEDBASE_URL}/v1/${vaultId}`, {
    method: 'POST',
    headers: buildHeaders(token, version),
    body: JSON.stringify({
      documents: notes.map((note) => ({
        id: note.id,
        data: note.data,
      })),
    }),
  }).then((res) => res.json());
  if (response.message) {
    throw new Error(response.message);
  }
  console.log('Refresh response:', response);
  return response;
};

interface IClearResponse {
  status: string;
  message?: string;
}
export const clearIndex = async (
  token: string,
  vaultId: string,
  version: string
): Promise<IClearResponse> => {
  const response = await fetch(`${EMBEDBASE_URL}/v1/${vaultId}/clear`, {
      headers: buildHeaders(token, version),
    }).then((res) => res.json());
  if (response.message) {
    throw new Error(response.message);
  }
  console.log('Clear response:', response);
  return response;
};

/**
 * v1: Simply generate tags using text completion based on the current note
 * TODO v2: pick 3 random notes and use as examples in the prompt
 * TODO v3: use /search to find similar notes and return a set of tags
 * TODO v4: use /search to find similar notes and get a set of tags and expand with text completion
 * @param noteContent
 * @param token
 * @param version
 */
export const suggestTags = async (
  noteContent: string,
  token: string,
  version: string
): Promise<any> => {
  const prompt = `Suggest a short list of NEW tags in lower case for the note content that represent the main topics (for example "#to-process #dogs ..."):\n\n${noteContent}\n\nTags:#`;
  return await complete(prompt, token, version, {
    maxTokens: 100,
    temperature: 0.5,
    topP: 0.5,
    stop: ['\n'],
    stream: true,
  });
};

// interface like
//{"status":"ok","usage":{"/v1/search":16,"/v1/search/refresh":1,"/v1/text/create":0,"/v1/search/clear":0,"/v1/image/create":6}}
export interface Usage {
  '/v1/search': number;
  '/v1/search/refresh': number;
  '/v1/text/create': number;
  '/v1/search/clear': number;
  '/v1/image/create': number;
}

// human friendly endpoint names i.e. /v1/search -> Links ...
export const ENDPOINT_NAMES: { [key: string]: string } = {
  '/v1/search': 'Links',
  '/v1/search/refresh': 'Links',
  '/v1/search/clear': 'Links',
  '/v1/text/create': 'Texts',
  '/v1/image/create': 'Images',
};

export const getUsage = async (
  token: string,
  version: string
): Promise<Usage> => {
  const response = await fetch(`${API_HOST}/v1/billing/usage`, {
    method: 'GET',
    headers: buildHeaders(token, version),
  }).then((res) => res.json()).catch(() => ({ message: 'Internal error' }));
  console.log('Usage response:', response);
  if (response.message) {
    throw new Error(response.message);
  }
  console.log('Usage response:', response);
  return response.usage;
};

/**
 * Get all Markdown files in the vault with their content and tags
 * @param {App} app
 * @returns {Promise<{path: string, content: string, tags: string[]}[]>}
 */
export const getCompleteFiles = async (app: App) => {
  const files = app.vault.getFiles().filter((file) => file.extension === 'md');
  const filesData = await Promise.all(
    files.map(async (file) => {
      const data = await app.vault.read(file);
      const cache = app.metadataCache.getFileCache(file);
      const tags = cache?.tags?.map((tag) => tag.tag) || [];
      return { path: file.path, content: data, tags };
    })
  );
  return filesData;
};

// used to uniquely identify the obsidian vault
export const getVaultId = (plugin: AvaPlugin) => {
  let vaultId = plugin.settings.vaultId;
  if (vaultId) {
    return vaultId;
    // else if should be removed by 22 of Jan 2023
  } else {
    vaultId = Math.random().toString(36).substring(2, 15);
    plugin.settings.vaultId = vaultId;
    plugin.saveSettings();
    return vaultId;
  }
};

const baseURL = 'https://app.anotherai.co';

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const openApp = async (vaultId: string) => {
  window.open(`${baseURL}/signup?token=${vaultId}&service=obsidian`);
};

export async function getLinkData(vaultId: string) {
  // TODO: ship for everyone in next release
  const response = posthog.isFeatureEnabled('new-auth')
    ? await fetch(
      `https://auth-c6txy76x2q-uc.a.run.app?token=${vaultId}&service=obsidian`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    )
    : await fetch(`${baseURL}/api/auth?token=${vaultId}&service=obsidian`, {
      headers: {
        'Content-Type': 'application/json',
        mode: 'cors',
      },
    });
  const data: LinkData = await response.json();
  return data;
}

interface LinkData {
  userId: string;
  token: string;
}

export type LinksStatus = 'disabled' | 'loading' | 'running' | 'error';
