⚠️ Alpha Release

# Obsidian AI - codename AVA

Unlock the full potential of Obsidian Notes and take your productivity to the next level. 
- Create blog posts
- Rewrite paragraphs with ease
- [Link related notes](https://user-images.githubusercontent.com/11430621/206806275-dfd8c5cf-ad66-4a94-89c8-ed2f3277df72.mp4) (only tested on macos)
- Generate stunning visualizations

### Generate meaningful text from your notes.

Get out of a writing slump. Obsidian AI helps you generate content for your next article. From a small paragraph to an entire blog post - we've got you covered.


![paragraph](https://user-images.githubusercontent.com/11430621/207849826-aa59103a-3e60-47ec-85bd-45076ebf8960.gif)


### Write. Rewrite.

Get your unfiltered thoughts down on paper and use our rewrite tool before putting to fit your audience.

![rewrite](https://user-images.githubusercontent.com/11430621/207849873-3a6938e1-0e5e-4f8b-9809-5cd7cb85df08.gif)


### Connect the dots. Leverage your knowledge.

Automatically link your notes in seconds.  Use the "link" shortcut to automatically connect a note to existing content.

![](https://d1muf25xaso8hp.cloudfront.net/https%3A%2F%2Fs3.amazonaws.com%2Fappforest_uf%2Ff1671041695384x127761232744105780%2FScreen%2520Recording%25202022-12-13%2520at%25205.15.17%2520PM.gif?w=512&h=&auto=compress&dpr=2&fit=max)

## Installation

1. Install Ava from Obsidian's community plugins list 
2. Setup your API keys in the settings 

![settings](./docs/settings.png)

*You don't need to configure any advanced settings*


## Frequently Asked Questions

**How much does it cost**
> The first 100 signups will have the tool for free. After that it'll be $10 a month to use the hosted version.

**I doesn't work help!**

> Reach out to ben@prologe.io. We'll personally help you install it.


## Technical Limitations
- You need to have a gpt-3 account. We'll progressively move to a hosted version.
- [link feature](https://user-images.githubusercontent.com/11430621/206806275-dfd8c5cf-ad66-4a94-89c8-ed2f3277df72.mp4) has only been tested on macos

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
- [x] feat: add an icon in the sidebar to show that the api is ready/not ready ✅ 2022-12-15
- [x] clean up ✅ 2022-12-15
	- [x] remove unused commands ✅ 2022-12-15
	- [x] remove dead code ✅ 2022-12-15
	- [ ] add tests
- [x] feat: Generate tags for your notes based on your pattern of tagging notes ✅ 2022-12-13
	
### Phase 1 - Power to the people
- [ ] Create a hosted version
- [ ] Lower barrier to entry: improve installation process

## Phase 2 - Beyond
- [ ] **🧙 AI Search**: A search bar that uses AVA Search API
- [ ] **🧙 AI Do**: Display events that help you engage with what you learn
- [ ] 🧙 **AI Repeat**: Integrate with spaced repetition platform

----

> Don't lag behind the crowd. Augment your learning with AI today.
