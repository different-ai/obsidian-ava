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
import { StatusBar } from './suggest';
import {
  complete,
  createParagraph,
  createSemanticLinks,
  createWikipediaLinks,
  EMBED_CHAR_LIMIT,
  getCompleteFiles,
  refreshSemanticSearch,
  rewrite,
  REWRITE_CHAR_LIMIT as TEXT_CREATE_CHAR_LIMIT,
  userMessage,
} from './utils';

import posthog from 'posthog-js';
import { AvaSettings, DEFAULT_SETTINGS } from './LegacySettings';
import { LinkView, VIEW_TYPE_LINK } from './linkView';
import { PromptModal } from './PromptModal';
import { RewriteModal } from './RewriteModal';
import { SearchModal } from './searchModal';
import { store } from './store';
import { VIEW_TYPE_WRITE, WriteView } from './writeView';

interface ImageAIClient {
  createImage: (
    request: RequestImageCreate,
    token: string
  ) => Promise<ResponseImageCreate>;
}

const onGeneralError = (e: any) => {
  console.error(e);
  if (e.toString().includes('subscription')) {
    // open app.anotherai.co
    window.open('https://app.anotherai.co', '_blank');
  }
  new Notice(userMessage(e));
};
const onSSEError = (e: any) => {
  onGeneralError(e.data);
};

export default class AvaPlugin extends Plugin {
  settings: AvaSettings;
  statusBarItem: Root;
  openai: OpenAIApi;
  imageAIClient: ImageAIClient;
  private sidebar: WriteView;
  private eventRefChanged: EventRef;
  private eventRefRenamed: EventRef;
  private eventRefDeleted: EventRef;

  private async link() {
    const file = this.app.workspace.getActiveFile();
    if (!file) return;
    posthog.capture('semantic-related-topics');
    new Notice('Link - Connecting Related Notes ⏰');
    console.log('hello');
    const currentText = await this.app.vault.read(file);
    if (currentText.length > EMBED_CHAR_LIMIT) {
      new Notice(
        'Link - Note is too long. 🧙 AVA  only supports notes that are up to 25k characters'
      );
      return;
    }
    let completion = null;
    const tags = this.app.metadataCache.getFileCache(file).tags || [];
    try {
      completion = await createSemanticLinks(
        file.path,
        currentText,
        tags.map((tag) => tag.tag),
        this.settings?.token,
        this.settings.vaultId
      );

      this.statusBarItem.render(<StatusBar status="disabled" />);
      return completion;
    } catch (e) {
      console.error(e);
      new Notice(
        'Link - Error connecting related notes. Make sure you started AVA Search API'
      );
      this.statusBarItem.render(<StatusBar status="disabled" />);
      return;
    }
  }
  async displayWriteSidebar() {
    this.app.workspace.detachLeavesOfType(VIEW_TYPE_WRITE);

    await this.app.workspace.getRightLeaf(false).setViewState({
      type: VIEW_TYPE_WRITE,
      active: true,
    });

    this.app.workspace.revealLeaf(
      this.app.workspace.getLeavesOfType(VIEW_TYPE_WRITE)[0]
    );
  }

  async displayLinkSidebar() {
    this.app.workspace.detachLeavesOfType(VIEW_TYPE_LINK);

    await this.app.workspace.getRightLeaf(false).setViewState({
      type: VIEW_TYPE_LINK,
      active: true,
    });

    this.app.workspace.revealLeaf(
      this.app.workspace.getLeavesOfType(VIEW_TYPE_LINK)[0]
    );
  }

  async updateSearch() {
    this.statusBarItem.render(<StatusBar status="loading" />);
    // update the view
    const results = await this.link();
    if (results) {
      store.setState({ embeds: results });
    }
    this.statusBarItem.render(<StatusBar status="disabled" />);
  }

