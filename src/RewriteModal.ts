import { App, Modal, Setting, TextComponent } from 'obsidian';

const suggestions = [
  'keep email addresses seperated by a comma',
  'explain it like I am 5',
  'translate to german',
  'use the metric system',
  'format this as a markdown table',
  'fix grammar',
];

export class RewriteModal extends Modal {
  text: string;
  textfield: TextComponent;

  onSubmit: (text: string) => void;

  constructor(app: App, onSubmit: (text: string) => void) {
    super(app);
    this.onSubmit = onSubmit;
  }

  private getLocalSuggestions() {
    return JSON.parse(window.localStorage.getItem('ava-rewrite-text')) as string[] || [];
  }

  search = (evt: Event) => {
    evt.preventDefault();
    this.onSubmit(this.text);
    // remove this text from local storage and add it to the top of the suggestions
    // window.localStorage 'ava-rewrite-text' is a list of 3 texts
    // we maintain to 3 items max with the order being most recent first
    const storedTexts = this.getLocalSuggestions();
    window.localStorage.setItem('ava-rewrite-text', JSON.stringify([
      this.text,
      // minus the current text
      ...storedTexts.filter((text) => text !== this.text),
    ].slice(0, 3)));
    this.close();
  };

  onOpen() {
    const { contentEl } = this;

    contentEl.createEl('h1', { text: 'Rewrite Assist' });
    const form = contentEl.createEl('form');
    form.onsubmit = this.search;

    new Setting(form).setName('Rewrite text').addText((textfield) => {
      textfield
        .setPlaceholder(
          'remove all email addresses / make it sound more like [paste text] / make it more polite'
        )
        .setValue(this.text)
        .onChange((value) => {
          this.text = value;
        });
      textfield.inputEl.style.minWidth = '100%';
      this.textfield = textfield;
    });

    // Display some suggestions
    contentEl.createEl('h3', { text: 'Suggestions' });
    const suggestionContainer = contentEl.createEl('div', {
      attr: { style: 'display: flex; flex-wrap: wrap; gap: 0.5rem;' },
    });
    const localSuggestions = this.getLocalSuggestions();
    const allSuggestions = new Set([...localSuggestions, ...suggestions]);
    // TODO: add history icon for local suggestions
    // add a few suggestions
    allSuggestions.forEach((suggestion) => {
      suggestionContainer.createEl('span', {
        text: suggestion,
        cls: 'setting-hotkey ',
        attr: { style: 'width: min-content; padding: 0.5rem; cursor: pointer' },
      }).onclick = () => {
        this.text = suggestion;
        this.textfield.setValue(suggestion);
        this.search(new Event('submit'));
      };
    });

    new Setting(form).addButton((btn) => {
      btn.buttonEl.type = 'submit';

      return btn.setButtonText('Rewrite Text').setCta().onClick(this.search);
    });
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}
