import { ItemView, WorkspaceLeaf } from 'obsidian';
/* before */
import * as React from 'react';
import { createRoot, Root } from 'react-dom/client';
import { AppContext } from './context';
import { LinkComponent } from './LinkComponent';
import AvaPlugin from './main';

export const VIEW_TYPE_LINK = 'ava.link.sidebar';

export class LinkView extends ItemView {
  private readonly plugin: AvaPlugin;
  public root: Root;

  constructor(leaf: WorkspaceLeaf, plugin: AvaPlugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getDisplayText(): string {
    return 'Link Assistant';
  }

  getViewType(): string {
    return VIEW_TYPE_LINK;
  }
  getIcon(): string {
    return 'file-symlink';
  }

  async onOpen(): Promise<void> {
    const root = createRoot(this.containerEl.children[1]);
    root.render(
      <AppContext.Provider value={this.app}>
        <LinkComponent />
      </AppContext.Provider>
    );
    this.root = root;
  }
  async onClose() {
    this.root.unmount();
  }
}
