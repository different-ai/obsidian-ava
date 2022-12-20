import create from 'zustand/vanilla';

type State = {
  contentToRewrite: string;
  appendContentToRewrite: (content: string) => void;
};

export const store = create<State>((set) => ({
  contentToRewrite: '',
  appendContentToRewrite: (content: string) => {
    set((state) => ({ contentToRewrite: state.contentToRewrite + content }));
  },
}));
