import { message } from './awesome';
import { TestSuite } from './testing-types';

export const testSuite: TestSuite = ({ describe, context, it, eq }) => {
  it('message', () => {
    eq(true, message().indexOf('Hello') >= 0);
  });
};
