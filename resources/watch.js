/* eslint-disable no-console */
const sane = require('sane');
const { resolve: resolvePath } = require('path');
const { spawn } = require('child_process');
const flowBinPath = require('flow-bin');

process.env.PATH += ':./node_modules/.bin';

const cmd = resolvePath(__dirname);
const srcDir = resolvePath(cmd, './src');

function exec(command, options) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, options, {
      cmd,
      env: process.env,
      stdio: 'inherit',
    });
    child.on('exit', code => {
      if (code === 0) {
        resolve(true);
      } else {
        reject(new Error('Error code: ' + code));
      }
    });
  });
}

function isJS(filepath) {
  return filepath.indexOf('.js') === filepath.length - 3;
}

function isTest(filepath) {
  return isJS(filepath) && filepath.indexOf('__tests__/') !== -1;
}

let needsCheck;
let timeout;

function startWatch() {
  process.stdout.write(CLEARSCREEN + green(invert('watching...')));
}

function debouncedCheck() {
  needsCheck = true;
  clearTimeout(timeout);
  timeout = setTimeout(() => {
    if (typeof guardedCheck === 'function') {
      guardedCheck();
    }
  }, 250);
}

function initializeWatcher() {
  const flowServer = spawn(flowBinPath, ['server'], {
    cmd,
    env: process.env,
  });

  const watcher = sane(srcDir, { glob: ['**/*.js'] })
    .on('ready', startWatch)
    .on('add', changeFile)
    .on('delete', deleteFile)
    .on('change', changeFile);

  process.on('SIGINT', () => {
    watcher.close();
    flowServer.kill();
    console.log(CLEARLINE + yellow(invert('stopped watching')));
    process.exit();
  });
}

if (require.main === module) {
  initializeWatcher();
}

module.exports = {
  exec,
  isJS,
  isTest,
  debouncedCheck,
  startWatch,
  initializeWatcher,
};
