/* eslint-disable require-jsdoc */
import { ThemeProvider } from '@mui/material';
import {
  App,
  Editor,
  ItemView,
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
import { createGPT3Links, createWikipediaLinks } from './utils';

interface StableDiffusion {
  generateAsync: (opts: DraftStabilityOptions & RequiredStabilityOptions) => {
    images: ImageData[];
    res: ResponseData;
  };
}

// eslint-disable-next-line require-jsdoc
export default class AvaPlugin extends Plugin {
  settings: AvaSettings;
  statusBarItem: Root;
  openai: OpenAIApi;
  stableDiffusion: StableDiffusion;

  // eslint-disable-next-line require-jsdoc
  async onload() {
    await this.loadSettings();
    const statusBarItemHtml = this.addStatusBarItem();
    this.statusBarItem = createRoot(statusBarItemHtml);

    this.app.workspace.onLayoutReady(async () => {
      runSemanticApi(this.app);
      const suggest = new AvaSuggest(this.app, this, 1000, 3);
      this.openai = suggest.openai;

      this.stableDiffusion = {
        generateAsync: generateAsync,
      };
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
        id: 'get-related-topics',
        name: 'Get Related Topics',
        editorCallback: async (editor: Editor, view: ItemView) => {
          new Notice('Generating Related Topics ⏰');
          this.statusBarItem.render(<StatusBar status="loading" />);
          const completion = await createGPT3Links(
            'test',
            editor.getSelection(),
            '',
            this.app
          );
          console.log(editor.getDoc());
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
          new Notice('Generating Wikipedia Links ⏰');
          this.statusBarItem.render(<StatusBar status="loading" />);
          const completion = await createWikipediaLinks(
            'test',
            editor.getSelection(),
            this.app
          );

          console.log(editor.getDoc());
          const lastLine = editor.lastLine();
          const lastChar = editor.getLine(editor.lastLine()).length;

          editor.replaceRange(`\n\n ## Related Topics: \n - ${completion}`, {
            line: lastLine,
            ch: lastChar,
          });
          this.statusBarItem.render(<StatusBar status="disabled" />);

          new Notice('Check out the new links at the bottom of the page🔥');
        },
      });
      this.addCommand({
        id: 'ava-generate-image',
        name: 'Generate an image based on selected text',
        editorCallback: async (editor: Editor) => {
          if (!this.settings.stableDiffusion.key) {
            new Notice(
              'You need to set a key for Stable Diffusion in the settings',
              3000
            );
            return;
          }
          const selection = editor.getSelection();
          if (!selection) {
            new Notice(
              'You need to select some text to generate an image',
              3000
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

export const VIEW_TYPE_AVA = 'ava';

export class AvaSidebarView extends ItemView {
  private readonly plugin: AvaPlugin;

  constructor(leaf: WorkspaceLeaf, plugin: AvaPlugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getDisplayText(): string {
    return 'Ava Recommendations';
  }

  getViewType(): string {
    return VIEW_TYPE_AVA;
  }

  getIcon(): string {
    return 'clock';
  }

  async onOpen(): Promise<void> {
    const root = createRoot(this.containerEl);

    root.render(<AvaSidebar plugin={this.plugin} />);
  }
}
