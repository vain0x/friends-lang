/**
 * Throws an exception.
 * Use of this indicates that lack of coding.
 */
export const todo = (): never => {
  throw new Error('Not implemented.');
};

/**
 * Statically asserts that it exhausted all possibilities of the specified value
 * by checking its type is never.
 */
export const exhaust = (value: never): never => value;
