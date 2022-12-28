import {
  App,
  Editor,
  EventRef,
  ItemView,
  Notice,
  Plugin,
  PluginSettingTab,
  TFile,
  WorkspaceLeaf,
} from 'obsidian';
import { OpenAIApi } from 'openai';

import * as React from 'react';
import { createRoot, Root } from 'react-dom/client';
import { CustomSettings } from './Settings';
import {
  createImage,
  RequestImageCreate,
  ResponseImageCreate,
} from './stableDiffusion';
import { AvaSuggest, StatusBar } from './suggest';
import {
  createParagraph,
  createSemanticLinks,
  createSemanticTags,
  createWikipediaLinks,
  getCompleteFiles,
  refreshSemanticSearch,
  rewrite,
  userMessage,
} from './utils';

import posthog from 'posthog-js';
import { AvaSidebarView } from './AvaSidebarView';
import { AvaSettings, DEFAULT_SETTINGS } from './LegacySettings';
import { PromptModal } from './PromptModal';
import { RewriteModal } from './RewriteModal';
import { store } from './store';

interface ImageAIClient {
  createImage: (request: RequestImageCreate, token: string) => Promise<ResponseImageCreate>;
}

export const VIEW_TYPE_AVA = 'online.louis01.ava';

const onGeneralError = (e: any) => {
  console.error(e);
  if (e.toString().includes('subscription')) {
    // open app.anotherai.co
    window.open('https://app.anotherai.co', '_blank');
  }
  new Notice(userMessage(e));
}
const onSSEError = (e: any) => {
  onGeneralError(e.data);
}

export default class AvaPlugin extends Plugin {
  settings: AvaSettings;
  statusBarItem: Root;
  openai: OpenAIApi;
  imageAIClient: ImageAIClient;
  private sidebar: AvaSidebarView;
  private eventRefChanged: EventRef;
  private eventRefRenamed: EventRef;
  private eventRefDeleted: EventRef;

