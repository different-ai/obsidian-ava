import posthog from 'posthog-js';
import * as React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { CopyToClipboardButton } from './CopyToClipboard';
import { InsertButton } from './InsertButton';
import { store } from './store';

export interface ButtonProps extends React.HTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  disabled?: boolean;
}

export const WriteComponent = () => {
  const state = React.useSyncExternalStore(store.subscribe, store.getState);
  const hideButtons = state.content === '';

  const trackCopy = () => {
    posthog.capture('copy-write');
  };
  const trackInsert = () => {
    posthog.capture('insert-write');
  };

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
          <CopyToClipboardButton text={state.content} extraOnClick={trackCopy} />
          <InsertButton
            editorContext={state.editorContext}
            text={state.content}
            extraOnClick={trackInsert}
          />
        </div>
      )}
    </div>
  );
};