  private async indexWholeVault() {
    try {
      const files = await getCompleteFiles(this.app);
      console.log('Ava - Indexing vault with', files);
      // display message estimating indexing time according to number of notes
      new Notice(
        'Search - Indexing vault...' +
          (files.length > 1000
            ? ' (your vault is large, this may take a while)'
            : ''),
        2000
      );

      await refreshSemanticSearch(
        files.map((file) => ({
          notePath: file.path,
          noteTags: file.tags,
          noteContent: file.content,
        })),
        this.settings?.token,
        this.settings?.vaultId
      );
      this.listenToNoteEvents();
      new Notice('Search - Vault indexed successfully', 2000);
    } catch (e) {
      onGeneralError(e);
      this.unlistenToNoteEvents();
    }
  }
  private unlistenToNoteEvents() {
    console.log('Ava - Unlistening to note events');
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
          refreshSemanticSearch(
            [
              {
                notePath: file.path,
                noteTags: cache.tags?.map((tag) => tag.tag) || [],
                noteContent: data,
              },
            ],
            this.settings?.token,
            this.settings?.vaultId
          );
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
          refreshSemanticSearch(
            [
              {
                notePath: f.path,
                noteTags: cache.tags?.map((tag) => tag.tag) || [],
                noteContent: data,
                pathToDelete: oldPath,
              },
            ],
            this.settings?.token,
            this.settings?.vaultId
          );
        } catch (e) {
          onGeneralError(e);
          this.unlistenToNoteEvents();
        }
      });
    });
    this.eventRefDeleted = this.app.vault.on('delete', (file) => {
      try {
        refreshSemanticSearch(
          [
            {
              pathToDelete: file.path,
            },
          ],
          this.settings?.token,
          this.settings.vaultId
        );
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
      this.updateSearch();
      // ignore on dev otherwise it will index the whole vault every code change
      if (process.env.NODE_ENV !== 'development') this.indexWholeVault();

      this.imageAIClient = {
        createImage,
      };

      this.addCommand({
        id: 'ava-add-prompt',
        name: 'Write Paragraph',
        editorCallback: (editor: Editor) => {
          posthog.capture('ava-write-paragraph');
          new Notice('🧙 Writing Paragraph', 2000);

          const onSubmit = async (text: string) => {
            this.statusBarItem.render(<StatusBar status="loading" />);
            const source = await createParagraph(text, this.settings.token);
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
            new Notice('You need to select some text to generate an image');
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
            const { imagePaths } = await createImage(
              {
                prompt: selection,
                outputDir: outDir,
              },
              this.settings?.token
            );
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
          if (editor.getSelection().length > TEXT_CREATE_CHAR_LIMIT) {
            new Notice(
              '🧙 Obsidian AI - Selection is too long, please select less than 5800 characters ~1200 words'
            );
            return;
          }

          this.displayWriteSidebar();

          const onSubmit = async (prompt: string) => {
            this.statusBarItem.render(<StatusBar status="loading" />);
            const text = editor.getSelection();
            const source = await rewrite(text, prompt, this.settings.token);
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
        id: 'ava-search',
        name: 'Search',
        callback: async () => {
          posthog.capture('ava-search');
          new SearchModal(
            this.app,
            this.settings.token,
            this.settings.vaultId
          ).open();
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
        id: 'ava-generate-link',
        name: 'Generate Link',
        editorCallback: async (editor: Editor) => {
          this.displayLinkSidebar();
          store.setState({ editorContext: editor });
          this.updateSearch();
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
            this.settings.token,
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


      this.addCommand({
        id: 'ava-complete',
        name: 'Complete Selection',
        editorCallback: async (editor: Editor) => {
          posthog.capture('ava-complete');

          if (editor.somethingSelected() === false) {
            new Notice(
              '🧙 Obsidian AI - Select some text to rewrite and try again :)'
            );
            return;
          }
          if (editor.getSelection().length > TEXT_CREATE_CHAR_LIMIT) {
            new Notice(
              '🧙 Obsidian AI - Selection is too long, please select less than 5800 characters ~1200 words'
            );
            return;
          }
          new Notice(
            '🧙 Obsidian AI - Completing selection, this may take a few seconds'
          );

          this.statusBarItem.render(<StatusBar status="loading" />);
          const text = editor.getSelection();
          const lines = text.split('\n');
          // set cursor at the end of the selection
          editor.setCursor({line: editor.getCursor().line + lines.length - 1,
            ch: lines[lines.length - 1].length
          });
          const source = await complete(text, this.settings.token, {stream: true});
          // TODO: display information message
          // TODO: when the completion is null (i.e. when prompt end by . for example)
          source.addEventListener('message', function (e: any) {
            const payload = JSON.parse(e.data);
            console.log(payload);
            const currentLine = editor.getCursor().line;
            const lastChar = editor.getLine(currentLine).length;
            const completion = payload.choices[0].text;
            editor.setCursor({
              line: currentLine,
              ch: lastChar + (completion === '\n' ? 10 : 0)
            });
            // if \n then jump to next line
            if (completion === '\n') {
              editor.setCursor({
                line: currentLine + 1,
                ch: 0
              });
            }
            editor.replaceRange(
              completion,
              editor.getCursor()
            );
          });
          source.addEventListener('error', onSSEError);
          source.stream();
          this.statusBarItem.render(<StatusBar status="success" />);
        },
      });

      // this.registerEvent(
      //   this.app.workspace.on('file-open', () => {
      //     this.updateSearch();
      //   })
      // );

      this.registerView(
        VIEW_TYPE_WRITE,
        (leaf: WorkspaceLeaf) => new WriteView(leaf, this)
      );
      this.registerView(
        VIEW_TYPE_LINK,
        (leaf: WorkspaceLeaf) => new LinkView(leaf, this)
      );

      // This adds a settings tab so the user
      // can configure various aspects of the plugin
      this.addSettingTab(new AvaSettingTab(this.app, this));
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
    this.app.workspace.detachLeavesOfType(VIEW_TYPE_LINK);
    this.app.workspace.detachLeavesOfType(VIEW_TYPE_WRITE);

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
