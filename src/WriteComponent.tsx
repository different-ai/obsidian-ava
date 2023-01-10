import posthog from 'posthog-js';
import * as React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { CopyToClipboardButton } from './CopyToClipboard';
import { InsertButton } from './InsertButton';
import { Spinner } from './StatusBar';
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
      <h2>🧙 AVA Write</h2>
      <blockquote className="italic font-semibold ">
        <p>{state.prompt}</p>
      </blockquote>
      <hr className="my-2" />
      {state.loadingContent && (
        <div className="flex gap-3">
          <div>Casting a spell...</div>
          <Spinner className="h-4 w-4" />
        </div>
      )}

      {!state.loadingContent && state.content === '' && (
        <div className="flex justify-center items-center flex-col gap-3 h-full">
          <div>Nothing to show. Try cmd + p and type rewrite to see 🧙</div>
        </div>
      )}

      <ReactMarkdown remarkPlugins={[remarkGfm]}>{state.content}</ReactMarkdown>
      {hideButtons ? null : (
        <div className="flex gap-3">
          <CopyToClipboardButton
            text={state.content}
            extraOnClick={trackCopy}
          />
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
