import { Notice } from 'obsidian';
import * as React from 'react';
import AvaPlugin from './main';
import { Spinner } from './StatusBar';
import { store } from './store';

export interface AvaSettings {
  useLinks: boolean;
  debug: boolean;
  token: string;
  vaultId: string;
  userId: string;
}

export const DEFAULT_SETTINGS: AvaSettings = {
  useLinks: false,
  debug: false,
  token: '',
  vaultId: undefined,
  userId: '',
};

export function AdvancedSettings({ plugin }: { plugin: AvaPlugin }) {
  const state = React.useSyncExternalStore(store.subscribe, store.getState);
  const [useLinks, setUseLinks] = React.useState(state.settings.useLinks);
  const [isDebug, setDebug] = React.useState(state.settings.debug);
  const [isLoading, setIsLoading] = React.useState(false);
  const showAdvancedSettings = isDebug;

  const handleClearIndex = () => {
    setIsLoading(true);
    new Notice('Clearing 🧙 Links index', 5000);
    plugin.clearIndex().then(() => {
      new Notice('🧙 Links index cleared', 5000);
    }).catch((e) => {
      new Notice('Error clearing 🧙 Links index', 5000);
      console.error(e);
    }).finally(() => {
      setIsLoading(false);
    });
  };
  const handleUseLinks = (event: React.ChangeEvent<HTMLInputElement>) => {
    const checked = event.target.checked;
    plugin.settings.useLinks = checked;
    plugin.saveSettings();
    setUseLinks(checked);
    plugin.loadSettings();
    if (checked) {
      new Notice('🧙 Links enabled', 5000);
      // when enabling links, we make sure to index the vault
      plugin.indexWholeVault();
    } else {
      // when disabling links, we make sure to unlisten to note events
      plugin.unlistenToNoteEvents();
    }
  };
  const handleDebug = (event: React.ChangeEvent<HTMLInputElement>) => {
    const checked = event.target.checked;
    plugin.settings.debug = checked;
    plugin.saveSettings();
    setDebug(checked);
    plugin.loadSettings();
  };
  // this will not refresh the ui but it will clear the cache
  const handleDeleteCache = () => {
    plugin.settings.token = undefined;
    plugin.settings.vaultId = undefined;
    plugin.saveSettings();

    plugin.loadSettings();
    new Notice('Cache cleared');
  };

  return (
    // small spacing vertically
    <div className="space-y-2">
      <div className="relative flex items-start">
        {/* horizontal list of an input and a button - with spacing */}
        <div className="flex h-5 items-center space-x-2">
          <div className="flex h-5 items-center">
            <input
              aria-describedby="links-description"
              name="links"
              type="checkbox"
              className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              onChange={handleUseLinks}
              checked={useLinks}
            />
          </div>
          <div className="ml-3 text-sm">
            <label htmlFor="links" className="font-medium ">
              Use 🧙 Links
            </label>
          </div>
          {/* hovering the button show a tooltip */}
          {/* hovering the button show a cursor pointer */}
          { 
            !isLoading ?
            <button
              className="ml-3 text-sm cursor-pointer"
              onClick={handleClearIndex}
              aria-label="Clear 🧙 Links' index can be required if you notice some issue with links not working"
            >
              Clear Index
            </button> :
            <Spinner/>
          }
        </div>
      </div>
      <div className="relative flex items-start">
        <div className="flex h-5 items-center">
          <input
            aria-describedby="comments-description"
            name="comments"
            type="checkbox"
            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
            onChange={handleDebug}
            checked={isDebug}
          />
        </div>
        <div className="ml-3 text-sm">
          <label htmlFor="comments" className="font-medium ">
            Debug
          </label>
          <p id="comments-description" className="text-gray-500">
            You probably don't need this
          </p>
        </div>
      </div>
      <button className="cursor-pointer" onClick={handleDeleteCache}>Delete Cache</button>
      {showAdvancedSettings && (
        <div className="overflow-x-auto mt-6">
          <div>
            <div>Token</div>
            <pre className="select-text">{state?.settings?.token}</pre>
            <div>Vault</div>
            <pre className="select-text">{state?.settings?.vaultId}</pre>
            <div>userId</div>
            <pre className="select-text">{state?.settings?.userId}</pre>
          </div>
        </div>
      )}
    </div>
  );
}
