export function* flatMap<X, Y>(xs: Iterable<X>, f: (x: X) => Iterable<Y>): Iterable<Y> {
  for (const x of xs) {
    for (const y of f(x)) {
      yield y;
    }
  }
}
