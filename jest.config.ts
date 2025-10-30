const _ = process;

// @ts-expect-error we need to put this inside jest.config.js,
// since it's being read before the process object is replaced by the jest runner.
// More info:
// https://johann.pardanaud.com/blog/how-to-assert-unhandled-rejection-and-uncaught-exception-with-jest/
// https://github.com/jestjs/jest/issues/5620
// https://github.com/jestjs/jest/issues/11165
// https://codesandbox.io/p/devbox/z9qdp4?migrateFrom=zzjfzz
global._onUnhandledRejection = handler => {
  _.on('unhandledRejection', handler);
};

import { createDefaultEsmPreset } from 'ts-jest/dist/presets/create-jest-preset.js';

const tsJestTransformCfg = createDefaultEsmPreset().transform;

/** @type {import("jest").Config} **/
export default {
  testEnvironment: 'node',
  transform: {
    ...tsJestTransformCfg,
  },
  extensionsToTreatAsEsm: ['.ts'],
  waitForUnhandledRejections: true,
  testMatch: ['**/*.test.ts'],
};
