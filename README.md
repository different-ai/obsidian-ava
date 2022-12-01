# obsidian-ava

Augment your brain with AI.

## Stable diffusion

![ezgif com-gif-maker (3)](https://user-images.githubusercontent.com/25003283/201516129-fa109c45-ce3b-4a34-93be-09750c07fc93.gif)

## GPT3 custom prompt

![ezgif com-gif-maker (2)](https://user-images.githubusercontent.com/25003283/201516098-db39c37f-29c8-4dfa-a999-1e1ac8f08272.gif)

## Installation

1. Install Ava from Obsidian's community plugins list
2. Setup your API keys in the settings
3. Set hotkeys / shortcuts for Ava the commands
4. To generate an image, write & select your prompt then press the Ava image generation hotkey you set
5. For GPT3/text, either enable autocompletion when you want or disable it and use [Templater](https://github.com/SilentVoid13/Templater).


### Settings

![settings](./docs/settings.png)

### GPT3 + [Templater](https://github.com/SilentVoid13/Templater)

The advantage of using [Templater](https://github.com/SilentVoid13/Templater) is that you can create your favorite prompts and prompt engineering techniques and use them in any note. 

You can combine GPT3, stable diffusion and more to helps you think & connect ideas.

Please see https://github.com/louis030195/obsidian-ava/issues/13 for template examples.

### Advanced usage: semantic search

Please see [semantic search documentation](./semantic/README.md) to learn how to use semantic search.

It can be useful to for example, automatically connect semantically your notes through links, tags, etc. Or simply for semantic search :).

Also see https://github.com/louis030195/obsidian-ava/issues/15.

## TODOs

- [x] Provide an example to use GPT3 with [Templater](https://github.com/SilentVoid13/Templater) for endless prompt engineering
- [ ] optimise autocompletion UX, copy Copilot's UX
- [ ] implement DALLE-2 API
- [x] implement Stable diffusion API (https://beta.dreamstudio.ai)
- [ ] implement huggingface API / custom API
- [ ] local inference?
- [ ] [Implement any search augmented conversational AI for thinking feedback](https://louis030195.medium.com/deploy-seeker-search-augmented-conversational-ai-on-kubernetes-in-5-minutes-81a61aa4e749)


## Releasing

- bump package.json
- `make release`
