import { posthog } from 'posthog-js';
import * as React from 'react';
import AvaPlugin from './main';

export interface AvaSettings {
  debug: boolean;
  token: string;
  vaultId: string;
}

export const DEFAULT_SETTINGS: AvaSettings = {
  debug: false,
  token: '',
  vaultId: undefined,
};

export function AdvancedSettings({ plugin }: { plugin: AvaPlugin }) {
  const [isDebug, setDebug] = React.useState(plugin.settings.debug);

  const handleDebug = (event: React.ChangeEvent<HTMLInputElement>) => {
    const checked = event.target.checked;
    plugin.settings.debug = checked;
    plugin.saveSettings();
    setDebug(checked);
    checked && posthog.opt_out_capturing();
  };

  return (
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
  );
}
