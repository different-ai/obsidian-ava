import { SSE } from 'lib/sse';
import { App } from 'obsidian';
import { API_HOST } from './constants';
import AvaPlugin from './main';

// TODO: threshold configurable in settings, maybe?
const SEMANTIC_SIMILARITY_THRESHOLD = 0.35;

export interface ISimilarFile {
  score: number;
  note_name: string;
  note_path: string;
  note_content: string;
  note_tags: string[];
}
interface SearchRequest {
  query?: string;
  note?: {
    note_path: string;
    note_content: string;
    note_tags: string[];
  };
}

// this is so that the model can complete something at least of equal length
export const REWRITE_CHAR_LIMIT = 5800;
export const EMBED_CHAR_LIMIT = 25000;
export const search = async (
  request: SearchRequest,
  token: string,
  vaultId: string
) => {
  const response: { similarities: ISimilarFile[] } = await fetchWithTimeout(
    `${API_HOST}/v1/search`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ ...request, vault_id: vaultId }),
    }
  ).then((response) => response.json());
  return response;
};

export const createSemanticLinks = async (
  title: string,
  text: string,
  tags: string[],
  token: string,
  vaultId: string
) => {
  const response = await search(
    {
      note: {
        note_path: title,
        note_content: text,
        note_tags: tags,
      },
    },
    token,
    vaultId
  );

  console.log('response', response);
  if (!response.similarities) {
    return [];
  }
  const similarities = response.similarities.filter(
    (similarity) =>
      similarity.note_path !== title &&
      !similarity.note_name.includes(title) &&
      similarity.score > SEMANTIC_SIMILARITY_THRESHOLD
  );
  return similarities.map((similarity) => {
    return { path: similarity.note_path, similarity: similarity.score };
  });
};

export const createWikipediaLinks = async (
  title: string,
  text: string,
  token: string
) => {
  const prompt =
    'Title: ' +
    title +
    '\n' +
    text +
    '\nWikipedia links of similar topics:\n\n - https://';
  console.log('Prompt:', prompt);
  const completion = await complete(prompt, token, { stream: false });
  return `- ${completion}`;
};

interface ICompletion {
  stream?: boolean;
}
export const complete = async (
  prompt: string,
  token: string,
  options?: ICompletion
  // TODO how to use SSE type?
): Promise<any | string> => {
  // TODO: back-end
  prompt = prompt.trim();
  console.log('Prompt:', prompt);
  const stream = options?.stream !== undefined ? options?.stream : true;
  console.log('Options:', options, 'Stream:', stream);

  const body = {
    frequency_penalty: 0,
    max_tokens: 2000,
    model: 'text-davinci-003',
    presence_penalty: 0,
    prompt: prompt,
    stream: stream,
    temperature: 0.7,
    top_p: 1,
  };
  if (stream) {
    const source = new SSE(`${API_HOST}/v1/text/create`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      method: 'POST',
      payload: JSON.stringify(body),
    });
    return source;
  } else {
    const response = await fetchWithTimeout(`${API_HOST}/v1/text/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    }).then((response) => response.json());
    console.log('Response:', response);
    const completion = response.choices[0].text;
    return completion;
  }
};

export const createParagraph = (text: string, token: string) => {
  const prompt = `Write a paragraph about ${text}`;
  return complete(prompt, token);
};

export const rewrite = (text: string, alteration: string, token: string) => {
  const prompt = `Rewrite
"${text}"
${alteration}`;
  console.log('Prompt:', prompt);
  return complete(prompt, token);
};

interface NoteRefresh {
  notePath?: string;
  noteTags?: string[];
  noteContent?: string;
  pathToDelete?: string;
}
/**
 * Make a query to /refresh to refresh the semantic search index
 */
export const refreshSemanticSearch = async (
  notes: NoteRefresh[],
  token: string,
  vaultId: string
) => {
  const response = await fetchWithTimeout(`${API_HOST}/v1/search/refresh`, {
    timeout: 30_000,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      vault_id: vaultId,
      notes: notes.map((note) => ({
        // snake_case to match the API
        note_path: note.notePath,
        note_tags: note.noteTags,
        note_content: note.noteContent,
        path_to_delete: note.pathToDelete,
      })),
    }),
  });
  if (response.status !== 200) {
    throw new Error(`Error refreshing semantic search: ${response.statusText}`);
  }
  const json = await response.json();
  console.log('Refresh response:', json);
  return json;
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

// const baseURL = 'http:/localhost:3001';
const baseURL = 'https://app.anotherai.co';

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
export async function getUserAuthToken(vaultId: string, attempt = 0) {
  if (attempt === 0) {
    window.open(`${baseURL}/signup?token=${vaultId}&service=obsidian`);
  }
  // wait  little to be sure that the user has time to authorize
  await wait(1000);

  let response, data;
  try {
    response = await fetch(`${baseURL}/api/auth?token=${vaultId}`, {
      headers: {
        'Content-Type': 'application/json',
        mode: 'cors',
      },
    });
  } catch (e) {
    console.log('Obsidian AVA plugin: fetch failed in getUserAuthToken: ', e);
  }
  if (response && response.ok) {
    data = await response.json();
  } else {
    console.log(
      'Obsidian AVA plugin: bad response in getUserAuthToken: ',
      response
    );
    // this.showInfoStatus(
    //   button.parentElement,
    //   'Authorization failed. Try again',
    //   'rw-error'
    // );
    return;
  }
  if (data.token) {
    return data.token;
  } else {
    if (attempt > 20) {
      console.log(
        'Obsidian AVA plugin: reached attempt limit in getUserAuthToken'
      );
      return;
    }
    console.log(
      `Obsidian AVA plugin: didn't get token data, retrying (attempt ${
        attempt + 1
      })`
    );
    await new Promise((resolve) => setTimeout(resolve, 1000));
    await getUserAuthToken(vaultId, attempt + 1);
  }
  return data.token;
}

export const userMessage = (e: any) =>
  e.toString().includes('subscription')
    ? '❗️ You need to have a "hobby" or "pro" plan to use this feature ❗️'
    : '❗️ Something wrong happened. ❗️ \n ⚙️ Please make sure you connected your account in the settings ⚙️';

async function fetchWithTimeout(
  url: string,
  options: RequestInit & { timeout?: number }
) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), options.timeout || 10_000);
  const response = await fetch(url, {
    ...options,
    signal: controller.signal,
  });
  clearTimeout(id);
  return response;
}
