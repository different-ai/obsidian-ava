import { Editor } from 'obsidian';
import create from 'zustand/vanilla';
import { AvaSettings } from './LegacySettings';
import { ISimilarFile, LinksStatus } from './utils';

type State = {
  linksStatus: LinksStatus;
  setLinksStatus: (status: LinksStatus) => void;
  embeds: ISimilarFile[];
  setEmbeds: (embeds: ISimilarFile[]) => void;
  setEmbedsLoading: (loading: boolean) => void;
  content: string;
  editorContext: Editor;
  appendContentToRewrite: (content: string) => void;
  setEditorContext: (editor: Editor) => void;
  prompt: string;
  reset: () => void;
  setPrompt: (prompt: string) => void;
  settings: AvaSettings;
  loadingEmbeds: boolean;
  loadingContent: boolean;
  currentFilePath: string;
  currentFileContent: string;
  currentFileTags: string[];
  version: string;
};

export const store = create<State>((set) => ({
  version: '',
  settings: {
    useLinks: false,
    debug: false,
    token: '',
    vaultId: '',
    userId: '',
    experimental: false,
    ignoredFolders: [],
  },
  // used to dispaly loading state in the sidebar
  loadingEmbeds: false,
  // used to display loading state in the
  linksStatus: 'disabled',
  setLinksStatus: (status: LinksStatus) => {
    set(() => ({ linksStatus: status }));
  },
  // used to fire /search from react component
  currentFilePath: '',
  currentFileContent: '',
  currentFileTags: [],

  // list of embeds to display in the sidebar
  embeds: [],
  setEmbeds: (embeds: ISimilarFile[]) => {
    set(() => ({ embeds: embeds }));
  },
  setEmbedsLoading: (loading: boolean) => {
    set(() => ({ loadingEmbeds: loading }));
  },
  // used for both the rewrite and complete paragraph
  loadingContent: false,
  content: '',
  appendContentToRewrite: (content: string) => {
    console.log(content);
    set((state) => ({ content: state.content + content }));
  },
  prompt: '',
  setPrompt: (prompt: string) => {
    set(() => ({ prompt: prompt }));
  },

  // used in all the sidebars to be able to modify the editor
  editorContext: null,
  setEditorContext: (editor: Editor) => {
    set(() => ({ editorContext: editor }));
  },

  reset: () => {
    set(() => ({ content: '', prompt: '' }));
  },
}));
