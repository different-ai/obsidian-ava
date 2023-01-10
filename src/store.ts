import { Editor } from 'obsidian';
import create from 'zustand/vanilla';
import { AvaSettings } from './LegacySettings';
import { LinksStatus } from './utils';

export type Embed = {
  path: string;
  similarity: number;
};

type State = {
  linksStatus: LinksStatus;
  setLinksStatus: (status: LinksStatus) => void;
  embeds: Embed[];
  content: string;
  editorContext: Editor;
  appendContentToRewrite: (content: string) => void;
  setEditorContext: (editor: Editor) => void;
  prompt: string;
  reset: () => void;
  setPrompt: (prompt: string) => void;
  settings: AvaSettings;
  loadingEmbeds: boolean;
};

export const store = create<State>((set) => ({
  settings: {
    useLinks: false,
    debug: false,
    token: '',
    vaultId: '',
    userId: '',
  },
  loadingEmbeds: false,
  linksStatus: 'disabled',
  setLinksStatus: (status: LinksStatus) => {
    set(() => ({ linksStatus: status }));
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
