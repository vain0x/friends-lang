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
    assert.deepEqual({ type: 'sugoi', subject: 'あなた', predicate: '定命の' }, tryParse('すごーい！ あなた は 定命の フレンズ なんだね！ '));
  });

  it('can parse nandakke statement', () => {
    assert.deepEqual({ type: 'nandakke', subject: 'あなた', predicate: '定命の' }, tryParse('あなた は 定命の フレンズ なんだっけ？ '));
  });
});
