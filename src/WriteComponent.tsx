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
import { REWRITE_CHAR_LIMIT } from './utils';


export interface ButtonProps extends React.HTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  disabled?: boolean;
}

export const WriteComponent = () => {
  const state = React.useSyncExternalStore(store.subscribe, store.getState);
  const { register, handleSubmit, setValue } = useForm();
  const onSubmit = async (data: { content: string; alteration: string }) => {
    posthog.capture('use-feature', { feature: 'rewrite selection' });
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
      const p = `Rewrite ${data.alteration.trim()}\n###\n${data.content.trim()}\n###`;
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
          stop: ['###'],
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

      streamingSource.addEventListener(
        'message',
        function (e: any) {
          // this is bad because it will triger react re-renders
          // careful if you modify it, it's a bit harder to get the behavior right
          store.setState({ loadingContent: true });
          const payload = JSON.parse(e.data);
          store.getState().setPrompt(`Rewrite to ${prompt}`);
          // store.getState().setEditorContext(editor);
          store
            .getState()
            .appendContentToRewrite(payload.choices[0].text);
          store.setState({ loadingContent: false });
        }
      );
      streamingSource.stream();
      // this.statusBarItem.render(<StatusBar status="success" />);
    } catch (e) {
      console.error(e);
      store.setState({ loadingContent: false });
    }
  };
  const hideButtons = state.content === '';
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
      <h2>🧙 AVA Write</h2>
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="flex gap-3">
          <input
            type="text"
            className="w-full"
            defaultValue={state.prompt}
            {...register('alteration', { required: true })}
          />
          <button
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded inline-flex items-center"
            type="submit"
          >
            <svg
              className="h-4 w-4 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
            <span>Write</span>
          </button>
        </div>
      </form>

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

      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
      >{state.content}</ReactMarkdown>

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
