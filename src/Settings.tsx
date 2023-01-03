import { posthog } from 'posthog-js';
import * as React from 'react';
import { PrimaryButton } from './Button';
import useRetryUntilResolved from './hooks';
import { AdvancedSettings } from './LegacySettings';
import AvaPlugin from './main';
import { store } from './store';
import { getUserAuthToken, getVaultId, openApp } from './utils';

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

      const token = await getUserAuthToken(vaultId);
      plugin.settings.token = token;
      plugin.saveSettings();
      setAttemptingToConnect(false);
    };
    getAuth();
  }, 2000);

  const handleConnect = async () => {
    posthog.capture('ava-connect');
    const vaultId = getVaultId(plugin);
    setAttemptingToConnect(true);
    openApp(vaultId);
  };

  const handleDisconnect = () => {
    posthog.capture('ava-disconnect');
    plugin.settings.token = '';
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
  return (
    <div>
      <div className="text-4xl mb-4">Obsidian AI - Codename AVA</div>
      <div className="flex justify-between gap-3 mb-20">
        <div>You need to have an account to make the most of this plugin</div>
        <Connect plugin={plugin} />
      </div>
      <AdvancedSettings plugin={plugin} />
    </div>
  );
};
