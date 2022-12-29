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

export const createSemanticLinks = async (
  title: string,
  text: string,
  tags: string[],
  token: string
) => {
  const query = `File:\n${title}\nTags:\n${tags}\nContent:\n${text}`;
  console.log('Query:', query);
  const response: { similarities: ISimilarFile[] } = await fetch(
    `${API_HOST}/v1/search`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ query: query, vault_id: getObsidianClientID() }),
    }
  ).then((response) => response.json());
  console.log('response', response);
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

export const limitLengthForGPT3 = (markdownFileContent: string) => {
  let text = markdownFileContent;
  const maxWordLength = 300;
  // If text is too long, take the last 300 words
  if (text.split(' ').length > maxWordLength) {
    text = text.split(' ').slice(-maxWordLength).join(' ');
  }
  return text;
};

export const createWikipediaLinks = async (
  title: string,
  text: string,
  plugin: AvaPlugin
) => {
  const prompt =
    'Title: ' +
    title +
    '\n' +
    text +
    '\nWikipedia links of similar topics:\n\n - https://';
  console.log('Prompt:', prompt);
  const response = await fetch(`${API_HOST}/v1/text/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${plugin.settings.token}`,
    },
    body: JSON.stringify({
      model: 'text-davinci-003',
      prompt: prompt,
      temperature: 0.7,
      max_tokens: text.length + 200,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0,
    }),
  }).then((response) => response.json());
  const completion = response.choices[0].text;
  return `- ${completion}`;
};

const ignoredTags = [
  // TODO: make it configurable in the settings
  '#shower-thought',
  '#godel-uncertain',
  '#todo',
  '#to-digest',
];
export const filterTags = (tags: string[]) => {
  return tags
    .filter((t) => !ignoredTags.includes(t))
    .map((tag) => tag.replace('#', ''))
    .join(',');
};

export const createSemanticTags = async (
  title: string,
  text: string,
  tags: string[],
  token: string
) => {
  const query = `File:\n${title}\nTags:\n${tags}\nContent:\n${text}`;
  console.log('Query:', query);
  const response: { similarities: ISimilarFile[] } = await fetch(
    `${API_HOST}/v1/text/create`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ query: query }),
    }
  ).then((response) => response.json());

  // tags not already in the file - unique
  const newTags = response.similarities
    .filter(
      (similarity) =>
        similarity.note_path !== title &&
        similarity.score > SEMANTIC_SIMILARITY_THRESHOLD
    )
    .flatMap((similarity) => similarity.note_tags.map((tag) => '#' + tag))
    .filter(
      (tag) =>
        !tags.includes(tag) &&
        !ignoredTags.includes(tag) &&
        // only accept "#" and alphanumeric characters in tags
        // TODO: related to https://github.com/mfarragher/obsidiantools/issues/24
        tag.match(/^#[a-zA-Z0-9]+$/)
    );
  return [...new Set(newTags)].join(' ');
};

export const createParagraph = async (text: string, plugin: AvaPlugin) => {
  const prompt = `Write a paragraph about ${text}`;
  console.log('Prompt:', prompt);
  const source = new SSE(`${API_HOST}/v1/text/create`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${plugin.settings.token}`,
    },
    method: 'POST',
    payload: JSON.stringify({
      frequency_penalty: 0,
      max_tokens: text.length + 300,
      model: 'text-davinci-003',
      presence_penalty: 0,
      prompt: prompt,
      stream: true,
      temperature: 0.7,
      top_p: 1,
    }),
  });
  return source;
};

export const rewrite = async (
  text: string,
  alteration: string,
  plugin: AvaPlugin
) => {
  const prompt = `\n Rewrite
  "${text}" 
  ${alteration}} 
  \n. Of course, here it is: \n`;
  console.log('Prompt:', prompt);
  const source = new SSE(`${API_HOST}/v1/text/create`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${plugin.settings.token}`,
    },

    method: 'POST',
    payload: JSON.stringify({
      frequency_penalty: 0,
      max_tokens: text.length + 1400,
      model: 'text-davinci-003',
      presence_penalty: 0,
      prompt: prompt,
      stream: true,
      temperature: 0.7,
      top_p: 1,
    }),
  });
  return source;
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
  token: string
) => {
  const response = await fetch(`${API_HOST}/v1/search/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      vault_id: getObsidianClientID(),
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

// used to uniquely identify the user
export const getObsidianClientID = () => {
  let obsidianClientId = window.localStorage.getItem('rw-ObsidianClientId');
  if (obsidianClientId) {
    return obsidianClientId;
  } else {
    obsidianClientId = Math.random().toString(36).substring(2, 15);
    window.localStorage.setItem('rw-ObsidianClientId', obsidianClientId);
    return obsidianClientId;
  }
};

export function getAuthHeaders() {
  return {
    AUTHORIZATION: `Token ${this.settings.token}`,
    'Obsidian-Client': `${this.getObsidianClientID()}`,
  };
}

// const baseURL = 'http:/localhost:3001';
const baseURL = 'https://app.anotherai.co';

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
export async function getUserAuthToken(attempt = 0) {
  const uuid = getObsidianClientID();

  if (attempt === 0) {
    window.open(`${baseURL}/signup?token=${uuid}&service=obsidian`);
  }
  // wait  little to be sure that the user has time to authorize
  await wait(1000);

  let response, data;
  try {
    response = await fetch(`${baseURL}/api/auth?token=${uuid}`, {
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
    data.token;
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
    await getUserAuthToken(attempt + 1);
  }
  return data.token;
}

export const userMessage = (e: any) =>
  e.toString().includes('subscription')
    ? '❗️ You need to have a "hobby" or "pro" plan to use this feature ❗️'
    : '❗️ Something wrong happened. ❗️ \n ⚙️ Please make sure you connected your account in the settings ⚙️';
