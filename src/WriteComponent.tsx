import { SSE } from 'lib/sse';
import { Notice } from 'obsidian';
import posthog from 'posthog-js';
import * as React from 'react';
import { useForm } from 'react-hook-form';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { API_HOST, buildHeaders } from './constants';
import { CopyToClipboardButton } from './CopyToClipboard';
import { InsertButton } from './InsertButton';
import { Spinner } from './StatusBar';
import { store } from './store';
import { buildRewritePrompt, REWRITE_CHAR_LIMIT } from './utils';

export interface ButtonProps extends React.HTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  disabled?: boolean;
}

export const WriteComponent = () => {
  const state = React.useSyncExternalStore(store.subscribe, store.getState);
  const { register, handleSubmit, setValue } = useForm();
  const onSubmit = async (data: { content: string; alteration: string }) => {
    if (!state.settings.token) {
      new Notice('🧙 You need to login to use this feature', 2000);
      return;
    }
    if (!data.content) {
      new Notice('🧙 AVA - Write something first', 2000);
      return;
    }
    if (data.content.length > REWRITE_CHAR_LIMIT) {
      posthog.capture('too-long-selection', {
        length: data.content.length,
        action: 'rewrite',
      });
      new Notice(
        '🧙 AVA - Text is too long, please reduce to less than 5800 characters ~1200 words'
      );
      return;
    }

    store.getState().reset();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const d: any = {
      feature: 'rewrite selection',
    };
    // only capture short prompt as it's more data privacy wise
    if (prompt.length < 100) d.prompt = prompt;
    posthog.capture('use-feature', d);
    store.setState({ loadingContent: true });

    try {
      const p = buildRewritePrompt(data.content, data.alteration);
      console.log('prompt', p);
      const streamingSource = new SSE(`${API_HOST}/v1/text/create`, {
        headers: buildHeaders(state.settings.token, state.version),
        method: 'POST',
        payload: JSON.stringify({
          prompt: p,
          max_tokens: 2000,
          stream: true,
          temperature: 0.7,
          model: 'text-davinci-003',
        }),
      });
      const onSSEError = (e: any) => {
        let m = 'Internal Server Error';
        try {
          m = JSON.parse(e.data).message;
        } catch (e) {
          console.error(e);
        }
        new Notice(`️⛔️ AVA ${m}`, 4000);
        store.setState({ loadingContent: false });
      };
      streamingSource.addEventListener('error', onSSEError);

      streamingSource.addEventListener('message', function (e: any) {
        // this is bad because it will triger react re-renders
        // careful if you modify it, it's a bit harder to get the behavior right
        store.setState({ loadingContent: true });
        const payload = JSON.parse(e.data);
        // TODO: do we need this?
        // store.getState().setPrompt(`Rewrite to ${prompt}`);
        // store.getState().setEditorContext(editor);
        store.getState().appendContentToRewrite(payload.choices[0].text);
        store.setState({ loadingContent: false });
      });
      streamingSource.stream();
      // this.statusBarItem.render(<StatusBar status="success" />);
    } catch (e) {
      console.error(e);
      store.setState({ loadingContent: false });
    }
  };
  const disableButtons = state.content === '';
  React.useEffect(() => {
    setValue('content', state.content);
  }, [state.content, setValue]);
  const trackCopy = () => {
    posthog.capture('copy-write');
  };
  const trackInsert = () => {
    posthog.capture('insert-write');
  };

  return (
    <div className="select-text">
      <div className="text-xl font-semibold ">🧙 AVA Write</div>
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col mt-3">
            <label htmlFor="" className="block text-sm font-medium">
              Change text to
            </label>
            <div className="text-xs text-[var(--text-faint)] mb-1">
              This will rewrite the text below
            </div>
            <input
              type="text"
              className="block rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm w-full"
              defaultValue={state.prompt}
              {...register('alteration', { required: true })}
            />
            <button
              className="font-bold py-2 px-4 rounded inline-flex items-center mod-cta mt-1"
              type="submit"
            >
              <span>Rewrite</span>
            </button>
          </div>
        </div>
      </form>
      <div className="flex gap-3 my-3">
        <CopyToClipboardButton
          disabled={disableButtons}
          text={state.content}
          extraOnClick={trackCopy}
        />
        <InsertButton
          disabled={disableButtons}
          editorContext={state.editorContext}
          text={state.content}
          extraOnClick={trackInsert}
        />
      </div>

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
    </div>
  );
};
