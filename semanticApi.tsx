import { exec, spawn } from 'child_process';
import { App, FileSystemAdapter, Notice } from 'obsidian';
import { promisify } from 'util';

export const getCwd = (app: App): string => {
  let cwd = '';
  if (
    // Platform.isMobileApp ||
    app.vault.adapter instanceof FileSystemAdapter
  ) {
    cwd = app.vault.adapter.getBasePath();
  }
  cwd += '/.obsidian/plugins/obsidian-ava';
  return cwd;
};

/**
 * Install the semantic search API in a virtual environment.
 * @param {App} app
 * @return {Promise<boolean>} success or failure
 */
export const installApi = async (app: App) => {
  const cwd = getCwd(app);
  console.log(cwd);
  const process = spawn(`sh start-api.sh`, {
    shell: true,
    cwd: `${cwd}/semantic`,
  });
  process.stdout.on('data', (data) => {
    if (data.toString().includes('Started Server')) {
      new Notice('Semantic search API installed');
    }
    console.log(data.toString());
  });

  process.stderr.on('data', (data) => {
    // catch already in use error
    if (data.toString().includes('address already in use')) {
      new Notice(data.toString());
    }
    console.error(data.toString());
  });
};

/**
 *
 * Check if the API process is running
 * @return {Promise<boolean>} true if the API is running
 */
export const isApiRunning = (): Promise<boolean> => {
  return new Promise((resolve) => {
    const cmd =
      // TODO: does this run on Windows and Linux also? (tested on MacOS)
      "ps -ef | grep semantic.api:app | grep -v grep | awk '{print $2}'";
    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        resolve(false);
      }
      resolve(stdout.length !== 0);
    });
  });
};

export const runSemanticApi = async (app: App) => {
  const running = await isApiRunning();
  // if the api is already running, return early
  if (running) {
    console.log(running);
    new Notice('Semantic search API is already running');
    return;
  }
  new Notice('Installing semantic search API - this can take up to 10 min.');
  installApi(app);
};

/**
 * Kill all processes containing "semantic.api:app" in their name.
 * @return {Promise<boolean>} true if API(s) was killed
 */
export const killAllApiInstances = async (): Promise<boolean> => {
  try {
    await promisify(exec)('pkill -9 -f semantic.api:app');
    return true;
  } catch (e) {
    console.warn('Did not kill any API instances', e);
    return false;
  }
};
