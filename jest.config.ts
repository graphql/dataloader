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
