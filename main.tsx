import { ThemeProvider } from "@mui/material";
import { App, Plugin, PluginSettingTab } from "obsidian";
import * as React from "react";
import { createRoot } from "react-dom/client";
import { AvaSettings, CustomSettings, DEFAULT_SETTINGS } from "./Settings";
import { AvaSuggest } from "./suggest";
import { theme } from "./theme";


export default class AvaPlugin extends Plugin {
	settings: AvaSettings;
	lastTyping: number;

	async onload() {
		await this.loadSettings();
		this.registerEditorSuggest(new AvaSuggest(this.app, this, 1000, 3));

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
