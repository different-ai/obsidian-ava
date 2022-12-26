import { createReadStream } from 'fs';
import got from 'got';
import { Notice } from 'obsidian';
import { posthog } from 'posthog-js';
import * as React from 'react';
import { PrimaryButton, SecondaryButton } from './Button';
import { useInterval } from './hooks';
import { AdvancedSettings, LegacySettings } from './LegacySettings';
import AvaPlugin from './main';
import { clearLogs, killAllApiInstances, runSemanticApi } from './semanticApi';
import { getUserAuthToken } from './utils';

const SemanticAPI = ({ plugin }: { plugin: AvaPlugin }) => {
  const [text, setText] = React.useState('');
  const [isActive, setIsActive] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);

  useInterval(() => {
    got
      .get('http://localhost:3333/health')
      .then((res) => {
        if (res.statusCode === 200) {
          setIsActive(true);
        } else {
          setIsActive(false);
        }
      })
      .catch((e) => setIsActive(false));
    setIsActive(false);
  }, 4000);

  const handleGetLogs = () => {
    try {
      const stream = createReadStream(`${process.env.TMPDIR}ava/log.txt`);
      stream.on('data', (data) => {
        setText(data.toString());
      });
    } catch (e) {
      new Notice('Search - No logs found');
    }
  };

  const handleStart = () => {
    posthog.capture('ava-start-semantic-api');
    new Notice('Search - Starting API');
    setIsLoading(true);
    runSemanticApi(plugin.app);
  };
  const handleClearLogs = () => {
    clearLogs();
    setText('');
  };

  const handleStop = () => {
    killAllApiInstances();
  };

  return (
    <div className="divide-y divide-slate-200 flex flex-col gap-3">
      <div>
        <div className="flex items-center justify-between">
          <div className="flex gap-3">
            <span className="text-lg font-medium ">Semantic API</span>
            <div className="flex gap-3 items-center text-xs">
              API Status: {isActive ? 'Active' : 'Inactive'}
              <div
                className={`w-2 h-2 rounded-full ${
                  isActive ? 'bg-green-500' : 'bg-gray-100'
                }`}
              ></div>
            </div>
          </div>
          <div className="flex gap-3 items-center">
            <PrimaryButton onClick={handleStart}>Start API</PrimaryButton>
            <PrimaryButton onClick={handleStop}>Stop API</PrimaryButton>
          </div>
        </div>
      </div>
      <div>
        <div className="relative flex items-center justify-between">
          <span className="pr-3 text-lg font-medium ">Logs</span>
          <div className="flex gap-3">
            <SecondaryButton onClick={handleGetLogs}>Get Logs</SecondaryButton>
            <SecondaryButton onClick={handleClearLogs}>
              Clear Logs
            </SecondaryButton>
          </div>
        </div>
      </div>

      <pre className="p-4 overflow-y-auto max-h-[200px] rounded-md border border-cyan-100 flex flex-col-reverse">
        {text}
      </pre>
    </div>
  );
};

const Connect = ({ plugin }: { plugin: AvaPlugin }) => {
  const [isConnected, setIsConnected] = React.useState(false);

  React.useEffect(() => {
    setIsConnected(plugin?.settings?.token !== '');
  }, [plugin.settings]);
  const handleConnect = async () => {
    posthog.capture('ava-connect');
    const token = await getUserAuthToken();
    plugin.settings.token = token;
    plugin.saveSettings();
    setIsConnected(true);
  };

  const handleDisconnect = () => {
    posthog.capture('ava-disconnect');
    plugin.settings.token = '';
    plugin.saveSettings();
    setIsConnected(false);
  };

  if (!isConnected) {
    return <PrimaryButton onClick={handleConnect}>Login</PrimaryButton>;
  }

  return <PrimaryButton onClick={handleDisconnect}>Logout</PrimaryButton>;
};

export const CustomSettings = ({ plugin }: { plugin: AvaPlugin }) => {
  return (
    <div>
      <div className="text-4xl mb-4">Obsidian AI - Codename AVA</div>
      <div className="flex justify-between gap-3 mb-20">
        <div>You need to have an account to make the most of this plugin</div>
        <Connect plugin={plugin} />
      </div>
      <AdvancedSettings plugin={plugin} />
      {plugin.settings.debug && (
        <>
          <SemanticAPI plugin={plugin} />
          <h2 className="text-3xl mt-4">Legacy Settings </h2>
          <div className="text-red-400">You probably don't need this</div>
          <LegacySettings plugin={plugin} />
        </>
      )}
    </div>
  );
};
