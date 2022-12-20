import { App } from 'obsidian';
import * as React from 'react';
import { AppContext } from './context';

export const useApp = (): App | undefined => {
  return React.useContext(AppContext);
};
