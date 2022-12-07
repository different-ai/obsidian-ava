import got from 'got';
import AvaPlugin from 'main';
import { Extract } from 'unzipper';
import manifest from './manifest.json';

export interface ISimilarFile {
  file_name: string;
  file_path: string;
}

export const createSemanticLinks = async (
  title: string,
  text: string,
  tags: string[]
) => {
  const query = `File:\n${title}\nTags:${tags}\nContent:\n${text}`;
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

  const similarities = response.similarities.filter(
    (similarity) => similarity.file_name !== title
  );
  console.log(similarities);
  return `${similarities
    .map((similarity) => '[[' + similarity.file_path + ']]')
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

export const filterTags = (tags: string[]) => {
  const ignoredTags = [
    '#shower-thought',
    '#godel-uncertain',
    '#todo',
    '#to-digest',
  ];
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
  console.log(version);
  const url = `https://github.com/louis030195/obsidian-ava/releases/download/${version}/semantic.zip`;
  return new Promise((resolve) => {
    got(url, { isStream: true })
      .pipe(Extract({ path: dest }))
      .end(resolve);
  });
};
