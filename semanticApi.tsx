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
    // whatever happens log the stdout
    console.info(data.toString());

    if (data.toString().includes('Loading env')) {
      new Notice(data.toString());
      return;
    }

    if (data.toString().includes('Installing Requirements')) {
      new Notice(data.toString());
      return;
    }
    if (data.toString().includes('Starting API')) {
      new Notice(data.toString());
      return;
    }

    if (data.toString().includes('Started Server')) {
      new Notice('Semantic search API installed');
      return;
    }
  });

  // a lot of the errors are actually stdout
  process.stderr.on('data', (data) => {
    // whatever happens log the stderr
    console.info(data.toString());

    // catch already in use error
    if (data.toString().includes('address already in use')) {
      new Notice(data.toString());
      return;
    }
    if (data.toString().includes('Batches')) {
      const pattern = /B.*?\|(.*?)\|/;
      const match = data.toString().match(pattern);
      new Notice(`AVA plugin - ${match[0]}`);
      return;
    }
    // this is any log output from the API
    if (data.toString().includes('ava_semantic_search_api ')) {
      new Notice(data.toString());
      return;
    }

    if (data.toString().includes('Application startup complete')) {
      new Notice('Semantic API is now ready to use 🐒');
      return;
    }
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
    console.log('Killing all API instances');
    await promisify(exec)('pkill -9 -f api:app');
    console.log('Killed all API instances');
    return true;
  } catch (e) {
    console.warn('Could not kill any API instances', e);
    return false;
  }
};
