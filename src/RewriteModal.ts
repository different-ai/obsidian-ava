import { App, Modal, Setting, TextComponent } from 'obsidian';

const suggestions = [
  'Keep email addresses seperated by a comma',
  'And explain it like I am 5',
  'To translate to german',
  'To use the metric system',
  'Format this as a markdown table',
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
          'Remove all email addresses / Make it sound more like [paste text] / Make it more polite'
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
