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
    plugin
      .clearIndex()
      .then(() => {
        new Notice('🧙 Links index cleared', 5000);
      })
      .catch((e) => {
        new Notice('Error clearing 🧙 Links index', 5000);
        console.error(e);
      })
      .finally(() => {
        setIsLoading(false);
      });
  };
  const disableLinks = () => {
    posthog.capture('settings', {
      action: 'useLinks',
      value: false,
    });
    plugin.settings.useLinks = true;
    plugin.saveSettings();
    setUseLinks(false);
    plugin.unlistenToNoteEvents();
  };

  const enableLinks = () => {
    posthog.capture('settings', {
      action: 'useLinks',
      value: true,
    });
    plugin.settings.useLinks = true;
    plugin.saveSettings();
    setUseLinks(true);
    new Notice('🧙 Links enabled', 5000);
    // when enabling links, we make sure to index the vault
    plugin.indexWholeVault();
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
      <div className="flex items-start">
        {/* horizontal list of an input and a button - with spacing between children */}
        <div className="flex flex-col">
          <div className="flex items-center mb-3">
            <div className="text-3xl font-bold">🧙 Links</div>
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
          </div>
          {/* use caption for feature description */}
          <p>
            Link is a powerful feature that allows to link independent notes
            based on their content.
          </p>

          <div className="flex ">
            {!useLinks && (
              <button
                aria-describedby="links-description"
                name="links"
                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                onClick={enableLinks}
              >
                Enable
              </button>
            )}
            {useLinks && (
              <button
                aria-describedby="links-description"
                name="links"
                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                onClick={disableLinks}
              >
                Disable
              </button>
            )}
            {/*
            a green when 'running', yellow when 'loading'
            red when 'error' and grey blinking light when 'disabled'
            showing the status of Links
          */}
            {/* hovering the button show a tooltip */}
            {/* hovering the button show a cursor pointer */}
            {!isLoading ? (
              <button
                className="ml-3 text-sm cursor-pointer"
                onClick={handleClearIndex}
                aria-label="Clear 🧙 Links' index can be required if you notice some issue with links not working"
              >
                Clear Index
              </button>
            ) : (
              <Spinner />
            )}
          </div>
        </div>
      </div>
      <div className="">
        <div className="text-xl font-bold my-8">Advanced Settings</div>
        <div className="flex h-5 items-center">
          <input
            aria-describedby="comments-description"
            name="comments"
            type="checkbox"
            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
            onChange={handleDebug}
            checked={isDebug}
          />
          <div className="ml-3 text-sm">
            <label htmlFor="comments" className="font-medium ">
              Debug
            </label>
            <div id="comments-description" className="text-gray-500">
              You probably don't need this
            </div>
          </div>
        </div>
        {showAdvancedSettings && (
          <button className="cursor-pointer mt-6" onClick={handleDeleteCache}>
            Delete Cache
          </button>
        )}
      </div>
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
