/* eslint-disable require-jsdoc */
import linkifyHtml from 'linkify-html';
import {
  App,
  Editor,
  ItemView,
  MarkdownRenderer,
  Notice,
  Plugin,
  PluginSettingTab,
  WorkspaceLeaf,
} from 'obsidian';
import { OpenAIApi } from 'openai';

import * as React from 'react';
import { createRoot, Root } from 'react-dom/client';
import { killAllApiInstances, runSemanticApi } from 'semanticApi';
import {
  DraftStabilityOptions,
  generateAsync,
  RequiredStabilityOptions,
  ResponseData,
} from 'stableDiffusion';
import { AvaSettings, CustomSettings, DEFAULT_SETTINGS } from './Settings';
import { AvaSuggest, StatusBar } from './suggest';
import {
  createParagraph,
  createSemanticLinks,
  createSemanticTags,
  createWikipediaLinks,
  rewrite,
} from './utils';

import posthog from 'posthog-js';
import { PromptModal } from './PromptModal';
import { RewriteModal } from './RewriteModal';

posthog.init('phc_8Up1eqqTpl4m2rMXePkHXouFXzihTCswZ27QPgmhjmM', {
  api_host: 'https://app.posthog.com',
  loaded: (posthog) => {
    posthog.register_once({
      environment: process.env.NODE_ENV,
      version: process.env.npm_package_version,
    });
  },
});
interface StableDiffusion {
  generateAsync: (opts: DraftStabilityOptions & RequiredStabilityOptions) => {
    images: ImageData[];
    res: ResponseData;
  };
}

export const VIEW_TYPE_AVA = 'online.louis01.ava';

// eslint-disable-next-line require-jsdoc
export default class AvaPlugin extends Plugin {
  settings: AvaSettings;
  statusBarItem: Root;
  openai: OpenAIApi;
  stableDiffusion: StableDiffusion;
  private sidebar: AvaSidebarView;

