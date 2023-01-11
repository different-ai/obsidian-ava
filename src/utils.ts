import { SSE } from 'lib/sse';
import { App } from 'obsidian';
import { API_HOST, buildHeaders } from './constants';
import AvaPlugin from './main';

// TODO: threshold configurable in settings, maybe?
const SEMANTIC_SIMILARITY_THRESHOLD = 0.35;

export interface ISimilarFile {
  score: number;
  noteName: string;
  notePath: string;
  noteContent: string;
  noteTags: string[];
}
export interface ISearchRequest {
  query?: string;
  note?: {
    notePath: string;
    noteContent: string;
    noteTags: string[];
  };
}

export interface ISearchResponse {
  similarities: ISimilarFile[];
}
// this is so that the model can complete something at least of equal length
export const REWRITE_CHAR_LIMIT = 5800;
export const EMBED_CHAR_LIMIT = 25000;
export const search = async (
  request: ISearchRequest,
  token: string,
  vaultId: string,
  version: string
): Promise<ISearchResponse> => {
  const response = await fetch(`${API_HOST}/v1/search`, {
    method: 'POST',
    headers: buildHeaders(token, version),
    body: JSON.stringify({
      query: request.query,
      note: {
        note_path: request.note?.notePath,
        note_content: request.note?.noteContent,
        note_tags: request.note?.noteTags,
      },
      vault_id: vaultId,
    }),
  });
  if (response.status !== 200) {
    const data = await response.json();
    throw new Error(`Failed to search: ${data.message}`);
  }

  const data = await response.json();
  return {
    similarities: data.similarities.map((similarity: any) => ({
      score: similarity.score,
      noteName: similarity.note_name,
      notePath: similarity.note_path,
      noteContent: similarity.note_content,
      noteTags: similarity.note_tags,
    })),
  };
};

export const createSemanticLinks = async (
  title: string,
  text: string,
  tags: string[],
  token: string,
  vaultId: string,
  version: string
) => {
  const response = await search(
    {
      note: {
        notePath: title,
        noteContent: text,
        noteTags: tags,
      },
    },
    token,
    vaultId,
    version
  );

  console.log('response', response);
  if (!response.similarities) {
    return [];
  }
  const similarities = response.similarities.filter(
    (similarity) =>
      similarity.notePath !== title &&
      !similarity.noteName.includes(title) &&
      similarity.score > SEMANTIC_SIMILARITY_THRESHOLD
  );
  return similarities.map((similarity) => {
    return { path: similarity.notePath, similarity: similarity.score };
  });
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

export const rewrite = (
  text: string,
  alteration: string,
  token: string,
  version: string
) => {
  const prompt = `Rewrite
"${text}"
${alteration}`;
  console.log('Prompt:', prompt);
  return complete(prompt, token, version);
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
  const response = await fetch(`${API_HOST}/v1/search/refresh`, {
    method: 'POST',
    headers: buildHeaders(token, version),
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

export const clearIndex = async (
  token: string,
  vaultId: string,
  version: string
): Promise<any> => {
  const response = await fetch(`${API_HOST}/v1/search/clear`, {
    method: 'POST',
    headers: buildHeaders(token, version),
    body: JSON.stringify({
      vault_id: vaultId,
    }),
  });
  if (response.status !== 200) {
    throw new Error(`Error clearing semantic search: ${response.statusText}`);
  }
  const json = await response.json();
  console.log('Clear response:', json);
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

export const openApp = async (vaultId: string) => {
  window.open(`${baseURL}/signup?token=${vaultId}&service=obsidian`);
};

export async function getLinkData(vaultId: string) {
  await wait(1000);
  const response = await fetch(`${baseURL}/api/auth?token=${vaultId}`, {
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

