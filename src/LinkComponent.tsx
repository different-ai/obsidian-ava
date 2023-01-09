import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { posthog } from 'posthog-js';
import * as React from 'react';
import { ReactMarkdown } from 'react-markdown/lib/react-markdown';
import { CopyToClipboardButton } from './CopyToClipboard';
import { useApp } from './hooks';
import { InsertButton } from './InsertButton';
import { store } from './store';

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
  return (
    <>
      <div className="flex gap-2 items-center">
        <div className="tree-item-self is-clickable outgoing-link-item tree-item-self search-result-file-title is-clickable">
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
            data-path={result.path}
            onClick={() => {
              app.workspace.openLinkText(result.path, '', false);
            }}
          >
            <span
              className="tree-item-inner"
              title={`Similarity: ${result.similarity.toPrecision(
                2
              )}, Opacity: ${result.opacity.toPrecision(2)}`}
              style={{ opacity: result.opacity }}
            >
              {result.name}
            </span>
          </a>
        </div>
      </div>
      <div>
        {isExpanded && (
          <div className="search-result-file-matches p-2">
            <ReactMarkdown>{fileText}</ReactMarkdown>
          </div>
        )}
      </div>
    </>
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
    const topValue = embeds[0].similarity;
    const results = embeds.map((embed) => {
      const [path, similarity] = [embed.path, embed.similarity];
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

  if (error) {
    return <div>There was an error</div>;
  }

  if (results.length === 0) {
    return <div>🧙 Links - no links found</div>;
  }

  const textToInsert = `${results
    .map((similarity) => '- [[' + similarity?.path?.replace('.md', '') + ']]')
    .join('\n')}`;

  return (
    <div>
      <div className="outgoing-link-header">🧙 AVA Links</div>
      <br />
      <div className="search-result-container">
        {results?.map((result) => (
          <ListItem key={result.path} result={result} />
        ))}
      </div>
      <div className="flex gap-3">
        <CopyToClipboardButton text={textToInsert} extraOnClick={trackCopy} />
        <InsertButton
          text={textToInsert}
          editorContext={state.editorContext}
          extraOnClick={trackInsert}
        />
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
