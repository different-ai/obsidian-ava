import { Notice } from 'obsidian';
import { posthog } from 'posthog-js';
import * as React from 'react';
import AvaPlugin from './main';
import { store } from './store';

export interface AvaSettings {
  debug: boolean;
  token: string;
  vaultId: string;
  userId: string;
}

export const DEFAULT_SETTINGS: AvaSettings = {
  debug: false,
  token: '',
  vaultId: undefined,
  userId: '',
};

export function AdvancedSettings({ plugin }: { plugin: AvaPlugin }) {
  const state = React.useSyncExternalStore(store.subscribe, store.getState);
  const [isDebug, setDebug] = React.useState(state.settings.debug);
  const showAdvancedSettings = isDebug;

  const handleDebug = (event: React.ChangeEvent<HTMLInputElement>) => {
    const checked = event.target.checked;
    plugin.settings.debug = checked;
    plugin.saveSettings();
    setDebug(checked);
    plugin.loadSettings();
    checked && posthog.opt_out_capturing();
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
    <div>
      <div className="relative flex items-start">
        <div className="flex h-5 items-center">
          <input
            aria-describedby="comments-description"
            name="comments"
            type="checkbox"
            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
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
      <button onClick={handleDeleteCache}>Delete Cache</button>
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
