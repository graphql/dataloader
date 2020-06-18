/**
 * Copyright (c) 2019-present, GraphQL Foundation
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

const DataLoader = require('..');

describe('Unhandled rejections', () => {
  it('Not catching a primed error is an unhandled rejection', async () => {
    let hadUnhandledRejection = false;
    // Override Jest's unhandled detection
    global.jasmine.process.removeAllListeners('unhandledRejection');
    global.jasmine.process.on('unhandledRejection', () => {
      hadUnhandledRejection = true;
    });

    const identityLoader = new DataLoader<number, number>(async keys => keys);

    identityLoader.prime(1, new Error('Error: 1'));

    // Ignore result.
    identityLoader.load(1);

    await new Promise(resolve => setTimeout(resolve, 10));
    expect(hadUnhandledRejection).toBe(true);
  });
});
