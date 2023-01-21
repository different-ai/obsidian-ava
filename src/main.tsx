import {
  addIcon,
  App,
  Editor,
  EventRef,
  Notice,
  Plugin,
  PluginSettingTab,
  TFile,
  WorkspaceLeaf,
} from 'obsidian';

import * as React from 'react';
import { createRoot, Root } from 'react-dom/client';
import { CustomSettings } from './Settings';
import {
  createImage,
  RequestImageCreate,
  ResponseImageCreate,
} from './stableDiffusion';
import { StatusBar } from './StatusBar';
import {
  clearIndex,
  complete,
  createParagraph,
  createSemanticLinks,
  EMBED_CHAR_LIMIT,
  getCompleteFiles,
  getLinkData,
  getVaultId,
  ICompletion,
  ISearchData,
  ISearchRequest,
  refreshSemanticSearch,
  rewrite,
  REWRITE_CHAR_LIMIT as TEXT_CREATE_CHAR_LIMIT,
  search,
  suggestTags,
} from './utils';

import posthog from 'posthog-js';
import { AvaSettings, DEFAULT_SETTINGS } from './LegacySettings';
import { LinkView, VIEW_TYPE_LINK } from './linkView';
import { PromptModal } from './PromptModal';
import { RewriteModal } from './RewriteModal';
import { SearchModal } from './searchModal';
import { store } from './store';
import { VIEW_TYPE_WRITE, WriteView } from './writeView';
import { iconAva } from './constants';
import { tutorial } from './tutorial';

const onGeneralError = (e: any) => {
  console.error(e);
};
const onSSEError = (e: any) => {
  onGeneralError(e.data);
  let m = 'Internal Server Error'
  try {
    m = JSON.parse(e.data).message;
  } catch (e) {
    console.error(e);
  }
  new Notice(`️⛔️ AVA ${m}`, 4000);
  store.setState({ loadingContent: false });
};

export default class AvaPlugin extends Plugin {
  public settings: AvaSettings;
  public statusBarItem: Root;
  /**
   * Create an image using based on a text
   * Example:
    ```ts
    const { imagePaths } = await createImage(
      {
        prompt: "foobar",
        outputDir: outDir,
      },
    );
    if (imagePaths.length === 0) {
      console.error('No image was generated');
      return;
    }
    // append image below
    editor.replaceSelection(
      `foobar\n\n![[${imagePaths[0].split('/').pop()}]]\n\n`
    );
    ```
   */
  public createImage: (
    request: RequestImageCreate
  ) => Promise<ResponseImageCreate>;
  /**
   * Complete a sentence
   * Example:
    ```ts
    const completion = await complete(
      'The white horse of Henry VIII is of colour',
    );
    console.log(completion);
    // result: "white"
    ```
   */
  public complete: (
    prompt: string,
    options?: ICompletion
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ) => Promise<any | string>;
  /**
   * Semantically search your vault
   * Example:
   ```ts
    const response = await search({
      note: {
        notePath: 'path/to/note.md',
        noteContent: 'text of the note',
        noteTags: ['tag1', 'tag2'],
      },
    });
    console.log(response);
  ```
  */

  public search: (request: ISearchRequest) => Promise<ISearchData>;
  public clearIndex: () => Promise<any>;
  private eventRefChanged: EventRef;
  private eventRefRenamed: EventRef;
  private eventRefDeleted: EventRef;
  private streamingSource: any;
  private setStreamingSource(source: any) {
    this.streamingSource?.removeAllListeners();
    this.streamingSource?.close();
    this.streamingSource = source;
  }

