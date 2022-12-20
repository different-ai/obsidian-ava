import {
  ClipboardDocumentCheckIcon,
  ClipboardDocumentListIcon,
} from '@heroicons/react/24/outline';
import * as React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { PrimaryButton } from './Button';
import { useApp } from './hooks';
import { store } from './store';

export interface ButtonProps extends React.HTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  disabled?: boolean;
}

export const AvaComponent = () => {
  const app = useApp();
  const state = React.useSyncExternalStore(store.subscribe, store.getState);
  const [isCopied, setIsCopied] = React.useState(false);
  console.log(state);
  const hideButtons = state.content === '';
  console.log(app);

  const handleReplace = () => {
    state.editorContext.replaceSelection(state.content);
  };

  const handleCopy = () => {
    console.log('test');
    navigator.clipboard.writeText(state.content);
    console.log('after test');
    setIsCopied(true);
  };
  React.useEffect(() => {
    if (isCopied === false) return;
    setTimeout(() => {
      setIsCopied(false);
    }, 2000);
  }, [isCopied, setIsCopied]);

  return (
    <div className="select-text">
      <h1 className="text-2xl">Obsidian AI</h1>

      <h2 className="text-4xl font-bold leading-tight">
        {/* <span className="text-gray-700">“</span> */}
        <span className="text-gray-200">{state.prompt}</span>
        {/* <span className="text-gray-700">”</span> */}
      </h2>

      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {state.content ||
          'Nothing to show. Try cmd + p and type rewrite to see 🧙'}
      </ReactMarkdown>
      {hideButtons ? null : (
        <div className="flex gap-3">
          <PrimaryButton onClick={handleCopy}>
            {isCopied && <ClipboardDocumentCheckIcon height={24} />}
            {isCopied && <span>Copied!</span>}
            {!isCopied && <ClipboardDocumentListIcon height={24} />}
            {!isCopied && <span>Copy</span>}
          </PrimaryButton>
          <PrimaryButton onClick={handleReplace}>
            Replace Selection
          </PrimaryButton>
        </div>
      )}
    </div>
  );
};
