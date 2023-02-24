import { App, Modal, Setting } from 'obsidian';

interface Titles {
  heading: string;
  subheading: string;
  button: string;
}
const defaultTitles: Titles = {
  heading: 'Write a paragraph about',
  subheading: 'Write a paragraph about',
  button: 'Write paragraph',
};
export class PromptModal extends Modal {
  text: string;
  titles: Titles;

  onSubmit: (text: string) => void;

  constructor(app: App, onSubmit: (text: string) => void, titles: Titles = defaultTitles) {
    super(app);
    this.onSubmit = onSubmit;
    this.titles = titles;
  }

  search = (evt: Event) => {
    evt.preventDefault();
    this.onSubmit(this.text);
    this.close();
  };

  onOpen() {
    const { contentEl } = this;

    contentEl.createEl('h1', { text: this.titles.heading });
    const form = contentEl.createEl('form');
    form.onsubmit = this.search;
    new Setting(form).setName(this.titles.subheading).addText((text) =>
      text.setValue(this.text).onChange((value) => {
        this.text = value;
      })
    );

    new Setting(form).addButton((btn) => {
      btn.buttonEl.type = 'submit';

      return btn.setButtonText(this.titles.button).setCta().onClick(this.search);
    });
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}
