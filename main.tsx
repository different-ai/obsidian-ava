import {ThemeProvider} from "@mui/material";
import {App, Notice, Plugin, PluginSettingTab, Editor} from "obsidian";
import * as React from "react";
import {createRoot, Root} from "react-dom/client";
import {generateAsync} from "stableDiffusion";
import {AvaSettings, CustomSettings, DEFAULT_SETTINGS} from "./Settings";
import {AvaSuggest, StatusBar} from "./suggest";
import {theme} from "./theme";


// eslint-disable-next-line require-jsdoc
export default class AvaPlugin extends Plugin {
  settings: AvaSettings;
  statusBarItem: Root;

  async onload() {
    await this.loadSettings();
    const statusBarItemHtml = this.addStatusBarItem();
    this.statusBarItem = createRoot(statusBarItemHtml);

    const suggest = new AvaSuggest(this.app, this, 1000, 3);
    this.openai = suggest.openai;
    this.stableDiffusion = {
      generateAsync : generateAsync,
    };
    // This adds a simple command that can be triggered anywhere
    this.addCommand({
      id: "ava-autocompletion-enable",
      name: "Disable/enable automatic completion",
      hotkeys: [{modifiers: ["Shift"], key: "tab"}],
      callback: () => {
        suggest.setAutomaticSuggestion(!this.settings.openai.automatic);
      },
    });
	  this.addCommand({
      id: "ava-generate-image",
      name: "Generate an image based on selected text",
      editorCallback: async (editor: Editor) => {
		if (!this.settings.stableDiffusion.key) {
			new Notice("You need to set a key for Stable Diffusion in the settings", 3000);
			return;
		}
		if (!window.getSelection().toString()) return;
        
		const outDir = (this.app.vault.adapter as any).basePath + "/" + this.app.workspace.getActiveFile().parent.path;
		this.statusBarItem.render(
			<StatusBar
				status="loading"
			/>
		);
		// this.app.vault.createFolder(outDir);
		// @ts-ignore
		try {
			const {res, images} = await generateAsync({
				prompt: window.getSelection().toString(),
				apiKey: this.settings.stableDiffusion.key,
				outDir: outDir,
				debug: false,
				samples: 1,
			});
			// append image below
			editor.replaceSelection(
				`${window.getSelection().toString()}\n\n![[${images[0].filePath.split("/").pop()}]]\n\n`
			);
			
			this.statusBarItem.render(
				<StatusBar
				status="success"
				statusMessage="Completion successful"
				/>
			);
		} catch (e) {
			this.statusBarItem.render(
				<StatusBar
				  status="error"
				  statusMessage={"Error while generating image " + e}
				/>
			);
		}
        
      },
    });
    this.registerEditorSuggest(suggest);

    // This adds a settings tab so the user can configure various aspects of the plugin
    this.addSettingTab(new AvaSettingTab(this.app, this));
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}


class AvaSettingTab extends PluginSettingTab {
  plugin: AvaPlugin;
  constructor(app: App, plugin: AvaPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const root = createRoot(this.containerEl);
    root.render(
        <ThemeProvider theme={theme}>
          <CustomSettings plugin={this.plugin} />
        </ThemeProvider>
    );
  }
}
