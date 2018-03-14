import * as assert from 'assert';
import { message } from './awesome';

describe('awesome', () => {
  it('message', () => {
    assert.ok(message().indexOf('Hello') >= 0);
  });
});
