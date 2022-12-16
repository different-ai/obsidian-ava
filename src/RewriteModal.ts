import { App, Modal, Setting } from 'obsidian';

export class RewriteModal extends Modal {
  text: string;

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
    new Setting(form).setName('Rewrite text to').addText((text) => {
      text
        .setPlaceholder(
          'Remove all email addresses / Make it sound more like [paste text] / Make it more polite'
        )
        .onChange((value) => {
          this.text = value;
        });
      text.inputEl.style.minWidth = '100%';
    });

    // TextArea.inputEl.style.minHeight = '10rem';
    // TextArea.inputEl.style.width = '100%';

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
