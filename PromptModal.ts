import { App, Modal, Setting } from 'obsidian';

export class PromptModal extends Modal {
  text: string;

  onSubmit: (text: string) => void;

  constructor(app: App, onSubmit: (text: string) => void) {
    super(app);
    this.onSubmit = onSubmit;
  }

  search = (evt: Event) => {
    evt.preventDefault();
    this.close();
    this.onSubmit(this.text);
  };

  onOpen() {
    const { contentEl } = this;

    contentEl.createEl('h1', { text: 'Obsidian AI - Paragraph Assist' });
    const form = contentEl.createEl('form');
    form.onsubmit = this.search;
    new Setting(form).setName('Write a paragraph about').addText((text) =>
      text.setValue(this.text).onChange((value) => {
        this.text = value;
      })
    );

    new Setting(form).addButton(
      (btn) =>
        (btn
          .setButtonText('Write paragraph')
          .setCta()
          .onClick(this.search).buttonEl.type = 'submit')
    );
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}
