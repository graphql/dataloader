/**
 * Copyright (c) 2019-present, GraphQL Foundation
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import DataLoader from '../index.ts';
import { describe, it, expect, jest } from '@jest/globals';

describe.skip('Unhandled rejections', () => {
  it('Not catching a primed error is an unhandled rejection', async () => {
    const handler = jest.fn();
    // @ts-expect-error need to use injected _onUnhandledRejection as the original process.on may have been overridden by Jest
    global._onUnhandledRejection(handler);

    const identityLoader = new DataLoader<number, number>(async keys => keys);
    identityLoader.prime(1, new Error('Error: 1'));

    const promise = identityLoader.load(1);

    await new Promise(resolve => setTimeout(resolve, 1000));
    expect(handler).toHaveBeenCalled();

    // Prevent Jest from complaining about the unhandled rejection
    promise.catch(() => {});
  });
});