  private async indexWholeVault () {
    try {
      const files = await getCompleteFiles(this.app);
      await refreshSemanticSearch(
        files.map((file) => ({
          notePath: file.path,
          noteTags: file.tags,
          noteContent: file.content,
        })),
        this.settings?.token
      );
      this.listenToNoteEvents();
      new Notice('Search - Vault loaded successfully', 2000);
    } catch (e) {
      onGeneralError(e);
      this.unlistenToNoteEvents();
    }
  }
  private unlistenToNoteEvents() {
    this.app.metadataCache.offref(this.eventRefChanged);
    this.app.metadataCache.offref(this.eventRefRenamed);
    this.app.metadataCache.offref(this.eventRefDeleted);
  }
  private listenToNoteEvents() {
    if (this.eventRefChanged) {
      console.log('Already listening to note events, unlistening first');
      this.unlistenToNoteEvents();
    }
    this.eventRefChanged = this.app.metadataCache.on(
      'changed',
      (file, data, cache) => {
        try {
          refreshSemanticSearch([
            {
              notePath: file.basename,
              noteTags: cache.tags?.map((tag) => tag.tag) || [],
              noteContent: data,
            },
          ], this.settings?.token);
        } catch (e) {
          onGeneralError(e);
          this.unlistenToNoteEvents();
        }
      }
    );
    this.eventRefRenamed = this.app.vault.on('rename', (file, oldPath) => {
      Promise.all([
        this.app.vault.adapter.read(file.path),
        this.app.metadataCache.getCache(file.path),
      ]).then(([data, cache]) => {
        // Somehow event triggered twice and cache only defined on the second time
        if (!cache) return;
        const f = file as TFile;
        try {
          refreshSemanticSearch([
            {
              notePath: f.basename,
              noteTags: cache.tags?.map((tag) => tag.tag) || [],
              noteContent: data,
              pathToDelete: oldPath.split('/').pop().replace('.md', ''),
            },
          ], this.settings?.token);
        } catch (e) {
          onGeneralError(e);
          this.unlistenToNoteEvents();
        }
      });
    });
    this.eventRefDeleted = this.app.vault.on('delete', (file) => {
      try {
        refreshSemanticSearch([
          {
            pathToDelete: (file as TFile).basename,
          },
        ], this.settings?.token);
      } catch (e) {
        onGeneralError(e);
        this.unlistenToNoteEvents();
      }
    });
  }
  // eslint-disable-next-line require-jsdoc
  async onload() {
    await this.loadSettings();

    posthog.init('phc_8Up1eqqTpl4m2rMXePkHXouFXzihTCswZ27QPgmhjmM', {
      api_host: 'https://app.posthog.com',
      loaded: (posthog) => {
        posthog.register_once({
          environment: process.env.NODE_ENV,
          version: process.env.npm_package_version,
        });
      },
    });
    if (this.settings.debug) posthog.opt_out_capturing();

    const statusBarItemHtml = this.addStatusBarItem();
    this.statusBarItem = createRoot(statusBarItemHtml);

    this.app.workspace.onLayoutReady(async () => {
      const suggest = new AvaSuggest(this.app, this, 1000, 3);
      this.openai = suggest.openai;
      this.indexWholeVault();

      this.imageAIClient = {
        createImage,
      };

      this.addCommand({
        id: 'ava-add-prompt',
        name: 'Write Paragraph',
        editorCallback: (editor: Editor) => {
          posthog.capture('ava-write-paragraph');

          const onSubmit = async (text: string) => {
            this.statusBarItem.render(<StatusBar status="loading" />);
            const source = await createParagraph(text, this);
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
            source.addEventListener('error', onSSEError);
            source.stream();
            this.statusBarItem.render(<StatusBar status="success" />);
          };

          new PromptModal(this.app, onSubmit).open();
        },
      });
      this.addCommand({
        id: 'ava-generate-image',
        name: 'Generate Image',
        editorCallback: async (editor: Editor) => {
          const selection = editor.getSelection();

          posthog.capture('ava-generate-image', {
            // capture prompt length (i.e. might create GPT3 post-processing for newbies)
            promptLength: selection.length,
          });
          if (!selection) {
            new Notice(
              'You need to select some text to generate an image',
            );
            return;
          }

          const outDir =
            (this.app.vault.adapter as any).basePath +
            '/' +
            this.app.workspace.getActiveFile().parent.path;
          this.statusBarItem.render(<StatusBar status="loading" />);
          const onError = (e: any) => {
            onGeneralError(e);
            this.statusBarItem.render(
              <StatusBar
                status="error"
                statusMessage={'Error while generating image ' + e}
              />
            );
          };
          new Notice('Generating image ⏰');
          try {
            const { imagePaths } = await createImage({
              prompt: selection,
              outputDir: outDir,
            }, this.settings?.token);
            if (imagePaths.length === 0) {
              onError('No image was generated');
              return;
            }
            // append image below
            editor.replaceSelection(
              `${selection}\n\n![[${imagePaths[0].split('/').pop()}]]\n\n`
            );

            this.statusBarItem.render(
              <StatusBar
                status="success"
                statusMessage="Completion successful"
              />
            );
            new Notice('Image generated successfully', 2000);
          } catch (e) {
            onError(e);
          }
        },
      });

      this.addCommand({
        id: 'ava-rewrite-prompt',
        name: 'Rewrite Selection',
        editorCallback: (editor: Editor) => {
          posthog.capture('ava-rewrite-prompt');

          if (editor.somethingSelected() === false) {
            new Notice(
              '🧙 Obsidian AI - Select some text to rewrite and try again :)'
            );
            return;
          }
          this.app.workspace.rightSplit.expand();
          this.app.workspace.revealLeaf(this.sidebar.leaf);

          const onSubmit = async (prompt: string) => {
            this.statusBarItem.render(<StatusBar status="loading" />);
            const text = editor.getSelection();
            const source = await rewrite(text, prompt, this);
            source.addEventListener('error', onSSEError);
            store.getState().reset();
            // go to the next line

            source.addEventListener('message', function (e: any) {
              const payload = JSON.parse(e.data);
              store.getState().setPrompt(`Rewrite to ${prompt}`);
              store.getState().setEditorContext(editor);
              store.getState().appendContentToRewrite(payload.choices[0].text);

              return;
            });
            source.stream();
            this.statusBarItem.render(<StatusBar status="success" />);
          };

          new RewriteModal(this.app, onSubmit).open();
        },
      });

      this.addCommand({
        id: 'semantic-related-topics',
        name: 'Link Notes',
        editorCallback: async (editor: Editor, view: ItemView) => {
          posthog.capture('semantic-related-topics');
          const title = this.app.workspace.getActiveFile()?.basename;
          new Notice('Link - Connecting Related Notes ⏰');
          this.statusBarItem.render(<StatusBar status="loading" />);
          let currentText = editor.getValue();
          let completion = '';
          const tags =
            this.app.metadataCache.getFileCache(
              this.app.workspace.getActiveFile()
            ).tags || [];
          try {
            completion = await createSemanticLinks(
              title,
              currentText,
              tags.map((tag) => tag.tag),
              this.settings?.token
            );
          } catch (e) {
            console.error(e);
            new Notice(
              'Link - Error connecting related notes. Make sure you started AVA Search API'
            );
            this.statusBarItem.render(<StatusBar status="disabled" />);
            return;
          }

          if (!completion) {
            new Notice('Link - No related notes found');
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
          new Notice('Link - Related Notes Added', 2000);
        },
      });

      this.addCommand({
        id: 'ava-load-semantic',
        name: 'Search API - Load vault',
        callback: async () => {
          posthog.capture('ava-load-semantic');
          await this.indexWholeVault();
        },
      });

      this.addCommand({
        id: 'semantic-related-tags',
        name: 'Experimental: Link Tags',
        editorCallback: async (editor: Editor, view: ItemView) => {
          posthog.capture('semantic-related-tags');
          const title = this.app.workspace.getActiveFile()?.basename;
          new Notice('Link - Generating Related Tags ⏰');
          this.statusBarItem.render(<StatusBar status="loading" />);
          const currentText = editor.getValue();
          const tags =
            this.app.metadataCache.getFileCache(
              this.app.workspace.getActiveFile()
            ).tags || [];
          let completion = '';
          try {
            completion = await createSemanticTags(
              title,
              currentText,
              tags.map((tag) => tag.tag),
              this.settings?.token
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
        name: 'Get Wikipedia Suggestions',
        editorCallback: async (editor: Editor, view: ItemView) => {
          posthog.capture('get-wikipedia-suggestions');
          const title = this.app.workspace.getActiveFile()?.basename;

          new Notice('Generating Wikipedia Links ⏰');
          if (editor.somethingSelected() === false) {
            new Notice('🧙 Obsidian AI - Select some text and try again :)');
            return;
          }

          this.statusBarItem.render(<StatusBar status="loading" />);
          const completion = await createWikipediaLinks(
            title,
            editor.getSelection(),
            this,
          );
          store.getState().reset();
          store.getState().setPrompt(title);
          this.app.workspace.rightSplit.expand();
          this.app.workspace.revealLeaf(this.sidebar.leaf);
          store.getState().setEditorContext(editor);
          store.getState().appendContentToRewrite(completion);
          this.statusBarItem.render(<StatusBar status="disabled" />);

          new Notice('Generated Wikipedia Links check out your sidebar🔥');
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
    this.unlistenToNoteEvents();
  }
}

// eslint-disable-next-line require-jsdoc
class AvaSettingTab extends PluginSettingTab {
  plugin: AvaPlugin;
  initialized = false;
  // eslint-disable-next-line require-jsdoc
  constructor(app: App, plugin: AvaPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  // eslint-disable-next-line require-jsdoc
  display(): void {
    if (this.initialized) return;
    const root = createRoot(this.containerEl);
    root.render(<CustomSettings plugin={this.plugin} />);
    this.initialized = true;
  }
}
