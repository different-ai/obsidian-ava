import * as React from 'react';
import { Spinner } from './StatusBar';
import { store } from './store';

export interface ButtonProps extends React.HTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  disabled?: boolean;
}

interface PeopleComponentProps {
  onClick: (exploration: string) => void;
}
export function PeopleComponent({onClick}: PeopleComponentProps) {
  const state = React.useSyncExternalStore(store.subscribe, store.getState);
  const explorations = state.explorations;
  const searchResults = state.searchResults;

  return (
    // space between children vertically
    <div className="flex flex-col h-full space-y-2">
      <div className="outgoing-link-header">🧙 AVA People</div>
      {/* a search bar with placeholder '👨‍👩‍👦 Search people' */}
      {/* takes up the whole width, icon has enough padding */}
      {/* and search bar is far enough from the edges */}
      <div className="flex flex-col space-y-2">
        <div className="flex items-center space-x-2">
          <div className="flex-shrink-0">
            {/* icon search bar 🔎🔎🔎🔎🔎🔎🔎🔎🔎🔎🔎🔎 Magnifier */}
            <svg width="20px" height="20px" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="M17.545 15.467l-3.779-3.779a6.15 6.15 0 0 0 .898-3.21c0-3.417-2.961-6.377-6.378-6.377A6.185 6.185 0 0 0 2.1 8.287c0 3.416 2.961 6.377 6.377 6.377a6.15 6.15 0 0 0 3.115-.844l3.799 3.801a.953.953 0 0 0 1.346 0l.943-.943c.371-.371.236-.84-.135-1.211zM4.004 8.287a4.282 4.282 0 0 1 4.282-4.283c2.366 0 4.474 2.107 4.474 4.474a4.284 4.284 0 0 1-4.283 4.283c-2.366-.001-4.473-2.109-4.473-4.474z"/></svg>
          </div>
          {/* search bar */}
          <div className="flex-1 min-w-0">
            <label htmlFor="search" className="sr-only">
              Search
            </label>
            <input
              id="search"
              className="block w-full border-gray-300 rounded-md shadow-sm py-2 pl-3 pr-10 text-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="👨‍👩‍👦 Search people"
              type="search"
            />
          </div>
          
        </div>
      </div>
      {/* vertical list with "explorations" */}
      {
        !searchResults ?
        <div className="flex-1 overflow-y-auto">
          <ul className="divide-y divide-gray-200">
            {explorations
            .filter((exploration) => exploration.type === 'people')?.[0]?.values
            .map((exploration) => (
              <li key={exploration} className="cursor-pointer" onClick={() => onClick(exploration)}>
                <a href="#" className="block hover:bg-gray-50">
                  <p className="text-sm font-medium text-indigo-600">
                    {exploration}
                  </p>
                </a>
              </li>
            ))}
          </ul>
        </div> :
        // display search results as a list
        <div className="flex-1 overflow-y-auto">
          <ul className="divide-y divide-gray-200">
            {searchResults
            .similarities
            .map((r) => (
              <li key={r.notePath}>
                <a href="#" className="block hover:bg-gray-50">
                  <p className="text-sm font-medium text-indigo-600">
                    {"[["}{r.notePath}{"]]"}
                  </p>
                </a>
              </li>
            ))}
          </ul>
        </div>
      }
    </div>
  );
}