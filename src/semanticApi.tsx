import { exec, spawn } from 'child_process';
import fs from 'fs';
import { App, FileSystemAdapter, Notice } from 'obsidian';
import { promisify } from 'util';
import { downloadApiSourceCode } from './utils';

export const getCwd = (app: App): string => {
  let cwd = '';
  if (
    // Platform.isMobileApp ||
    app.vault.adapter instanceof FileSystemAdapter
  ) {
    cwd = app.vault.adapter.getBasePath();
  }
  cwd += '/.obsidian/plugins/ava';
  return cwd;
};

/**
 * Install the semantic search API in a virtual environment.
 * @param {App} app
 * @return {Promise<boolean>} success or failure
 */
export const installApi = (appDir: string) => {
  const proc = spawn(`sh start-api.sh`, {
    shell: true,
    cwd: `${appDir}/semantic`,
  });
  // hacky way to create visibility into the install process
  proc.stdout.on('data', (data) => {
    if (data.toString().includes('/health')) return;
    fs.appendFileSync(`${process.env.TMPDIR}ava/log.txt`, data.toString());
  });
  proc.stderr.on('data', (data) => {
    fs.appendFileSync(`${process.env.TMPDIR}ava/log.txt`, data.toString());
  });

  proc.stdout.on('data', (data) => {
    // whatever happens log the stdout
    const formattedNotice = `🧙 AVA Search - ${data.toString()}`;

    if (data.toString().includes('Loading env')) {
      new Notice(formattedNotice);
      return;
    }

    if (data.toString().includes('Installing Requirements')) {
      new Notice(formattedNotice);
      return;
    }
    if (data.toString().includes('Initialzing API')) {
      new Notice(formattedNotice);
      return;
    }
  });

  // a lot of the errors are actually stdout
  proc.stderr.on('data', (data) => {
    // whatever happens log the stderr
    console.info(data.toString());
    const formattedNotice = `🧙 AVA Search - ${data.toString()}`;
    // catch already in use error
    if (data.toString().includes('address already in use')) {
      new Notice(formattedNotice);
      return;
    }
    // print progress bar
    if (
      data.toString().includes('Batches') &&
      !['0%', '100%'].includes(data.toString())
    ) {
      const pattern = /B.*?\|(.*?)\|/;
      const match = data.toString().match(pattern);
      new Notice(`🧙 AVA Search - ${match[0]}`);
      return;
    }
    // this is any log output from the API
    if (data.toString().includes('ava_semantic_search_api ')) {
      new Notice(formattedNotice);
      return;
    }

    if (data.toString().includes('Application startup complete')) {
      new Notice('🧙 AVA Search - Ready 🚀', 5000);
      return;
    }
    return proc;
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

const hasApiSourceCode = (basePath: string) => {
  const dir = `${basePath}/semantic`;
  return fs.existsSync(dir);
};

export const runSemanticApi = async (app: App) => {
  // if the api is already running, return early
  const running = await isApiRunning();
  if (running) {
    new Notice('🧙 AVA Search - Already Running ⚠️');
    return;
  }
  const pluginRootDir = getCwd(app);

  new Notice(
    '🧙 AVA Search - Installing in progress, this can take up to 10 min',
    2000
  );

  fs.rmSync(`${pluginRootDir}/semantic`, { recursive: true });
  new Notice('🧙 AVA Search - Downloading Source Files');
  await downloadApiSourceCode(pluginRootDir);
  new Notice(
    '🧙 AVA Search - Installing in progress, this can take up to 10 min'
  );

  new Notice('🧙 AVA Search - Installing Dependencies');
  // race condition when source code is downloaded so adding a timeout
  setTimeout(() => {
    installApi(pluginRootDir);
  }, 1500);
};
export const clearLogs = () => {
  fs.rmSync(`${process.env.TMPDIR}/ava/log.txt`);
};

/**
 * Kill all processes containing "semantic.api:app" in their name.
 * @return {Promise<boolean>} true if API(s) was killed
 */
export const killAllApiInstances = async (): Promise<boolean> => {
  try {
    new Notice('🧙 AVA Search - Stoping API');
    console.log('AVA - Killing all API instances');
    await promisify(exec)('pkill -9 -f api:app');
    console.log('Killed all API instances');
    return true;
  } catch (e) {
    console.warn('Could not kill any API instances', e);
    return false;
  }
};
