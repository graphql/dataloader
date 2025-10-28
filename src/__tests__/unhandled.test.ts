/**
 * Copyright (c) 2019-present, GraphQL Foundation
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import DataLoader from '../index.ts';
import { describe, it, expect, jest } from '@jest/globals';
import process from 'node:process';

describe('Unhandled rejections', () => {
  it('Not catching a primed error is an unhandled rejection', async () => {
    //process.removeAllListeners('unhandledRejection');
    const handler = jest.fn();
    process.on('unhandledRejection', handler); //detectOpenHandles

    const identityLoader = new DataLoader<number, number>(async keys => keys);
    identityLoader.prime(1, new Error('Error: 1'));

    // Ignore result.
    const promise = identityLoader.load(1);

    await new Promise(resolve => setTimeout(resolve, 1000));
    expect(handler).toHaveBeenCalled();
    promise.catch(() => {});
  });
});
