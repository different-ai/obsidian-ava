import { ItemView, WorkspaceLeaf } from 'obsidian';
import * as React from 'react';
import { createRoot, Root } from 'react-dom/client';
import { AppContext } from './context';
import AvaPlugin from './main';
import { PeopleComponent } from './PeopleComponent';
export const VIEW_TYPE_PEOPLE = 'ava.people.sidebar';

export class PeopleView extends ItemView {
  private readonly plugin: AvaPlugin;
  private readonly onClick: (exploration: string) => void;
  public root: Root;

  constructor(leaf: WorkspaceLeaf, plugin: AvaPlugin, onClick: (exploration: string) => void) {
    super(leaf);
    this.plugin = plugin;
    this.onClick = onClick;
  }

  getDisplayText(): string {
    return 'People Assistant';
  }

  getViewType(): string {
    return VIEW_TYPE_PEOPLE;
  }
  getIcon(): string {
    return 'heart';
  }

  async onOpen(): Promise<void> {
    const root = createRoot(this.containerEl.children[1]);
    root.render(
      <AppContext.Provider value={this.app}>
        <PeopleComponent onClick={this.onClick} />
      </AppContext.Provider>
    );
    this.root = root;
  }
  async onClose() {
    this.root.unmount();
  }
}