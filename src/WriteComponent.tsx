import { Notice } from 'obsidian';
import posthog from 'posthog-js';
import * as React from 'react';
import { useForm } from 'react-hook-form';
import { CopyToClipboardButton } from './CopyToClipboard';
import { InsertButton } from './InsertButton';
import { Spinner } from './StatusBar';
import { store } from './store';
import { Label, TextArea } from './TextArea';
import { buildRewritePrompt, REWRITE_CHAR_LIMIT } from './utils';

export interface ButtonProps extends React.HTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  disabled?: boolean;
}
export const WriteComponent = () => {
  const state = React.useSyncExternalStore(store.subscribe, store.getState);
  const { register, handleSubmit, setValue } = useForm();
  const onSubmit = async (data: { content: string; alteration: string }) => {
    const { content, alteration } = data;
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
      const p = buildRewritePrompt(content, alteration);
      console.log(p);
      const response = await fetch(
        'https://use-vercel-gpt-stream.vercel.app/api/generate',
        {
          method: 'POST',
          headers: {},
          mode: 'cors',
          body: JSON.stringify({
            prompt: p,
            frequency_penalty: 0,
            max_tokens: 2000,
            model: 'text-davinci-003',
            presence_penalty: 0,
            temperature: 0.7,
            top_p: 1,
          }),
        }
      );
      console.log('Edge function returned.');

      if (!response.ok) {
        throw new Error(response.statusText);
      }

      // This data is a ReadableStream
      const data = response.body;
      if (!data) {
        return;
      }

      const reader = data.getReader();
      const decoder = new TextDecoder();
      let done = false;

      while (!done) {
        // get date time for control flow

        const slowDownValue = 80;
        const start = Date.now();

        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        const chunkValue = decoder.decode(value);
        console.log(chunkValue);
        store.setState((state) => ({
          content: state.content + chunkValue,
        }));
        const timeTaken = Date.now() - start;
        // if it's less than 100ms, calculate time between 100ms and 100ms - timeTaken
        if (timeTaken < slowDownValue) {
          console.log('before wait');
          await sleep(slowDownValue - timeTaken);
          console.log('after wait');
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
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

  const handleOnChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    store.getState().replaceContentToRewrite(e.target.value);
  };

  return (
    <div className="select-text">
      <div className="text-xl font-semibold ">🧙 AVA Write</div>
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="flex flex-col gap-3">
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

          <Label>Playground</Label>
          <TextArea
            placeholder="Some text that you want to alter"
            // unfortunately we need to use trimStart using `.trim()` makes it impossible to append any text
            value={state.content?.trimStart()}
            onChange={handleOnChange}
          />
        </div>
        <div className="flex flex-col mt-3">
          <Label>Transform playground text</Label>
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
            {!state.loadingContent && <span>Rewrite</span>}
            {state.loadingContent && (
              <div className="flex gap-3">
                <div>Casting a spell...</div>
                <Spinner className="h-4 w-4" />
              </div>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
