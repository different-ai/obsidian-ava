import { Notice, TFolder } from 'obsidian';
import * as React from 'react';
import { PrimaryButton, SecondaryButton } from './Button';
import AvaPlugin from './main';
import { Spinner } from './StatusBar';
import { store } from './store';
import { ENDPOINT_NAMES, getUsage } from './utils';
import { CheckBox } from './CheckBox';

export interface AvaSettings {
  useLinks: boolean;
  debug: boolean;
  token: string;
  vaultId: string;
  userId: string;
  experimental: boolean;
  ignoredFolders: string[];
  storeData: boolean;
  embedbaseUrl: string;
}

export const defaultEmbedbaseUrl = 'https://embedbase-ava-c6txy76x2q-uc.a.run.app';
export const DEFAULT_SETTINGS: AvaSettings = {
  useLinks: false,
  debug: false,
  token: '',
  vaultId: undefined,
  userId: '',
  experimental: false,
  ignoredFolders: [],
  storeData: false,
  embedbaseUrl: defaultEmbedbaseUrl,
};

export function AdvancedSettings({ plugin }: { plugin: AvaPlugin }) {
  const state = React.useSyncExternalStore(store.subscribe, store.getState);
  const [useLinks, setUseLinks] = React.useState(state.settings.useLinks);
  const [isDebug, setDebug] = React.useState(state.settings.debug);
  const [isLoading, setIsLoading] = React.useState(false);
  const [usage, setUsage] = React.useState<any | undefined>([]);
  const [isExperimental, setExperimental] = React.useState(
    state.settings.experimental
  );
  const [folderList, setFolderList] = React.useState<string[]>([]);
  const [ignoredFolders, setIgnoredFolders] = React.useState<string[]>(
    state.settings.ignoredFolders
  );
  const [ignoredFolderInput, setIgnoredFolderInput] =
    React.useState<string>('');
  const [storeData, setStoreData] = React.useState<boolean>(
    state.settings.storeData
  );
  const [embedbaseUrl, setEmbedbaseUrl] = React.useState<string>(
    state.settings.embedbaseUrl
  );
  const showAdvancedSettings = isDebug;

  React.useEffect(() => {
    if (state.linksStatus === 'disabled') {
      setUseLinks(false);
      plugin.saveSettings();
    }
  }, [state.linksStatus]);

  React.useEffect(() => {
    getUsage(state.settings.token, plugin.manifest.version)
      .then(setUsage)
      .catch((e) => console.error(e));
  }, []);

  React.useEffect(() => {
    const f = app.vault
      .getAllLoadedFiles()
      .filter((i: TFolder) => i.children)
      .map((folder) => folder.path);
    setFolderList(f);
  }, []);

  const handleClearIndex = () => {
    setIsLoading(true);
    new Notice('Clearing 🧙 Links index', 5000);
    plugin
      .clearIndex()
      .then(() => {
        new Notice('🧙 Links index cleared', 5000);
      })
      .catch((e) => {
        new Notice(`⛔️ AVA ${e}`, 4000);
        console.error(e);
      })
      .finally(() => {
        setIsLoading(false);
      });
  };
  const enableLinks = (value: boolean) => {
    console.log('enableLinks', value);
    plugin.settings.useLinks = value;
    plugin.saveSettings();
    setUseLinks(value);
    if (value) {
      plugin.indexWholeVault();
    } else {
      plugin.unlistenToNoteEvents();
    }
  };
  const handleEmbedbaseUrl = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    plugin.settings.embedbaseUrl = value;
    plugin.saveSettings();
    setEmbedbaseUrl(value);
  };
  const handleStoreData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const checked = event.target.checked;
    plugin.settings.storeData = checked;
    plugin.saveSettings();
    setStoreData(checked);
  };
  const handleDebug = (event: React.ChangeEvent<HTMLInputElement>) => {
    const checked = event.target.checked;
    plugin.settings.debug = checked;
    plugin.saveSettings();
    setDebug(checked);
  };
  const handleExperimental = (event: React.ChangeEvent<HTMLInputElement>) => {
    const checked = event.target.checked;
    plugin.settings.experimental = checked;
    plugin.saveSettings();
    setExperimental(checked);
  };
  // this will not refresh the ui but it will clear the cache
  const handleDeleteCache = () => {
    plugin.settings.token = undefined;
    plugin.settings.vaultId = undefined;
    plugin.saveSettings();
    new Notice('Cache cleared');
  };
  const handleIgnoredFolderInput = () => {
    const v = [...new Set([...ignoredFolders, ignoredFolderInput])];
    plugin.settings.ignoredFolders = v;
    plugin.saveSettings();
    setIgnoredFolders(v);
    setIgnoredFolderInput('');
  };
  const handleRemoveIgnoredFolder = (folder: string) => {
    const v = ignoredFolders.filter((i) => i !== folder);
    plugin.settings.ignoredFolders = v;
    plugin.saveSettings();
    setIgnoredFolders(v);
  };
  return (
    // small spacing vertically
    <div className="space-y-2">
      {/* a list of progress bars displaying current plans' usage */}
      <div className="">
        <div className="text-2xl font-bold mb-3">🔮 Usage</div>

        {usage &&
          state.settings.token &&
          Object.keys(usage).map((key: string) => {
            let percentageAsNumber = Math.round(
              (usage[key].split('/')[0] / usage[key].split('/')[1]) * 100
            );
            // HACK for admin accounts
            if (percentageAsNumber > 100) percentageAsNumber = 100;
            const percentage = `${percentageAsNumber}%`;
            return (
              <div className="flex flex-col mb-3 gap-1" key={key}>
                <div className="flex gap-3 items-center">
                  <div className="text-sm">{ENDPOINT_NAMES[key]}</div>{' '}
                  <div className="text-sm">{usage[key]}</div>
                </div>
                {/* align the progress bar to the right */}{' '}
                <div
                  className="w-full bg-gray-200 rounded-md relative h-8  "
                  // hover the progress bar to show the real usage
                  aria-label={`${percentage} used`}
                >
                  <div className="absolute top-1/2 z-20 text-[var(--text-on-accent)]"></div>
                  <div
                    className="text-xs font-medium leading-none rounded-md bg-[var(--interactive-accent)] h-full "
                    style={{ width: percentage }}
                  ></div>
                </div>
              </div>
            );
          })}
      </div>
      {state.settings.token && (
        <div className="flex items-start">
          {/* horizontal list of an input and a button - with spacing between children */}
          <div className="flex flex-col">
            <div className="flex items-center mt-3">
              <div className="text-2xl font-bold">🧙 Links</div>
              <div className="ml-3 text-sm">
                <div className="flex items-center">
                  <div className="flex-shrink-0 h-2 w-2">
                    <div
                      className={`h-2 w-2 rounded-full ${state.linksStatus === 'running'
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
                      aria-label={`${state.linksStatus === 'running'
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
            <p className="">
              Link is a powerful feature that allows to link independent notes
              based on their content.
            </p>
            <PrimaryButton
              className="max-w-max mb-3"
              onClick={() => enableLinks(!useLinks)}
              disabled={plugin.settings.token === ''}
            >
              {useLinks ? 'Disable Links' : 'Enable Links'}
            </PrimaryButton>

            <div className="flex flex-col gap-3 w-[300px]">
              <div className="flex flex-col gap-3">
                <div className="flex gap-3 items-end">
                  <div>
                    <label className="block pb-1 text-sm font-medium text-gray-700">
                      Ignore Folders
                    </label>

                    <input
                      type="text"
                      className="border border-gray-300 rounded-md"
                      placeholder="Folder name"
                      value={ignoredFolderInput}
                      onChange={(e) => setIgnoredFolderInput(e.target.value)}
                    />
                  </div>
                  <SecondaryButton
                    className={'rounded border-gray-300'}
                    onClick={handleIgnoredFolderInput}
                  >
                    Add
                  </SecondaryButton>
                </div>
                {/* horizontal list with an horizontal list & a right arrow icon at the end */}
                <div className="flex flex-row gap-3">
                  {/* horizontal list of ignored folders, scrollable with max 3 items */}
                  {/* hide scrollbar */}
                  <div className="flex">
                    {ignoredFolders.map((folder) => (
                      // chip like deletable with icon button cursor pointer
                      <div
                        key={folder}
                        className="flex items-center gap-3 justify-between text-xs text-[var(--text-muted)]"
                      >
                        <div>
                          {folder.length > 10
                            ? folder.substring(0, 10) + '...'
                            : folder}{' '}
                        </div>
                        <div
                          onClick={() => handleRemoveIgnoredFolder(folder)}
                          aria-label={`Remove ${folder} from ignored folders`}
                        >
                          🗑️
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex ">
              {/*
            a green when 'running', yellow when 'loading'
            red when 'error' and grey blinking light when 'disabled'
            showing the status of Links
          */}
              {/* hovering the button show a tooltip */}
              {!isLoading ? (
                <button
                  className="text-sm cursor-pointer mt-3"
                  onClick={handleClearIndex}
                  aria-label="Clear 🧙 Links' index can be required if you notice some issue with links not working"
                >
                  ⚠️ Clear Index
                </button>
              ) : (
                <Spinner />
              )}
            </div>
          </div>
        </div>
      )}
      <div className="">
        <div className="text-xl font-bold mt-8 mb-3">Advanced Settings</div>
        <div className="flex flex-col gap-3">
          <CheckBox
            onChange={handleStoreData}
            checked={storeData}
            label="Save Links data"
            subText="⚠️ You probably don't need this, this is useful if you want to use your Links' data outside Obsidian ⚠️"
          />
          <CheckBox
            onChange={handleDebug}
            checked={isDebug}
            label="Debug"
            subText="⚠️ You probably don't need this ⚠️"
          />
          <CheckBox
            onChange={handleExperimental}
            checked={isExperimental}
            label="Experimental features"
            subText="⚠️ Can break your vault, to be used with caution ⚠️"
          />
          {/* an input text for embedbase url */}
          <div className="flex flex-col gap-3">

            <div className="flex gap-3 items-end">
              <div className="flex flex-col gap-3 w-full">
                <label className="font-medium">
                  Embedbase URL
                </label>
                <input
                  type="text"
                  className="border border-gray-300 rounded-md"
                  placeholder="https://embedbase-internal-c6txy76x2q-uc.a.run.app"
                  value={embedbaseUrl}
                  onChange={handleEmbedbaseUrl}
                />

              </div>
              {/* an icon button to reset the text to default */}
              <SecondaryButton
                onClick={() => setEmbedbaseUrl(defaultEmbedbaseUrl)}
                aria-label="Reset Embedbase URL to default"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M3.293 3.293a1 1 0 011.414 0L10 8.586l5.293-5.293a1 1 0 111.414 1.414l-5.293 5.293 5.293 5.293a1 1 0 01-1.414 1.414L10 11.414l-5.293 5.293a1 1 0 01-1.414-1.414l5.293-5.293-5.293-5.293a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </SecondaryButton>
            </div>
          </div>
          <div className="ml-3 text-sm">
            <div id="comments-description" className="text-gray-500">
              ⚠️ You probably don't need this,{' '}
              <a
                href="https://github.com/different-ai/embedbase"
                target="_blank"
                rel="noreferrer"
              >
                This is the API powering Links
              </a>
              {' '}
              ⚠️
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
