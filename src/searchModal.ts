import { App, Notice, SuggestModal } from 'obsidian';
import { Embed } from './store';
import { search } from './utils';

export class SearchModal extends SuggestModal<Embed> {
  private token: string;
  private vaultId: string;
  private version: string;

  constructor(app: App, token: string, vaultId: string, version: string) {
    super(app);
    this.token = token;
    this.vaultId = vaultId;
    this.version = version;
  }
  private results: Embed[];

  // Returns all available suggestions.
  // need to add a debounce here
  async getSuggestions(query: string): Promise<Embed[]> {
    // would be nice to start with text-based search and then switch to semantic search above a certain length
    if (query.length < 2) return;

    const res = await search({query}, this.token, this.vaultId, this.version);
    console.log('modal', res);

    return res.similarities.map((similarity) => {
      return { path: similarity.notePath, similarity: similarity.score };
    });
  }

  // Renders each suggestion item.
  renderSuggestion(embed: Embed, el: HTMLElement) {
    el.createEl('div', { text: embed.path.split('/').pop().split('.md')[0] });
    // el.createEl('small', { text: book.author });
  }

  // Perform action on the selected suggestion.
  onChooseSuggestion(embed: Embed, evt: MouseEvent | KeyboardEvent) {
    new Notice(`Selected ${embed.path.split('/').pop().split('.md')[0]}`);
    this.app.workspace.openLinkText(embed.path, '');
  }
}
