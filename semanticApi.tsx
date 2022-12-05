import {exec} from "child_process";
import {App, FileSystemAdapter, Notice} from "obsidian";
import {promisify} from "util";


export const getCwd = (app: App): string => {
  let cwd = "";
  if (
    // Platform.isMobileApp ||
    app.vault.adapter instanceof FileSystemAdapter
  ) {
    cwd = app.vault.adapter.getBasePath();
  }
  cwd += "/.obsidian/plugins/obsidian-ava";
  return cwd;
};

/**
 * Install the semantic search API in a virtual environment.
 * @param {App} app
 * @return {Promise<boolean>} success or failure
 */
export const installApi = async (app: App): Promise<boolean> => {
  const cwd = getCwd(app);
  // TODO: might check if already installed?
  // virtualenv env; \
  // source env/bin/activate; \
  // pip install -r semantic/requirements.txt
  // check if the user has virtualenv installed in /opt/homebrew/bin/virtualenv
  const isLinux = process.platform === "linux";
  const isMac = process.platform === "darwin";
  const isWindows = process.platform === "win32";
  const pathToCheck = isLinux ?
    "/usr/bin/virtualenv" :
    isMac ?
      "/opt/homebrew/bin/virtualenv" :
      isWindows ?
        // TODO: fuck windows :D | need someone to test this
        // eslint-disable-next-line max-len
        "C:\\Users\\%USERNAME%\\AppData\\Local\\Programs\\Python\\*\\Scripts\\virtualenv.exe" :
        "";
  if (pathToCheck === "") {
    new Notice("❗️ Could not determine OS ❗️");
    return false;
  }
  try {
    await promisify(exec)(`ls ${pathToCheck}`);
  } catch (e) {
    new Notice("❗️ Please install Python' virtualenv" +
    " in order to use semantic search ❗️");
    console.log(e);
    return false;
  }
  // TODO: what about pip?
  try {
    await promisify(exec)(
        `(${pathToCheck} env || true) && source env/bin/activate && ` +
        "pip install -r semantic/requirements.txt",
        {cwd},
    );
  } catch (e) {
    new Notice("❗️ Error installing semantic search API ❗️");
    console.error(e);
    return false;
  }
  return true;
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
  const installed = await installApi(app);
  const running = await isApiRunning();
  installed && new Notice("Semantic search API installed");
  if (!installed || running) {
    console.warn(
      !installed ?
      "Semantic search API not installed" :
      running ?
      "Semantic search API already running" :
      "Unknown error",
    );
    return;
  }
  const cwd = getCwd(app);
  const pythonInterpreter = cwd + "/env/bin/python3";
  // run bash process and store the handle in settings
  const cmd =
        // eslint-disable-next-line max-len
        `${pythonInterpreter} -m uvicorn --app-dir=${cwd} semantic.api:app --port 3000`;

  return exec(cmd, {
    cwd: cwd,
  });
};

/**
 * Kill all processes containing "semantic.api:app" in their name.
 * @return {Promise<boolean>} true if API(s) was killed
 */
export const killAllApiInstances = async (): Promise<boolean> => {
  try {
    await promisify(exec)("pkill -9 -f semantic.api:app");
    return true;
  } catch (e) {
    console.warn("Did not kill any API instances", e);
    return false;
  }
};
