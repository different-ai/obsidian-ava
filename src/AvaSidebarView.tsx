import { ItemView, WorkspaceLeaf } from 'obsidian';
import * as React from 'react';
import { createRoot, Root } from 'react-dom/client';
import { AvaComponent } from './AvaComponent';
import { AppContext } from './context';
import AvaPlugin, { VIEW_TYPE_AVA } from './main';

export class AvaSidebarView extends ItemView {
  private readonly plugin: AvaPlugin;
  public root: Root;

  constructor(leaf: WorkspaceLeaf, plugin: AvaPlugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getDisplayText(): string {
    return 'Rewrite';
  }

  getViewType(): string {
    return VIEW_TYPE_AVA;
  }
  getIcon(): string {
    return 'clock';
  }

  async onOpen(): Promise<void> {
    const root = createRoot(this.containerEl.children[1]);
    root.render(
      <AppContext.Provider value={this.app}>
        <AvaComponent />
      </AppContext.Provider>
    );
    this.root = root;
  }
  async onClose() {
    this.root.unmount();
  }
}
