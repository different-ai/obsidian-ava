import { App } from 'obsidian';
import * as React from 'react';
import { AppContext } from './context';

export const useApp = (): App | undefined => {
  return React.useContext(AppContext);
};

export const useInterval = (callback: () => void, delay: number) => {
  const savedCallback = React.useRef<() => void>();

  // Remember the latest callback.
  React.useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  // Set up the interval.
  React.useEffect(() => {
    function tick() {
      if (savedCallback.current) {
        savedCallback.current();
      }
    }
    if (delay !== null) {
      const id = setInterval(tick, delay);
      return () => clearInterval(id);
    }
  }, [delay]);
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useRetryUntilResolved(callback: any, interval = 100) {
  const [hasResolved, setHasResolved] = React.useState(false);
  useInterval(
    () => {
      const result = callback();
      if (result) {
        setHasResolved(true);
      }
    },
    hasResolved ? null : interval
  );
  return hasResolved;
}
export default useRetryUntilResolved;
