# obsidian-ava


https://user-images.githubusercontent.com/11430621/206806275-dfd8c5cf-ad66-4a94-89c8-ed2f3277df72.mp4


> Obsidian AVA - Personal Learning Assistant

- [x] **Connect the dots**: connect individual pieces of information in your knowledge base. ✅ 2022-12-07
- [x] **Point you in the right direction**: provide you with other areas of interest that you could explore further. ✅ 2022-12-07
- [ ]   **Engage with the material**: suggest meetups or activities to engage with the learning materials.
- [ ]   **Remember what you learned**: create spaced-repetition prompts to help you remember what you've learned.

⚠️ Experimental

## What is included

- [x] **🧙 AVA Link**: Automatically generate semantic links to other pages ✅ 2022-12-07
- [x] **🧙 AVA Link**: Automatically generate tags for your notes based on your pattern of tagging notes ✅ 2022-12-07
- [x] **🧙 AVA Learn**: Display wikipedia links to relevant knowledge ✅ 2022-12-07
- [ ] **🧙 AVA Search**: A search bar that uses AVA Search API
- [ ] **🧙 AVA Do**: Display events that help you engage with what you learn
- [ ] 🧙 **AVA Repeat**: Integrate with spaced repetition platform


## Limitations

- only tested on macos
- requires `virtualenv` to be installed
- quite heavy setup


## Installation

1. Install Ava from Obsidian's community plugins list 
2. Setup your API keys in the settings 

![settings](./docs/settings.png)

*You don't need to configure any advanced settings*

## How to use 


### 🧙 AVA Link - Connect current page to existing notes
This is a bit cumbersome at the moment. You're required to start the API manually thourgh a command. It can take 2 - 10 min to fully load up.

1. <img  alt="cmd" src="https://upload.wikimedia.org/wikipedia/commons/thumb/8/8b/Looped_square_on_white_background.svg/560px-Looped_square_on_white_background.svg.png?20071209071920" width="16" height="16"> + P 
2. Type Start Search API

![Start Server Gif](https://user-images.githubusercontent.com/11430621/206311329-bedd24b3-6f2b-4457-afae-ec3246c57fca.gif)

After you're able to automatically generate links based on your page content using
1. Select some text
2. Press <img  alt="cmd" src="https://upload.wikimedia.org/wikipedia/commons/thumb/8/8b/Looped_square_on_white_background.svg/560px-Looped_square_on_white_background.svg.png?20071209071920" width="16" height="16"> + P 
3. Type "add related topics"

![Related Topics Example](https://user-images.githubusercontent.com/11430621/206310806-c3c1a226-8c79-46d2-b349-ef7b293fd5dd.gif)

### 🧙 AVA Link - Generate tags for your notes based on your pattern of tagging notes

AVA API need to be started.

2. Press <img  alt="cmd" src="https://upload.wikimedia.org/wikipedia/commons/thumb/8/8b/Looped_square_on_white_background.svg/560px-Looped_square_on_white_background.svg.png?20071209071920" width="16" height="16"> + P 
3. Type "add related tags"

![ezgif com-gif-maker (2)](https://user-images.githubusercontent.com/25003283/207370811-db8f2a10-763e-4424-b4ff-bfcbbfce4309.gif)

### 🧙 AVA Learn - Get suggestion to further reading on Wikipedia 
1. <img  alt="cmd" src="https://upload.wikimedia.org/wikipedia/commons/thumb/8/8b/Looped_square_on_white_background.svg/560px-Looped_square_on_white_background.svg.png?20071209071920" width="16" height="16"> + P 
2. Type "wikipedia"

![wikipedia example](https://user-images.githubusercontent.com/11430621/206311107-7c4a8cc1-390a-4f56-8152-35b412849bd1.gif)


### Extra

We also make it easy to generate Stable Diffusion images from selected text.

#### Stable Diffusion

![ezgif com-gif-maker (3)](https://user-images.githubusercontent.com/25003283/201516129-fa109c45-ce3b-4a34-93be-09750c07fc93.gif)



## TODOs

### Phase 0 - it works on my machine
- [x] **🧙 AVA Link**: Automatically generate semantic links to other pages ✅ 2022-12-07
- [x] **🧙 AVA Learn**: Display wikipedia links to relevant knowledge ✅ 2022-12-07

### Phase 0.5 - It's not a feature, it's definetely a bug

- [x] fix(addRelatedLinks) `[[` appearing at beginning of the "Related Topcis"
- [x] fix(addRelatedLinks):"Related topics" is being added each time that the command is launched -> we should look for a "Related" tag and append notes if already exists ✅ 2022-12-07
- [x] fix(general): should block usage and notify user if  NO API key is set ✅ 2022-12-07
- [x] fix(wikipedia):  "Loading" is appended each time ✅ 2022-12-07
- [x] feat: Add link to page that generated wkipedia come from ✅ 2022-12-07
- [ ] feat: add an icon in the sidebar to show that the api is ready/not ready
- [ ] clean up
	- [ ] remove unused commands
	- [ ] remove dead code
	- [ ] add tests
- [x] feat: Generate tags for your notes based on your pattern of tagging notes ✅ 2022-12-13
	
### Phase 1 - Power to the people
- [ ] Create a dockerized version (should favor docker if available)
- [ ] Lower barrier to entry: improve installation process
- [ ] 

## Phase 2 - Beyond
- [ ] **🧙 AVA Search**: A search bar that uses AVA Search API
- [ ] **🧙 AVA Do**: Display events that help you engage with what you learn
- [ ] 🧙 **AVA Repeat**: Integrate with spaced repetition platform
- [ ] [Implement any search augmented conversational AI for thinking feedback](https://louis030195.medium.com/deploy-seeker-search-augmented-conversational-ai-on-kubernetes-in-5-minutes-81a61aa4e749)
## Releasing

- bump package.json
- `make release`
