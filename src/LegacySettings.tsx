import { Notice } from 'obsidian';
import posthog from 'posthog-js';
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
    posthog.capture('settings', {
      action: 'clearIndex',
    });
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
    posthog.capture('settings', {
      action: 'useLinks',
      value: checked,
    });
    plugin.settings.useLinks = checked;
    plugin.saveSettings();
    setUseLinks(checked);
    if (checked) {
      new Notice('🧙 Links enabled', 5000);
      // when enabling links, we make sure to index the vault
      plugin.indexWholeVault();
    } else {
      // when disabling links, we make sure to unlisten to note events
      plugin.unlistenToNoteEvents();
      state.setLinksStatus('disabled');
    }
  };
  const handleDebug = (event: React.ChangeEvent<HTMLInputElement>) => {
    const checked = event.target.checked;
    posthog.capture('settings', {
      action: 'debug',
      value: checked,
    });
    plugin.settings.debug = checked;
    plugin.saveSettings();
    setDebug(checked);
  };
  // this will not refresh the ui but it will clear the cache
  const handleDeleteCache = () => {
    posthog.capture('settings', {
      action: 'deleteCache',
    });
    plugin.settings.token = undefined;
    plugin.settings.vaultId = undefined;
    plugin.saveSettings();
    new Notice('Cache cleared');
  };

  return (
    // small spacing vertically
    <div className="space-y-2">
      <div className="relative flex items-start">
        {/* horizontal list of an input and a button - with spacing between children */}
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
          {/*
            a green when 'running', yellow when 'loading'
            red when 'error' and grey blinking light when 'disabled'
            showing the status of Links
          */}
          <div className="ml-3 text-sm">
            <div className="flex items-center">
              <div className="flex-shrink-0 h-2 w-2">
                <div
                  className={`h-2 w-2 rounded-full ${
                    state.linksStatus === 'running'
                      ? 'bg-green-400 animate-pulse'
                      : state.linksStatus === 'loading'
                      ? 'bg-yellow-400 animate-pulse'
                      : state.linksStatus === 'error'
                      ? 'bg-red-400 animate-pulse'
                      : 'bg-gray-400 animate-pulse'
                  }`}
                  // tooltip shown when hovering the light
                  // 'running' -> '🧙 Links is running'
                  // 'loading' -> '🧙 Links is loading'
                  // 'error' -> '🧙 Links is in error - please try to restart Obsidian'
                  // 'disabled' -> '🧙 Links is disabled'
                  aria-label={`${
                    state.linksStatus === 'running'
                      ? '🧙 Links is running'
                      : state.linksStatus === 'loading'
                      ? '🧙 Links is loading'
                      : state.linksStatus === 'error'
                      ? '🧙 Links is in error - please try to restart Obsidian'
                      : '🧙 Links is disabled'
                  }`}
                />
              </div>
              <div className="ml-3 text-sm">
                <label htmlFor="links" className="font-medium ">
                  {state.linksStatus}
                </label>
              </div>
            </div>
          </div>
          <div className="ml-3 text-sm">
            <label htmlFor="links" className="font-medium ">
              |
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
