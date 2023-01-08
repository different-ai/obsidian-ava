import { Notice } from 'obsidian';
import * as React from 'react';
import AvaPlugin from './main';
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
  const showAdvancedSettings = isDebug;

  const handleUseLinks = (event: React.ChangeEvent<HTMLInputElement>) => {
    const checked = event.target.checked;
    plugin.settings.useLinks = checked;
    plugin.saveSettings();
    setUseLinks(checked);
    plugin.loadSettings();
    if (checked) {
      new Notice('🧙 Links enabled, make sure to run the Load vault command');
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
        <div className="flex h-5 items-center">
          <input
            aria-describedby="links-description"
            name="links"
            type="checkbox"
            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            onChange={handleUseLinks}
            checked={useLinks}
          />
        </div>
        <div className="ml-3 text-sm">
          <label htmlFor="links" className="font-medium ">
            Use 🧙 Links
          </label>
        </div>
      </div>
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