  // eslint-disable-next-line require-jsdoc
  async onload() {
    await this.loadSettings();
    const statusBarItemHtml = this.addStatusBarItem();
    this.statusBarItem = createRoot(statusBarItemHtml);

    this.app.workspace.onLayoutReady(async () => {
      const suggest = new AvaSuggest(this.app, this, 1000, 3);
      this.openai = suggest.openai;

      this.stableDiffusion = {
        // @ts-ignore
        generateAsync: generateAsync,
      };
      this.addCommand({
        id: 'ava-rewrite-prompt',
        name: 'Write - Rewrite',
        editorCallback: (editor: Editor) => {
          posthog.capture('ava-rewrite-prompt');
          // if there's no open ai key stop here and display a message to user
          if (this.settings.openai.key?.length === 0) {
            new Notice('You need to set an OpenAI API key in the settings');
            return;
          }
          if (editor.somethingSelected() === false) {
            new Notice(
              '🧙 Obsidian AI - Select some text to rewrite and try again :)'
            );
          }

          const onSubmit = async (alteration: string) => {
            this.statusBarItem.render(<StatusBar status="loading" />);
            const text = editor.getSelection();
            const source = await rewrite(text, alteration, this);
            // go to the next line
            editor.setCursor({ line: editor.getCursor().line + 2, ch: 0 });

            source.addEventListener('message', function (e: any) {
              const payload = JSON.parse(e.data);
              console.log(payload);
              const currentLine = editor.getCursor().line;
              const lastChar = editor.getLine(currentLine).length;
              editor.setCursor({ line: currentLine, ch: lastChar });
              editor.replaceRange(
                `${payload.choices[0].text}`,
                editor.getCursor()
              );
            });
            source.stream();
            this.statusBarItem.render(<StatusBar status="success" />);
          };

          new RewriteModal(this.app, onSubmit).open();
        },
      });
      this.addCommand({
        id: 'ava-add-prompt',
        name: 'Write - Paragraph',
        editorCallback: (editor: Editor) => {
          posthog.capture('ava-write-paragraph');
          // if there's no open ai key stop here and display a message to user
          if (this.settings.openai.key?.length === 0) {
            new Notice('You need to set an OpenAI API key in the settings');
            return;
          }

          const onSubmit = async (text: string) => {
            this.statusBarItem.render(<StatusBar status="loading" />);
            const source = await createParagraph(text, this);
            source.addEventListener('message', function (e: any) {
              console.log('listen to event');
              const payload = JSON.parse(e.data);
              console.log(payload);
              const currentLine = editor.getCursor().line;
              const lastChar = editor.getLine(currentLine).length;
              editor.replaceRange(`${payload.choices[0].text}`, {
                line: currentLine,
                ch: lastChar,
              });
            });
            source.stream();
            this.statusBarItem.render(<StatusBar status="success" />);
          };

          new PromptModal(this.app, onSubmit).open();
        },
      });

      this.addCommand({
        id: 'ava-refresh-semantic-api',
        name: 'Search API - Refresh',
        callback: async () => {
          posthog.capture('ava-refresh-semantic-api');
          new Notice('Search - Refreshing API');
          fetch('http://localhost:3333/refresh')
            .then(() => new Notice('Search - Refreshed API'))
            .catch((e) => {
              new Notice('Search - Error refreshing API');
              console.error(e);
            });
        },
      });

      this.addCommand({
        id: 'ava-start-semantic-api',
        name: 'Search API - Start',
        callback: async () => {
          posthog.capture('ava-start-semantic-api');
          new Notice('Search - Starting API');
          runSemanticApi(this.app);
        },
      });

      this.addCommand({
        id: 'ava-restart-semantic-api',
        name: 'Search API -  Restart',
        callback: async () => {
          posthog.capture('ava-restart-semantic-api');
          new Notice('Search - Shutting Down API');
          await killAllApiInstances();
          new Notice('Search - Starting API');
          runSemanticApi(this.app);
        },
      });

      this.addCommand({
        id: 'semantic-related-topics',
        name: 'Link - Add Related Topics',
        editorCallback: async (editor: Editor, view: ItemView) => {
          posthog.capture('semantic-related-topics');
          const title = this.app.workspace.getActiveFile()?.basename;
          new Notice('Link - Generating Related Topics ⏰');
          this.statusBarItem.render(<StatusBar status="loading" />);
          let currentText = editor.getValue();
          let completion = '';
          const tags = this.app.metadataCache.getFileCache(
            this.app.workspace.getActiveFile()
          ).tags;
          try {
            completion = await createSemanticLinks(
              title,
              currentText,
              tags.map((tag) => tag.tag)
            );
          } catch (e) {
            console.error(e);
            new Notice(
              'Link - Error generating related topics. Make sure you started AVA Search API'
            );
            this.statusBarItem.render(<StatusBar status="disabled" />);
            return;
          }

          const match = '# Related';
          const matchLength = match.length;
          const content = `
${completion}`;

          // if there is a related section, add to it
          if (!currentText.includes('# Related')) {
            currentText = `${currentText}
# Related`;
          }
          const insertPos = currentText.indexOf(match) + matchLength;
          const newText =
            currentText.slice(0, insertPos) +
            content +
            currentText.slice(insertPos);

          editor.setValue(newText);
          this.statusBarItem.render(<StatusBar status="disabled" />);
          new Notice('Link - Related Topics Added', 2000);
        },
      });

      this.addCommand({
        id: 'semantic-related-tags',
        name: 'Link - Add Related Tags',
        editorCallback: async (editor: Editor, view: ItemView) => {
          posthog.capture('semantic-related-tags');
          const title = this.app.workspace.getActiveFile()?.basename;
          new Notice('Link - Generating Related Tags ⏰');
          this.statusBarItem.render(<StatusBar status="loading" />);
          const currentText = editor.getValue();
          const tags = this.app.metadataCache.getFileCache(
            this.app.workspace.getActiveFile()
          ).tags;
          let completion = '';
          try {
            completion = await createSemanticTags(
              title,
              currentText,
              tags.map((tag) => tag.tag)
            );
          } catch (e) {
            console.error(e);
            new Notice(
              'Link - Error generating related tags. Make sure you started AVA Search API'
            );
            this.statusBarItem.render(<StatusBar status="disabled" />);
            return;
          }

          if (!completion) {
            new Notice('Link - No related tags found');
            this.statusBarItem.render(<StatusBar status="disabled" />);
            return;
          }

          // add tags after the frontmatter
          // i.e. second time the --- is found
          // if no frontmatter, add to the top
          const match = '---';
          const matchLength = match.length;
          const content = `\n[Obsidian AVA](https://github.com/louis030195/obsidian-ava) AI generated tags: ${completion}\n`;

          // find the second match
          const hasFrontmatter = currentText.includes(match);
          if (!hasFrontmatter) {
            editor.setValue(content + currentText);
          } else {
            const insertPos =
              currentText.indexOf(
                match,
                currentText.indexOf(match) + matchLength
              ) + matchLength;
            const newText =
              currentText.slice(0, insertPos) +
              content +
              currentText.slice(insertPos);

            editor.setValue(newText);
          }
          this.statusBarItem.render(<StatusBar status="disabled" />);
          new Notice('Link - Related Tags Added', 2000);
        },
      });

      this.addCommand({
        id: 'get-wikipedia-suggestions',
        name: 'Learn - Get Wikipedia Suggestions',
        editorCallback: async (editor: Editor, view: ItemView) => {
          posthog.capture('get-wikipedia-suggestions');
          const title = this.app.workspace.getActiveFile()?.basename;

          // if there's no open ai key stop here and display a message to user
          if (this.settings.openai.key?.length === 0) {
            new Notice('You need to set an OpenAI API key in the settings');
            return;
          }

          new Notice('Generating Wikipedia Links ⏰');

          this.sidebar.setLoading();
          this.statusBarItem.render(<StatusBar status="loading" />);
          const completion = await createWikipediaLinks(
            title,
            editor.getSelection(),
            this
          );
          this.app.workspace.rightSplit.expand();
          this.sidebar.removeLoading();
          this.sidebar.updateContent(title, completion);
          this.app.workspace.revealLeaf(this.sidebar.leaf);

          this.statusBarItem.render(<StatusBar status="disabled" />);

          new Notice('Generated Wikipedia Links check out your sidebar🔥');
        },
      });
      this.addCommand({
        id: 'ava-generate-image',
        name: '- Generate an image based on selected text',
        editorCallback: async (editor: Editor) => {
          posthog.capture('ava-generate-image');
          if (!this.settings.stableDiffusion.key) {
            new Notice(
              'You need to set a key for Stable Diffusion in the settings',
              3333
            );
            return;
          }
          const selection = editor.getSelection();
          if (!selection) {
            new Notice(
              'You need to select some text to generate an image',
              3333
            );
            return;
          }

          const outDir =
            (this.app.vault.adapter as any).basePath +
            '/' +
            this.app.workspace.getActiveFile().parent.path;
          this.statusBarItem.render(<StatusBar status="loading" />);
          const onError = (e: any) =>
            this.statusBarItem.render(
              <StatusBar
                status="error"
                statusMessage={'Error while generating image ' + e}
              />
            );
          try {
            const { images } = await generateAsync({
              prompt: selection,
              apiKey: this.settings.stableDiffusion.key,
              outDir: outDir,
              debug: false,
              samples: 1,
            });
            if (images.length === 0) {
              onError('No image was generated');
              return;
            }
            // append image below
            editor.replaceSelection(
              // eslint-disable-next-line max-len
              `${selection}\n\n![[${images[0].filePath.split('/').pop()}]]\n\n`
            );

            this.statusBarItem.render(
              <StatusBar
                status="success"
                statusMessage="Completion successful"
              />
            );
          } catch (e) {
            onError(e);
          }
        },
      });

      this.registerEditorSuggest(suggest);
      this.registerView(VIEW_TYPE_AVA, (leaf: WorkspaceLeaf) => {
        const sidebar = new AvaSidebarView(leaf, this);

        this.sidebar = sidebar;

        return sidebar;
      });

      // This adds a settings tab so the user
      // can configure various aspects of the plugin
      this.addSettingTab(new AvaSettingTab(this.app, this));
      this.initLeaf();
    });
  }
  initLeaf(): void {
    if (this.app.workspace.getLeavesOfType(VIEW_TYPE_AVA).length) {
      return;
    }
    this.app.workspace.getRightLeaf(false).setViewState({
      type: VIEW_TYPE_AVA,
    });
  }

