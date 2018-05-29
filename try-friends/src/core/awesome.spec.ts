import * as assert from 'assert';
import { AppTerm, Term, Var, VarTerm } from './ast';
import { message } from './awesome';
import { tests as evaluatingTests, TestTools } from './evaluating';
import { tryParse } from './parsing';

const testTools: TestTools = {
  describe(description: string, body: (this: void) => void) {
    describe(description, body);
  },
  context(description: string, body: (this: void) => void) {
    context(description, body);
  },
  it(description: string, body: (this: void) => void) {
    it(description, body);
  },
  eq: assert.deepStrictEqual,
};

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

describe('evaluating', () => {
  evaluatingTests(testTools);
});
