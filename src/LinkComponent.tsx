import { posthog } from 'posthog-js';
import * as React from 'react';
import { CopyToClipboardButton } from './CopyToClipboard';
import { useApp } from './hooks';
import { InsertButton } from './InsertButton';
import { store } from './store';

export interface ButtonProps extends React.HTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  disabled?: boolean;
}

//     return { path: similarity.note_path, similarity: similarity.score };
export function LinkComponent() {
  const app = useApp();
  const state = React.useSyncExternalStore(store.subscribe, store.getState);
  const [error, setError] = React.useState(false);
  const [results, setResults] = React.useState([]);
  const embeds = state.embeds;
  const threshold = 0.5;

  const trackCopy = () => {
    posthog.capture('copy-links');
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
        {results.map((result) => (
          <a
            key={result.path}
            href={result.path}
            className="tree-item-self is-clickable outgoing-link-item"
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
        ))}
      </div>
      <div className="flex gap-3">
        <CopyToClipboardButton text={textToInsert} extraOnClick={trackCopy} />
        <InsertButton text={textToInsert} editorContext={state.editorContext} />
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
