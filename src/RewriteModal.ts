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

  search = (evt: Event) => {
    evt.preventDefault();
    this.onSubmit(this.text);
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
    // add a few suggestions
    suggestions.forEach((suggestion) => {
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
