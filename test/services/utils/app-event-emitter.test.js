import {AppEventEmitter} from '../../../src/index.js';

describe('AppEventEmitter test', () => {
  test('HDS', async () => {
    AppEventEmitter.subscribe('customEvent', (arg1, arg2) => {
      expect(arg1).toBe(69);
      expect(arg2).toBe(420);
    });

    AppEventEmitter.publish('customEvent', 69, 420);
  });
});
