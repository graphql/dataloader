// Test generated using Keploy v2.4.1

const { exec } = require('../watch');
const { spawn } = require('child_process');
const { isJS } = require('../watch');
const { isTest } = require('../watch');
const { debouncedCheck } = require('../watch');
const { startWatch } = require('../watch');

jest.mock('child_process', () => ({
  spawn: jest.fn(),
}));

test('exec resolves on successful child process exit', async () => {
  const mockChildProcess = {
    on: jest.fn((event, callback) => {
      if (event === 'exit') {
        callback(0);
      }
    }),
  };
  spawn.mockReturnValue(mockChildProcess);

  const result = await exec('mockCommand', ['mockOption']);
  expect(result).toBe(true);
});

jest.mock('child_process', () => ({
  spawn: jest.fn(),
}));

test('exec rejects on child process exit with error code', async () => {
  const mockChildProcess = {
    on: jest.fn((event, callback) => {
      if (event === 'exit') {
        callback(1);
      }
    }),
  };
  spawn.mockReturnValue(mockChildProcess);

  await expect(exec('mockCommand', ['mockOption'])).rejects.toThrow('Error code: 1');
});

test('isJS identifies JavaScript files', () => {
  expect(isJS('file.js')).toBe(true);
  expect(isJS('file.jsx')).toBe(false);
  expect(isJS('file.txt')).toBe(false);
  expect(isJS('folder/file.js')).toBe(true);
});

test('isTest identifies test files', () => {
  expect(isTest('__tests__/file.test.js')).toBe(true);
  expect(isTest('src/file.js')).toBe(false);
  expect(isTest('__tests__/file.js')).toBe(true);
  expect(isTest('tests/file.js')).toBe(false);
});

jest.useFakeTimers();

test('debouncedCheck schedules guardedCheck', () => {
  const mockGuardedCheck = jest.fn();
  global.guardedCheck = mockGuardedCheck; // Mock the undefined function
  debouncedCheck();
  expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), 250);
  jest.runAllTimers();
  expect(mockGuardedCheck).toHaveBeenCalled();
});

beforeEach(() => {
  jest.spyOn(process.stdout, 'write').mockImplementation(() => {});
});

afterEach(() => {
  process.stdout.write.mockRestore();
});

test('startWatch outputs correct message', () => {
  const CLEARSCREEN = '\u001b[2J';
  const green = (text) => `\u001b[32m${text}\u001b[39m`;
  const invert = (text) => `\u001b[7m${text}\u001b[27m`;

  global.CLEARSCREEN = CLEARSCREEN; // Mock undefined variables
  global.green = green;
  global.invert = invert;

  startWatch();
  expect(process.stdout.write).toHaveBeenCalledWith(
    CLEARSCREEN + green(invert('watching...'))
  );
});

