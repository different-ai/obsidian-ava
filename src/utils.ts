import got from 'got';
import { SSE } from 'lib/sse';
import { App } from 'obsidian';
import { Extract } from 'unzipper';
import manifest from '../manifest.json';
import { API_HOST } from './constants';
import AvaPlugin from './main';


export interface ISimilarFile {
  score: number;
  note_path: string;
  note_content: string;
  note_tags: string[];
}

export const createSemanticLinks = async (
  title: string,
  text: string,
  tags: string[]
) => {
  const query = `File:\n${title}\nTags:\n${tags}\nContent:\n${text}`;
  console.log('Query:', query);
  const response: { similarities: ISimilarFile[] } = await fetch(
    'http://localhost:3333/semantic_search',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: query }),
    }
  ).then((response) => response.json());

  // TODO: we could ignore score < 0.7 (configurable in settings)
  const similarities = response.similarities.filter(
    (similarity) => similarity.note_path !== title
  );
  console.log(similarities);
  return `${similarities
    .map((similarity) => '- [[' + similarity.note_path + ']]')
    .join('\n')}`;
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
  const response = await plugin.openai.createCompletion({
    model: 'text-davinci-003',
    prompt: prompt,
    temperature: 0.7,
    max_tokens: text.length + 200,
    top_p: 1,
    frequency_penalty: 0,
    presence_penalty: 0,
  });
  const completion = response.data.choices[0].text;
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

export const createGPT3Links = async (
  title: string,
  text: string,
  tags: string[],
  plugin: AvaPlugin
) => {
  const prompt =
    'Title: ' +
    title +
    '\n' +
    'Tags: ' +
    tags +
    '\n' +
    text +
    '\nSimilar topic links:\n- [[';
  const response = await plugin.openai.createCompletion({
    model: 'text-davinci-003',
    prompt: prompt,
    temperature: 0.7,
    max_tokens: 200,
    top_p: 1,
    frequency_penalty: 0.1,
    presence_penalty: 0.1,
  });
  const completion = response.data.choices[0].text.trim();
  return completion;
};

export const downloadApiSourceCode = async (dest: string): Promise<boolean> => {
  const version = manifest.version;
  const url = `https://github.com/louis030195/obsidian-ava/releases/download/${version}/semantic.zip`;
  return new Promise((resolve) => {
    console.log(`Downloading ${url}`);
    got(url, { isStream: true })
      .end(() => {
        console.log('Unzipped Finished');
        resolve(true);
      })
      .pipe(Extract({ path: dest }));
  });
};

export const createSemanticTags = async (
  title: string,
  text: string,
  tags: string[]
) => {
  const query = `File:\n${title}\nTags:\n${tags}\nContent:\n${text}`;
  console.log('Query:', query);
  const response: { similarities: ISimilarFile[] } = await fetch(
    'http://localhost:3333/semantic_search',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: query }),
    }
  ).then((response) => response.json());

  // tags not already in the file - unique
  const newTags = response.similarities
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
      Authorization: 'Bearer ' + plugin.settings.openai.key,
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
  const prompt = `\n Rewrite ${text} to ${alteration}} \n. Of course, here it is: \n`;
  console.log('Prompt:', prompt);
  const source = new SSE(`${API_HOST}/v1/text/create`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + plugin.settings.openai.key,
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
export const refreshSemanticSearch = async (notes: NoteRefresh[]) => {
  const response = await fetch('http://localhost:3333/refresh', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({notes: notes.map((note) => ({
      // snake_case to match the API
      note_path: note.notePath,
      note_tags: note.noteTags,
      note_content: note.noteContent,
      path_to_delete: note.pathToDelete,
    }))}),
  });
  return response;
}

/**
 * Get all Markdown files in the vault with their content and tags
 * @param {App} app 
 * @returns {Promise<{path: string, content: string, tags: string[]}[]>} 
 */
export const getCompleteFiles = async (app: App) => {
  const files = app.vault.getFiles()
    .filter((file) => file.extension === 'md');
  const filesData = await Promise.all(
    files.map(async (file) => {
      const data = await app.vault.read(file);
      const cache = app.metadataCache.getFileCache(file);
      const tags =  cache?.tags?.map((tag) => tag.tag) || [];
      return { path: file.path, content: data, tags };
    })
  );
  return filesData;
}
