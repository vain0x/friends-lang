import { TestSuite } from './testing-types';

export function* flatMap<X, Y>(xs: Iterable<X>, f: (x: X) => Iterable<Y>): Iterable<Y> {
  for (const x of xs) {
    for (const y of f(x)) {
      yield y;
    }
  }
}

export function* distinct<X>(xs: Iterable<X>): Iterable<X> {
  const set = new Set<X>();
  for (const x of xs) {
    if (set.has(x)) {
      continue;
    }
    set.add(x);
    yield x;
  }
}

export const testSuite: TestSuite = ({ describe, context, it, eq }) => {
  describe('distinct', () => {
    it('works', () => {
      eq([1, 2, 3], [...distinct([1, 2, 1, 3, 2])]);
    });
  });
};
