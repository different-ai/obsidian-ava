import { Editor } from 'obsidian';
import create from 'zustand/vanilla';
import { AvaSettings } from './LegacySettings';

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
  settings: AvaSettings;
};

export const store = create<State>((set) => ({
  settings: {
    debug: false,
    token: '',
    vaultId: '',
  },
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
  prompt: '',
  setPrompt: (prompt: string) => {
    set(() => ({ prompt: prompt }));
  },
  reset: () => {
    set(() => ({ content: '', prompt: '' }));
  },
}));
