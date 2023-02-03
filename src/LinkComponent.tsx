import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { posthog } from 'posthog-js';
import * as React from 'react';
import { useForm } from 'react-hook-form';
import { ReactMarkdown } from 'react-markdown/lib/react-markdown';
import { PrimaryButton } from './Button';
import { API_HOST } from './constants';
import { CopyToClipboardButton } from './CopyToClipboard';
import { useApp } from './hooks';
import { InsertButton } from './InsertButton';
import { store } from './store';
import { camelize, ISearchBody } from './utils';

export interface ButtonProps extends React.HTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  disabled?: boolean;
}
const ListItem = ({
  result,
}: {
  result: { path: string; similarity: number; opacity: number; name: string };
}) => {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const app = useApp();
  const [fileText, setFileText] = React.useState('');
  React.useEffect(() => {
    const getFileText = async (path: string) => {
      const file = app.vault
        .getMarkdownFiles()
        .find((file) => file.path === path);
      const content = await app.vault.read(file);
      setFileText(content);
    };
    getFileText(result.path);
  }, [result]);
  // only show notes with content, we should make this configurable and not enable this by default
  // if (fileText.length === 0) return null;
  return (
    <>
      <div className="flex gap-2 items-center">
        <div className="p-0 tree-item-self is-clickable outgoing-link-item tree-item-self search-result-file-title is-clickable">
          {isExpanded && (
            <ChevronDownIcon
              className="h-3 w-3 min-w-[0.75rem]"
              onClick={() => setIsExpanded(false)}
            />
          )}
          {!isExpanded && (
            <ChevronRightIcon
              className="h-3 w-3 min-w-[0.75rem]"
              onClick={() => setIsExpanded(true)}
            />
          )}
          <a
            key={result.path}
            href={result.path}
            className="tree-item-self search-result-file-title"
            data-path={result.path}
            onClick={() => {
              app.workspace.openLinkText(result.path, '', false);
            }}
          >
            <span
              className="tree-item-inner"
              title={`Opacity: ${result.opacity.toPrecision(2)}`}
              style={{ opacity: result.opacity }}
            >
              {result.name}
            </span>
          </a>
          <span className="tree-item-flair">
            {(result.similarity * 100).toPrecision(2)}% similar
          </span>
        </div>
      </div>
      <div>
        {isExpanded && (
          <div className="search-result-file-matches p-2 ">
            <div className="opacity-75">Preview</div>
            <ReactMarkdown>{fileText || 'File is empty'}</ReactMarkdown>
          </div>
        )}
      </div>
    </>
  );
};

const ControlForm = () => {
  const { register, handleSubmit } = useForm();
  const state = React.useSyncExternalStore(store.subscribe, store.getState);

  const onSubmit = async (data: { limit: number; useNoteTitle: boolean }) => {
    posthog.capture('use-feature', {
      feature: 'search',
      limit: data.limit,
    });
    state.setEmbedsLoading(true);

    const body: ISearchBody = {
      // parenthese are needed for the ternary operator to work
      query:
        (data.useNoteTitle ? `File:\n${state.currentFilePath}\n` : '') +
        `Content:\n${state.currentFileContent}`,
      vault_id: state.settings.vaultId,
      top_k: Number(data.limit),
    };
    const url = posthog.isFeatureEnabled('new-search') ?
      `https://obsidian-search-dev-c6txy76x2q-uc.a.run.app/v1/search` :
      `${API_HOST}/v1/search`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${state.settings.token}`,
        'X-Client-Version': state.version,
      },
      body: JSON.stringify(body),
    }).then((res) => res.json());

    const embeds = camelize(response.similarities);

    state.setEmbedsLoading(false);
    /* @ts-expect-error need to work on better types */
    state.setEmbeds(embeds);
  };

  return (
    <div className="border block rounded-md border-solid border-gray-300 p-4">
      <form onSubmit={handleSubmit(onSubmit)}>
        {/* horizontal list of two items, one input number and one checkbox keep item top aligned spaced evenly */}
        <div className="flex flex-col gap-3">
          {/* vertical list */}
          <div className="flex flex-col gap-2">
            <label htmlFor="" className="block text-sm font-medium">
              Max Results
            </label>
            <input
              type="number"
              className="block rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm w-max"
              defaultValue={5}
              placeholder="5"
              {...register('limit', { required: true })}
            />
          </div>
          {/* vertical list checkbox "use note title" */}
          <div className="flex gap-2 items-center">
            <input
              id="checked-checkbox"
              type="checkbox"
              defaultChecked={true}
              className="block rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              {...register('useNoteTitle', { required: false })}
            />
            <label
              data-tooltip-target="tooltip-default"
              htmlFor="checked-checkbox"
              className="block text-sm font-medium"
              aria-label="Disabling this improves search results for daily notes and unnamed files"
            >
              Include note title in search
            </label>
          </div>
        </div>
        <PrimaryButton className="mt-3 w-full">Search</PrimaryButton>
      </form>
    </div>
  );
};

export function LinkComponent() {
  const state = React.useSyncExternalStore(store.subscribe, store.getState);
  const [error, setError] = React.useState(false);
  const [results, setResults] = React.useState([]);
  const embeds = state.embeds;
  const threshold = 0.5;

  const trackCopy = () => {
    posthog.capture('copy-links');
  };
  const trackInsert = () => {
    posthog.capture('insert-links');
  };

  React.useEffect(() => {
    if (!embeds) {
      setError(true);
      return;
    }
    if (embeds.length === 0) {
      setResults([]);
      return;
    }

    // get the top value
    const topValue = embeds[0].score;
    const results = embeds.map((embed) => {
      const [path, similarity] = [embed.notePath, embed.score];
      const opacity = sCurve(similarity, threshold, topValue);

      return {
        path,
        similarity,
        opacity,
        name: path.split('/').pop().split('.md')[0],
      };
    });
    setResults(results);
  }, [embeds, threshold]);

  const textToInsert = `${results
    .map((similarity) => '- [[' + similarity?.path?.replace('.md', '') + ']]')
    .join('\n')}`;

  const disableButtons =
    state.loadingContent || results.length === 0 || !state.editorContext;
  return (
    <div className="flex flex-col gap-3">
      <div className="text-xl font-semibold ">🧙 AVA Links</div>
      <ControlForm />
      <div className="flex gap-3">
        <CopyToClipboardButton
          disabled={disableButtons}
          text={textToInsert}
          extraOnClick={trackCopy}
        />
        <InsertButton
          disabled={disableButtons}
          text={textToInsert}
          editorContext={state.editorContext}
          extraOnClick={trackInsert}
        />
      </div>
      <div className="text-sm text-[var(--text-faint)]">
        Notes similar to {state.currentFilePath.replace('.md', '')}
      </div>
      {state.loadingEmbeds && <div>🔮 Casting memory retrieval spell...</div>}
      {error && <div>There was an error</div>}
      {results.length === 0 && !state.loadingEmbeds && (
        <div>No links found</div>
      )}
      <div className="search-result-container p-0">
        {!state.loadingEmbeds &&
          results?.map((result) => (
            <ListItem key={result.path} result={result} />
          ))}
      </div>
    </div>
  );
}

function sCurve(x: number, bottomThreshold: number, topThreshold = 0.95) {
  if (x < bottomThreshold) {
    return 0.4;
  }
  if (x > topThreshold) {
    return 1;
  }
  const a = 1 / (topThreshold - bottomThreshold);
  const b = -a * bottomThreshold;
  const y = a * x + b;
  return 0.4 + 0.6 * y;
}