  private async link(currentText: string, tags: string[], path: string) {
    if (currentText.length > EMBED_CHAR_LIMIT) {
      new Notice(
        'Link - Note is too long. 🧙 AVA  only supports notes that are up to 25k characters'
      );
      return;
    }
    let completion = null;
    try {
      completion = await createSemanticLinks(
        path,
        currentText,
        tags,
        this.settings?.token,
        this.settings.vaultId,
        this.manifest.version
      );

      this.statusBarItem.render(<StatusBar status="disabled" />);
      return completion;
    } catch (e) {
      console.error(e);

      new Notice(`️⛔️ AVA ${e}`, 4000);
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

  public async indexWholeVault() {
    try {
      const files = await getCompleteFiles(this.app);
      console.log('Ava - Indexing vault with', files);
      // display message estimating indexing time according to number of notes
      // 1000 notes = 4 seconds
      // 2500 notes = 10 seconds
      // 5000 notes = 20 seconds
      // 10000 notes = 40 seconds
      new Notice(
        'Search - Indexing vault...' +
          (files.length > 1000
            ? ' (your vault is large, this may take a while,' +
              // display in seconds
              `estimated time: ${Math.round(files.length / 250)}s)`
            : ''),
        2000
      );

      store.setState({ linksStatus: 'loading' });
      // 2000 = approx 13s - tune it for optimal user feedback / indexing time
      const batchSize = 2000;
      // execute in parallel batches split of batchSize size
      await Promise.all(
        // split in batches of batchSize
        files
          .reduce((acc, file, i) => {
            if (i % batchSize === 0) {
              acc.push(files.slice(i, i + batchSize));
            }
            return acc;
          }, [])
          .map((batch) =>
            refreshSemanticSearch(
              batch.map((file: any) => ({
                notePath: file.path,
                noteTags: file.tags,
                noteContent: file.content,
              })),
              this.settings?.token,
              this.settings?.vaultId,
              this.manifest.version
            ).then(() => {
              new Notice(
                'Search - Vault indexing in progress, ' +
                  batch.length +
                  ' files indexed',
                2000
              );
            })
          )
      );

      // only listen to note events if we don't already listen
      if (!this.eventRefChanged) this.listenToNoteEvents();
      new Notice('Search - Vault indexed successfully', 2000);
      store.setState({ linksStatus: 'running' });
    } catch (e) {
      onGeneralError(e);
      const m = e.message || e;
      new Notice(`⛔️ AVA ${m}`, 4000);
      this.unlistenToNoteEvents();
      store.setState({ linksStatus: 'error' });
      // TODO: uselinks false?
    }
  }
  public unlistenToNoteEvents() {
    console.log('Ava - Unlistening to note events');
    this.app.metadataCache.offref(this.eventRefChanged);
    this.app.metadataCache.offref(this.eventRefRenamed);
    this.app.metadataCache.offref(this.eventRefDeleted);
    store.setState({ linksStatus: 'disabled' });
  }
  public listenToNoteEvents() {
    if (this.eventRefChanged) {
      console.log('Already listening to note events, unlistening first');
      this.unlistenToNoteEvents();
    }
    store.setState({ linksStatus: 'running' });

    this.eventRefChanged = this.app.metadataCache.on(
      'changed',
      (file, data, cache) => {
        try {
          if (!this.settings.useLinks) {
            this.unlistenToNoteEvents();
            return;
          }
          refreshSemanticSearch(
            [
              {
                notePath: file.path,
                noteTags: cache.tags?.map((tag) => tag.tag) || [],
                noteContent: data,
              },
            ],
            this.settings?.token,
            this.settings?.vaultId,
            this.manifest.version
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
          if (!this.settings.useLinks) {
            this.unlistenToNoteEvents();
            return;
          }
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
            this.settings?.vaultId,
            this.manifest.version
          );
        } catch (e) {
          onGeneralError(e);
          this.unlistenToNoteEvents();
        }
      });
    });
    this.eventRefDeleted = this.app.vault.on('delete', (file) => {
      try {
        if (!this.settings.useLinks) {
          this.unlistenToNoteEvents();
          return;
        }
        refreshSemanticSearch(
          [
            {
              pathToDelete: file.path,
            },
          ],
          this.settings?.token,
          this.settings.vaultId,
          this.manifest.version
        );
      } catch (e) {
        onGeneralError(e);
        this.unlistenToNoteEvents();
      }
    });
  }
  // eslint-disable-next-line require-jsdoc
  async onload() {
    addIcon('ava', iconAva);
    this.addRibbonIcon('ava', 'Ava', () => {
      const n = 'Ava - Getting Started.md';

      this.app.vault.adapter.write(n, tutorial).then(() => {
        this.app.workspace.openLinkText(n, n);
      });
    });
    await this.loadSettings();
    console.log('Ava version', this.manifest.version);
    posthog.init('phc_8Up1eqqTpl4m2rMXePkHXouFXzihTCswZ27QPgmhjmM', {
      api_host: 'https://app.posthog.com',
      autocapture: false,
    });

    try {
      if (this.settings.token && !this.settings.userId) {
        const vaultId = getVaultId(this);
        const linkData = await getLinkData(vaultId);
        this.settings.userId = linkData.userId;
        this.saveSettings();
      }
      posthog.identify(this.settings.userId, {
        vaultId: this.settings.vaultId,
        version: this.manifest.version,
      });
    } catch (e) {
      console.log('Ava - Error identifying user', e);
    }
    posthog.opt_in_capturing();

    const statusBarItemHtml = this.addStatusBarItem();
    this.statusBarItem = createRoot(statusBarItemHtml);

    this.app.workspace.onLayoutReady(async () => {
      // ignore on dev
      if (process.env.NODE_ENV !== 'development') {
        // if the user has enabled links in the past
        // we listen to note changes by default,
        // no need to load vault
        if (this.settings.token && this.settings.useLinks) {
          this.listenToNoteEvents();
        }
      }
      this.createImage = (req) =>
        createImage(req, this.settings.token, this.manifest.version);
      this.complete = (p, options) =>
        complete(p, this.settings.token, this.manifest.version, {
          ...options,
          stream: options.stream !== undefined ? options.stream : false,
        });
      this.search = (req) =>
        search(
          req,
          this.settings.token,
          this.settings.vaultId,
          this.manifest.version
        );
      this.clearIndex = () =>
        clearIndex(
          this.settings.token,
          this.settings.vaultId,
          this.manifest.version
        );

      this.addCommand({
        id: 'ava-add-prompt',
        name: 'Write Paragraph',
        editorCallback: (editor: Editor) => {
          posthog.capture('use-feature', { feature: 'write paragraph' });
          new Notice('🧙 Writing Paragraph', 2000);
          if (!this.settings.token) {
            new Notice('🧙 You need to login to use this feature', 2000);
            return;
          }

          const onSubmit = async (text: string) => {
            this.statusBarItem.render(<StatusBar status="loading" />);
            try {
              this.setStreamingSource(
                await createParagraph(
                  text,
                  this.settings.token,
                  this.manifest.version
                )
              );
              this.streamingSource.addEventListener(
                'message',
                function (e: any) {
                  const payload = JSON.parse(e.data);
                  console.log(payload);
                  const currentLine = editor.getCursor().line;
                  const lastChar = editor.getLine(currentLine).length;
                  editor.setCursor({ line: currentLine, ch: lastChar });
                  editor.replaceRange(
                    `${payload.choices[0].text}`,
                    editor.getCursor()
                  );
                }
              );
              this.streamingSource.addEventListener('error', onSSEError);
              this.streamingSource.stream();
              this.statusBarItem.render(<StatusBar status="success" />);
            } catch (e) {
              onGeneralError(e.message);
              new Notice(`️⛔️ AVA ${e}`, 4000);
              this.statusBarItem.render(<StatusBar status="error" />);
            }
          };

          new PromptModal(this.app, onSubmit).open();
        },
      });
      this.addCommand({
        id: 'ava-generate-image',
        name: 'Generate Image',
        editorCallback: async (editor: Editor) => {
          const selection = editor.getSelection();
          posthog.capture('use-feature', {
            feature: 'generate image',
            promptLength: selection.length,
          });

          if (!this.settings.token) {
            new Notice('🧙 You need to login to use this feature', 2000);
            return;
          }

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
              this.settings?.token,
              this.manifest.version
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
            new Notice(`️⛔️ AVA ${e}`, 4000);
            onError(e);
          }
        },
      });

      this.addCommand({
        id: 'ava-rewrite-prompt',
        name: 'Rewrite Selection',
        editorCallback: (editor: Editor) => {
          posthog.capture('use-feature', { feature: 'rewrite selection' });
          if (!this.settings.token) {
            new Notice('🧙 You need to login to use this feature', 2000);
            return;
          }
          if (editor.somethingSelected() === false) {
            new Notice('🧙 AVA - Select some text to rewrite and try again :)');
            return;
          }
          if (editor.getSelection().length > TEXT_CREATE_CHAR_LIMIT) {
            posthog.capture('too-long-selection', {
              length: editor.getSelection().length,
              action: 'rewrite',
            });
            new Notice(
              '🧙 AVA - Selection is too long, please select less than 5800 characters ~1200 words'
            );
            return;
          }

          this.displayWriteSidebar();

          store.getState().reset();

          const onSubmit = async (prompt: string) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const d: any = {
              feature: 'rewrite selection',
            };
            // only capture short prompt as it's more data privacy wise
            if (prompt.length < 100) d.prompt = prompt;
            posthog.capture('use-feature', d);
            store.setState({ loadingContent: true });
            this.statusBarItem.render(<StatusBar status="loading" />);
            const text = editor.getSelection();

            store.setState({ loadingContent: true });
            try {
              this.setStreamingSource(
                await rewrite(
                  text,
                  prompt,
                  this.settings.token,
                  this.manifest.version
                )
              );
              this.streamingSource.addEventListener('error', onSSEError);
              // go to the next line

              this.streamingSource.addEventListener(
                'message',
                function (e: any) {
                  // this is bad because it will triger react re-renders
                  // careful if you modify it, it's a bit harder to get the behavior right
                  store.setState({ loadingContent: true });
                  const payload = JSON.parse(e.data);
                  store.getState().setPrompt(`Rewrite to ${prompt}`);
                  store.getState().setEditorContext(editor);
                  store
                    .getState()
                    .appendContentToRewrite(payload.choices[0].text);
                  store.setState({ loadingContent: false });
                }
              );
              this.streamingSource.stream();
              this.statusBarItem.render(<StatusBar status="success" />);
            } catch (e) {
              console.error(e);
              store.setState({ loadingContent: false });
            }
          };

          new RewriteModal(this.app, onSubmit).open();
        },
      });

      this.addCommand({
        id: 'ava-search',
        name: 'Search',
        callback: async () => {
          posthog.capture('use-feature', { feature: 'search' });
          if (!this.settings.useLinks) {
            new Notice('🧙 Link - You need to enable links in settings', 3000);
            return;
          }
          if (!this.settings.token) {
            new Notice('Link - You need to login to use this feature');
            return;
          }
          new SearchModal(
            this.app,
            this.settings.token,
            this.settings.vaultId,
            this.manifest.version
          ).open();
        },
      });

      this.addCommand({
        id: 'ava-load-semantic',
        name: 'Load vault',
        callback: async () => {
          posthog.capture('ava-load-semantic');
          if (!this.settings.token) {
            new Notice('Link - You need to login to use this feature');
            return;
          }
          await this.indexWholeVault();
        },
      });
      this.addCommand({
        id: 'ava-generate-link',
        name: 'Generate Link',
        editorCallback: async (editor: Editor) => {
          if (!this.settings.useLinks) {
            new Notice('🧙 Link - You need to enable links in settings', 3000);
            return;
          }
          if (!this.settings.token) {
            new Notice('🧙 You need to login to use this feature', 2000);
            return;
          }
          new Notice('🧙 Link - Searching for related notes⏰');
          this.displayLinkSidebar();
          store.setState({ editorContext: editor, loadingEmbeds: true });
          this.statusBarItem.render(<StatusBar status="loading" />);

          const file = this.app.workspace.getActiveFile();
          const currentText = await this.app.vault.read(file);
          const tags = this.app.metadataCache.getFileCache(file).tags || [];
          const tagsArray = tags.map((tag) => tag.tag);
          const path = file.path;

          // we need to do this so we can fire /search inside of the sidebar later
          store.setState({
            currentFileContent: currentText,
            currentFilePath: path,
            currentFileTags: tagsArray,
          });

          const results = await this.link(currentText, tagsArray, path);
          if (results) {
            store.setState({ embeds: results });
          }
          store.setState({ loadingEmbeds: false });
          this.statusBarItem.render(<StatusBar status="success" />);
        },
      });

      this.addCommand({
        id: 'ava-complete',
        name: 'Complete Selection',
        editorCallback: async (editor: Editor) => {
          posthog.capture('use-feature', { feature: 'complete selection' });
          if (!this.settings.token) {
            new Notice('Link - You need to login to use this feature');
            return;
          }

          if (editor.somethingSelected() === false) {
            new Notice('🧙 AVA - Select some text to rewrite and try again :)');
            return;
          }
          if (editor.getSelection().length > TEXT_CREATE_CHAR_LIMIT) {
            new Notice(
              '🧙 AVA - Selection is too long, please select less than 5800 characters ~1200 words'
            );
            return;
          }
          new Notice(
            '🧙 AVA - Completing selection, this may take a few seconds'
          );
          this.displayWriteSidebar();

          this.statusBarItem.render(<StatusBar status="loading" />);
          const text = editor.getSelection();
          const lines = text.split('\n');
          // set cursor at the end of the selection
          editor.setCursor({
            line: editor.getCursor().line + lines.length - 1,
            ch: lines[lines.length - 1].length,
          });
          const source = await complete(
            text,
            this.settings.token,
            this.manifest.version,
            {
              stream: true,
            }
          );
          store.getState().reset();
          store.getState().appendContentToRewrite(text);

          // TODO: display information message
          // TODO: when the completion is null (i.e. when prompt end by . for example)
          source.addEventListener('message', function (e: any) {
            const payload = JSON.parse(e.data);
            store.getState().setEditorContext(editor);
            store.getState().appendContentToRewrite(payload.choices[0].text);
          });
          source.addEventListener('error', onSSEError);
          source.stream();
          this.statusBarItem.render(<StatusBar status="success" />);
        },
      });

      this.addCommand({
        id: 'ava-tags',
        name: 'Suggest tags',
        editorCallback: async (editor: Editor) => {
          posthog.capture('use-feature', { feature: 'suggest tags' });
          if (!this.settings.token) {
            new Notice('🧙 AVA Tags - You need to login to use this feature');
            return;
          }
          const text = editor.getValue();
          if (!text) {
            new Notice('🧙 AVA Tags - Open a note first');
            return;
          }

          if (text.length > TEXT_CREATE_CHAR_LIMIT) {
            new Notice(
              '🧙 AVA Tags - Currently only supports files less than 5800 characters ~1200 words'
            );
            return;
          }

          new Notice('🧙 AVA - Generating tags, this may take a few seconds');
          this.displayWriteSidebar();

          this.statusBarItem.render(<StatusBar status="loading" />);

          const source = await suggestTags(
            text,
            this.settings.token,
            this.manifest.version,
          );
          store.getState().reset();
          store.getState().appendContentToRewrite(`\n\n#`);
          source.addEventListener('message', function (e: any) {
            const payload = JSON.parse(e.data);
            store.getState().setEditorContext(editor);
            const t = payload.choices[0].text;
            store.getState().appendContentToRewrite(t);
          });
          source.addEventListener('error', onSSEError);
          source.stream();
          this.statusBarItem.render(<StatusBar status="success" />);
        },
      });

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

    // used to sync the store with the plugin settings / useful for react components
    store.setState({ settings: this.settings, version: this.manifest.version });
  }

  // eslint-disable-next-line require-jsdoc
  async saveSettings() {
    // used to have react update its state
    store.setState({ settings: this.settings });

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
