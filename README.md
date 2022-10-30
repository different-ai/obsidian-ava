# obsidian-ava


⚠️ Extremely experimental code (but works) ⚠️

Currently runs OpenAI API and stable diffusion

## Stable diffusion

https://user-images.githubusercontent.com/25003283/194750149-b4e98e00-3855-4b22-9803-f41502bba871.mov

## GPT3 autocompletion

https://user-images.githubusercontent.com/25003283/180654125-44932d61-90eb-4c06-b17e-d7dba545acb9.mov

## GPT3 custom prompt (such as fixing grammar)

https://user-images.githubusercontent.com/25003283/198877691-74b9e60f-b621-4dfc-bfdc-a141149a1abd.mov



## Settings

![settings](./docs/settings.png)

## Usage

1. Setup your API keys in the settings
2. Set hotkeys / shortcuts for Ava the commands
3. To generate an image, write & select your prompt then press the Ava image generation hotkey you set
4. For GPT3/text, either enable autocompletion when you want or disable it and use [Templater](https://github.com/SilentVoid13/Templater).

### GPT3 + [Templater](https://github.com/SilentVoid13/Templater)

The advantage of using [Templater](https://github.com/SilentVoid13/Templater) is that you can create your favorite prompts and prompt engineering techniques and use them in any note. 


#### Grammar fixer

Setup [Templater](https://github.com/SilentVoid13/Templater).

Create a script with the following content:

```js
const fixGrammar = async () => {
    const msg = window.getSelection().toString();
    const response = await app.plugins.plugins["obsidian-ava"].openai.createCompletion({
        "model": "text-davinci-002",
        "prompt": "Correct this to standard English:\n\n" + msg,
        "temperature": 0,
        "max_tokens": msg.length + 100,
        "top_p": 1,
        "frequency_penalty": 0,
        "presence_penalty": 0
    })
    return response.data.choices[0].text.trim();
}
module.exports = fixGrammar;
```

Then the template:

```md
<% tp.user.fixGrammar() %>
```

Now you can select some text and execute the Templater template to the selected text grammar.


## TODOs

- [x] Provide an example to use GPT3 with [Templater](https://github.com/SilentVoid13/Templater) for endless prompt engineering
- [ ] optimise autocompletion UX (copy Github copilot UX/make it customisable, like triggered by a hotkey)
- [ ] implement DALLE-2 API (once it's available)
- [x] implement Stable diffusion API (https://beta.dreamstudio.ai)
- [ ] implement huggingface API / custom API
- [ ] local inference?
- [ ] [implement seeker somehow, internet augmented assistance](https://louis030195.medium.com/deploy-seeker-search-augmented-conversational-ai-on-kubernetes-in-5-minutes-81a61aa4e749)
