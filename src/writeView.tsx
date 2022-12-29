import { ItemView, WorkspaceLeaf } from 'obsidian';
import * as React from 'react';
import { createRoot, Root } from 'react-dom/client';
import { AppContext } from './context';
import AvaPlugin from './main';
import { WriteComponent } from './WriteComponent';
export const VIEW_TYPE_WRITE = 'ava.write.sidebar';

export class WriteView extends ItemView {
  private readonly plugin: AvaPlugin;
  public root: Root;

  constructor(leaf: WorkspaceLeaf, plugin: AvaPlugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getDisplayText(): string {
    return 'Write Assistant';
  }

  getViewType(): string {
    return VIEW_TYPE_WRITE;
  }
  getIcon(): string {
    return 'pencil';
  }

  async onOpen(): Promise<void> {
    const root = createRoot(this.containerEl.children[1]);
    root.render(
      <AppContext.Provider value={this.app}>
        <WriteComponent />
      </AppContext.Provider>
    );
    this.root = root;
  }
  async onClose() {
    this.root.unmount();
  }
}
