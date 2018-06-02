/**
 * A set of tools for unit testing.
 */
export interface TestTools {
  describe: (description: string, body: (this: void) => void) => void;
  context: (description: string, body: (this: void) => void) => void;
  it: (description: string, body: (this: void) => void) => void;
  eq: <T>(actual: T, expected: T) => void;
}

export type TestSuite = (testTools: TestTools) => void;
