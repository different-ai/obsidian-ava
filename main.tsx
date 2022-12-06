/* eslint-disable require-jsdoc */
import { ThemeProvider } from '@mui/material';
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
import { theme } from './theme';
import {
  createGPT3Links,
  createSemanticLinks,
  createWikipediaLinks,
  downloadArtifacts,
} from './utils';

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
      // runSemanticApi(this.app);
      const suggest = new AvaSuggest(this.app, this, 1000, 3);
      this.openai = suggest.openai;

      this.stableDiffusion = {
        // @ts-ignore
        generateAsync: generateAsync,
      };

      this.addCommand({
        id: 'ava-test-download',
        name: 'Test Download',
        callback: async () => {
          downloadArtifacts(this.app);
        },
      });
      this.addCommand({
        id: 'ava-restart-semantic-api',
        name: 'Restart semantic search API',
        callback: async () => {
          new Notice('Restarting semantic search API');
          await killAllApiInstances();
          new Notice('Killed all semantic search API instances');
          runSemanticApi(this.app);
          new Notice('Semantic search API restarted');
        },
      });
      // This adds a simple command that can be triggered anywhere
      this.addCommand({
        id: 'ava-autocompletion-enable',
        name: 'Disable/enable automatic completion',
        callback: () => {
          suggest.setAutomaticSuggestion(!this.settings.openai.automatic);
        },
      });
      this.addCommand({
        id: 'semantic-related-topics',
        name: 'Add Related Topics (best)',
        editorCallback: async (editor: Editor, view: ItemView) => {
          const title = this.app.workspace.getActiveFile()?.basename;
          new Notice('Generating Related Topics ⏰');
          this.statusBarItem.render(<StatusBar status="loading" />);
          const completion = await createSemanticLinks(
            title,
            editor.getSelection(),
            ['']
          );
          const lastLine = editor.lastLine();
          const lastChar = editor.getLine(editor.lastLine()).length;

          editor.replaceRange(`\n\nSimilar topic links:\n\n- [[${completion}`, {
            line: lastLine,
            ch: lastChar,
          });
          this.statusBarItem.render(<StatusBar status="disabled" />);

          new Notice('Topics added at bottom of the page🔥');
        },
      });
      this.addCommand({
        id: 'gpt3-related-topics',
        name: 'Add Related Topics (gpt3)',
        editorCallback: async (editor: Editor, view: ItemView) => {
          const title = this.app.workspace.getActiveFile()?.basename;
          new Notice('Generating Related Topics ⏰');
          this.statusBarItem.render(<StatusBar status="loading" />);
          const completion = await createGPT3Links(
            title,
            editor.getSelection(),
            [''],
            this
          );
          const lastLine = editor.lastLine();
          const lastChar = editor.getLine(editor.lastLine()).length;

          editor.replaceRange(`\n\nSimilar topic links:\n\n- [[${completion}`, {
            line: lastLine,
            ch: lastChar,
          });
          this.statusBarItem.render(<StatusBar status="disabled" />);

          new Notice('Topics added at bottom of the page🔥');
        },
      });
      this.addCommand({
        id: 'get-wikipedia-suggestions',
        name: 'Get Wikipedia Suggestions',
        editorCallback: async (editor: Editor, view: ItemView) => {
          const title = this.app.workspace.getActiveFile()?.basename;

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
          this.sidebar.updateContent(completion);
          this.app.workspace.revealLeaf(this.sidebar.leaf);

          this.statusBarItem.render(<StatusBar status="disabled" />);

          new Notice('Generated Wikipedia Links check out your sidebar🔥');
        },
      });
      this.addCommand({
        id: 'ava-generate-image',
        name: 'Generate an image based on selected text',
        editorCallback: async (editor: Editor) => {
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
    root.render(
      <ThemeProvider theme={theme}>
        <CustomSettings plugin={this.plugin} />
      </ThemeProvider>
    );
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

  async updateContent(content: string): Promise<void> {
    const linkified = linkifyHtml(content);
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
