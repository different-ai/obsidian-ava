import { Editor } from 'obsidian';
import create from 'zustand/vanilla';

export type Embed = {
  path: string;
  similarity: number;
};

//     return { path: similarity.note_path, similarity: similarity.score };
type State = {
  embeds: Embed[];
  content: string;
  editorContext: Editor;
  appendContentToRewrite: (content: string) => void;
  setEditorContext: (editor: Editor) => void;
  prompt: string;
  reset: () => void;
  setPrompt: (prompt: string) => void;
};

export const store = create<State>((set) => ({
  embeds: [],
  setEmbeds: (embeds: { path: string; similarity: number }[]) => {
    set(() => ({ embeds: embeds }));
  },
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
