import * as assert from 'assert';
import { message } from './awesome';
import { tryParse } from './parsing';

describe('awesome', () => {
  it('message', () => {
    assert.ok(message().indexOf('Hello') >= 0);
  });
});

describe('parsing', () => {
  it('can parse sugoi statement', () => {
    assert.deepEqual({ subject: 'あなた', predicate: '定命の' }, tryParse('すごーい！ あなた は 定命の フレンズ なんだね！ '));
  });
});