  // eslint-disable-next-line require-jsdoc
  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  // eslint-disable-next-line require-jsdoc
  async saveSettings() {
    await this.saveData(this.settings);
  }
  onunload(): void {
    if (process.env.NODE_ENV === 'development') return;
    killAllApiInstances();
  }
}

// eslint-disable-next-line require-jsdoc
class AvaSettingTab extends PluginSettingTab {
  plugin: AvaPlugin;
  // eslint-disable-next-line require-jsdoc
  constructor(app: App, plugin: AvaPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  // eslint-disable-next-line require-jsdoc
  display(): void {
    const root = createRoot(this.containerEl);
    root.render(<CustomSettings plugin={this.plugin} />);
  }
}

export class AvaSidebarView extends ItemView {
  private readonly plugin: AvaPlugin;

  constructor(leaf: WorkspaceLeaf, plugin: AvaPlugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getDisplayText(): string {
    return 'Wikpedia Links';
  }

  getViewType(): string {
    return VIEW_TYPE_AVA;
  }
  removeLoading = () => {
    document.getElementById('loading-state')?.remove();
  };

  setLoading = () => {
    const loadingEl = document.createElement('div');
    loadingEl.innerText = 'Loading...';
    loadingEl.id = 'loading-state';
    this.contentEl.appendChild(loadingEl);
  };

  async updateContent(title: string, content: string): Promise<void> {
    this.removeLoading();
    const linkified = linkifyHtml(content);
    await MarkdownRenderer.renderMarkdown(
      `## [[${title}]]`,
      this.contentEl,
      '',
      this.plugin
    );

    await MarkdownRenderer.renderMarkdown(
      linkified,
      this.contentEl,
      '',
      this.plugin
    );
    // this.containerEl.append(linkified);
  }

  getIcon(): string {
    return 'clock';
  }

  async onOpen(): Promise<void> {
    const header = document.createElement('h2');
    header.id = 'header';
    header.innerText = 'Wikipedia Links';

    const emptyState = document.createElement('div');
    emptyState.id = 'empty-state';

    emptyState.innerHTML = `
    <div>
      <p>
      Your links will appear here
      </p>
      <ol>
      <li>Select some text</li>
      <li>Press F1</li>
      <li>Type "Get Wikipedia Suggestions"</li>
      </ol>
    </div>
    `;

    this.contentEl.appendChild(header);
    this.contentEl.appendChild(emptyState);
  }
}
