import * as React from 'react';
import { PrimaryButton } from './Button';
import useRetryUntilResolved from './hooks';
import { AdvancedSettings } from './LegacySettings';
import AvaPlugin from './main';
import { store } from './store';
import { getLinkData, getVaultId, openApp } from './utils';

const Connect = ({ plugin }: { plugin: AvaPlugin }) => {
  const state = React.useSyncExternalStore(store.subscribe, store.getState);
  const [attemptingToConnect, setAttemptingToConnect] = React.useState(false);

  const isConnected = !!state?.settings?.token;
  useRetryUntilResolved(() => {
    // should not poll until user tries to connect
    if (!attemptingToConnect) {
      return;
    }
    // should not poll if already connected
    if (isConnected) {
      return;
    }
    // todo: missing a condition where the user cleared cache

    const getAuth = async () => {
      const vaultId = getVaultId(plugin);

      // part1: wait 10 seconds in between calls
      await sleep(5000);
      const linkData = await getLinkData(vaultId);
      plugin.settings.token = linkData?.token;
      plugin.settings.userId = linkData?.userId;

      plugin.saveSettings();
      setAttemptingToConnect(false);

      // part two
      await sleep(5000);
    };
    getAuth();
  }, 2000);

  const handleConnect = async () => {
    const vaultId = getVaultId(plugin);
    setAttemptingToConnect(true);
    openApp(vaultId);
  };

  const handleDisconnect = () => {
    plugin.settings.token = '';
    plugin.unlistenToNoteEvents();
    setAttemptingToConnect(false);
    plugin.saveSettings();
  };
  if (attemptingToConnect) {
    return <PrimaryButton disabled>Connecting...</PrimaryButton>;
  }

  if (!isConnected) {
    return <PrimaryButton onClick={handleConnect}>Login</PrimaryButton>;
  }

  return <PrimaryButton onClick={handleDisconnect}>Logout</PrimaryButton>;
};

export const CustomSettings = ({ plugin }: { plugin: AvaPlugin }) => {
  const state = React.useSyncExternalStore(store.subscribe, store.getState);
  return (
    <div>
      <div className="text-3xl mb-4">AVA</div>
      <div className="flex justify-between gap-3 mb-20">
        {!state.settings.token && (
          <div>You need to have an account to make the most of this plugin</div>
        )}
        {state.settings.token && (
          <div>
            <a
              href="https://app.anotherai.co/dashboard"
              target="_blank"
              rel="noreferrer"
            >
              Check your usage and manage your account
            </a>
          </div>
        )}

        <Connect plugin={plugin} />
      </div>
      <AdvancedSettings plugin={plugin} />
    </div>
  );
};
