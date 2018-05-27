import * as assert from 'assert';

export interface Assertion {
  strictEqual<T>(actual: T, expected: T): void;
}

export const unitTests = (callback: (assert: Assertion) => void) => {
  callback(assert);
};
