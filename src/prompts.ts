export const prompts = [
  {
    name: 'Fix grammar',
    params: ['Language'],
    generatePrompt: (source: string, language: string) => ({
      model: 'text-davinci-003',
      prompt: `Correct this to standard ${language}:\n\n${source}`,
      temperature: 0,
      max_tokens: 60,
      top_p: 1.0,
      frequency_penalty: 0.0,
      presence_penalty: 0.0,
    }),
  },
  {
    name: 'Translate to',
    params: ['Language'],
    generatePrompt: (source: string, language: string) => ({
      model: 'text-davinci-003',
      prompt: `Translate this to ${language}:\n\n${source}`,
      temperature: 0,
      max_tokens: 60,
      top_p: 1.0,
      frequency_penalty: 0.0,
      presence_penalty: 0.0,
      stop: '\n',
      stream: true,
      logprobs: 10,
      echo: true,
      language: 'de',
    }),
  },
  {
    name: 'Extract Keywords',
    generatePrompt: (source: string) => ({
      model: 'text-davinci-003',
      prompt: `Extract keywords from this text:\n\n${source}`,
      temperature: 0.5,
      max_tokens: 60,
      top_p: 1.0,
      frequency_penalty: 0.8,
      presence_penalty: 0.0,
    }),
  },
  {
    name: 'Summarize',
    generatePrompt: (source: string) => ({
      model: 'text-davinci-003',
      prompt: `Summarize this text:\n\n${source}`,
      temperature: 0.5,
      max_tokens: 60,
      top_p: 1.0,
      frequency_penalty: 0.8,
      presence_penalty: 0.0,
    }),
  },
  {
    name: 'Explain it like I am 5',
    generatePrompt: (source: string) => ({
      model: 'text-davinci-003',
      prompt: `Explain this to a 5 year old:\n\n${source}`,
      temperature: 0.5,
      max_tokens: 60,
      top_p: 1.0,
      frequency_penalty: 0.8,
      presence_penalty: 0.0,
    }),
  },
  {
    name: 'Change tone',
    params: ['Tone'],
    generatePrompt: (source: string, tone: string) => ({
      model: 'text-davinci-003',
      prompt: `Change the tone of this text to ${tone}:\n\n${source}`,
      temperature: 0.5,
      max_tokens: 60,
      top_p: 1.0,
      frequency_penalty: 0.8,
      presence_penalty: 0.0,
    }),
  },
];
