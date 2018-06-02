import * as assert from 'assert';
import { TestSuite, TestTools } from './testing-types';

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

export const runTests = (testSuites: { [name: string]: TestSuite | undefined; }) => {
  for (const name of Object.keys(testSuites)) {
    describe(name, () => {
      const suite = testSuites[name];
      if (suite !== undefined) {
        suite(testTools);
      }
    });
  }
};
