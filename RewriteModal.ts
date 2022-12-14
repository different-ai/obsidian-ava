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

    contentEl.createEl('h1', { text: 'Obsidian AI - Rewrite Assist' });
    const form = contentEl.createEl('form');
    form.onsubmit = this.search;
    new Setting(form)
      .setName('Make this text sound more like')
      .addText((text) =>
        text.setValue(this.text).onChange((value) => {
          this.text = value;
        })
      );

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
