import { Editor } from 'obsidian';
import create from 'zustand/vanilla';

type State = {
  content: string;
  editorContext: Editor;
  appendContentToRewrite: (content: string) => void;
  setEditorContext: (editor: Editor) => void;
  prompt: string;
  reset: () => void;
  setPrompt: (prompt: string) => void;
};

export const store = create<State>((set) => ({
  content: '',
  appendContentToRewrite: (content: string) => {
    console.log(content);
    set((state) => ({ content: state.content + content }));
  },
  editorContext: null,
  setEditorContext: (editor: Editor) => {
    set(() => ({ editorContext: editor }));
  },
  setPrompt: (prompt: string) => {
    set(() => ({ prompt: prompt }));
  },
  prompt: '',
  reset: () => {
    set(() => ({ content: '', prompt: '' }));
  },
}));
