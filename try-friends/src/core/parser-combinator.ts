// Parser combinator.

import { None, Option, Some } from './option';

export interface Source {
  str: string;
  lines: string[];
}

/// 0-indexed
export interface Position {
  line: number;
  column: number;
  index: number;
}

interface ParserResultSuccess<T> {
  ok: true;
  value: T;
}

interface ParserResultFailure<U> {
  ok: false;
  error: ParserError<U>;
}

export type ParserResult<T, U> =
  ParserResultSuccess<T>
  | ParserResultFailure<U>;

export interface ParserContext<U> {
  source: Source;
  pos: Position;
  u: U;
  warning: Array<ParserError<U>>;
  cut: boolean;
}

export interface ParserError<U> {
  source: Source;
  pos: Position;
  u: U;
  label: string;
  children: Array<ParserError<U>>;
}

type P<X, U> = Parser<X, U>;
type C<U> = ParserContext<U>;
type E<U> = ParserError<U>;
type R<X, U> = ParserResult<X, U>;
type PF<X, U> = (c: C<U>) => [R<X, U>, C<U>];

export class Parser<X, U> {
  constructor(private readonly parseFn: PF<X, U>) {
  }

  public map<Y>(f: (value: X) => Y): Parser<Y, U> {
    return parser(context => {
      const [r, c] = this.parse(context);
      if (!r.ok) {
        return [r, c];
      }
      return [{ ok: true, value: f(r.value) }, c];
    });
  }

  public withLabel(label: string): Parser<X, U> {
    return parser(context => {
      const [r, c] = this.parse(context);
      if (!r.ok) {
        return [{ ok: false, error: { ...r.error, label } }, c];
      }
      return [r, c];
    });
  }

  public filter(f: (value: X) => boolean, label: string): Parser<X, U> {
    return parser(context => {
      const [r, c] = this.parse(context);
      if (r.ok && !f(r.value)) {
        return failure(label, context);
      }
      return [r, c];
    });
  }

  public discard(): Parser<None, U> {
    return this.map(_ => None);
  }

  public and<Y>(second: Parser<Y, U>): Parser<[X, Y], U> {
    return parser(context => {
      const [r1, c1] = this.parse(context);
      if (!r1.ok) {
        return [r1, c1];
      }

      const [r2, c2] = second.parse(c1);
      if (!r2.ok) {
        return [r2, c2];
      }

      return success([r1.value, r2.value] as [X, Y], c2);
    });
  }

  public andL<Y>(second: Parser<Y, U>): Parser<X, U> {
    return this.and(second).map(([l, r]) => l);
  }

  public andR<Y>(second: Parser<Y, U>): Parser<Y, U> {
    return this.and(second).map(([l, r]) => r);
  }

  public andA<Y>(second: Parser<Y, U>): Parser<X & Y, U> {
    return this.and(second).map(([l, r]) => Object.assign({}, l, r));
  }

  public many(): Parser<X[], U> {
    return parser(context => {
      let current = context;
      const xs: X[] = [];

      while (true) {
        const [r, next] = this.parse(current);

        if (!r.ok) {
          return success(xs, current);
        }

        xs.push(r.value);
        current = next;
      }
    });
  }

  public opt(): Parser<Option<X>, U> {
    return choice<Option<X>, U>([
      this.map(Some),
      successP<None, U>(None),
    ]);
  }

  public attempt(): Parser<X, U> {
    return parser(context => {
      const [r, next] = this.parse(context);
      return [r, { ...next, cut: false }];
    });
  }

  public nonempty(): Parser<X, U> {
    return parser(context => {
      const [r, next] = this.parse(context);
      if (r.ok && next.pos.index === context.pos.index) {
        return failure('any character', context);
      }
      return [r, next];
    });
  }

  public parse(context: C<U>): [R<X, U>, C<U>] {
    return this.parseFn(context);
  }
}

export const parser = <X, U>(parseFn: PF<X, U>): Parser<X, U> => {
  return new Parser<X, U>(parseFn);
};

export const parse = <X, Y, U>(arg: { source: string, u: U, parser: P<X, U> }): R<X, U> => {
  const { source, u, parser: p } = arg;
  const context = newContext({ source, u });
  const [result, _] = p.parse(context);
  return result;
};

const newSource = (str: string): Source => {
  if (str.includes('\r')) {
    str = str.split('\r\n').join('\n');
  }
  return { str, lines: str.split('\n') };
};

const zeroPos: Position = {
  index: 0,
  line: 0,
  column: 0,
};

const newContext = <U>(p: { source: string, u: U }): C<U> => {
  return {
    source: newSource(p.source),
    pos: zeroPos,
    u: p.u,
    warning: [],
    cut: true,
  };
};

const advance = <U>(len: number, context: C<U>): C<U> => {
  const str = context.source.str;
  let { line, column, index } = context.pos;

  for (let i = 0; i < len; i++) {
    if (str[index] === '\n') {
      line++;
      column = 0;
    } else {
      column++;
    }

    index++;
  }

  return {
    ...context,
    pos: {
      line,
      column,
      index,
    },
  };
};

const success = <X, U>(value: X, context: C<U>): [R<X, U>, C<U>] => {
  const r: R<X, U> = {
    ok: true,
    value,
  };
  return [r, context];
};

const failure = <X, U>(label: string, context: C<U>, children?: Array<E<U>>): [R<X, U>, C<U>] => {
  const r: R<X, U> = {
    ok: false,
    error: {
      source: context.source,
      pos: context.pos,
      u: context.u,
      label,
      children: children !== undefined ? children : [],
    },
  };
  return [r, context];
};

export const successP = <T, U>(value: T): P<T, U> => parser(context => {
  return success(value, context);
});

export const endOfInputP = <U>(): P<None, U> => parser(context => {
  const { source: { str }, pos: { index } } = context;
  if (index < str.length) {
    return failure('終端', context);
  } else {
    return success(None, context);
  }
});

export const expect = <U>(pattern: string): P<string, U> => parser(context => {
  const { source: { str }, pos: { index: sourceIndex } } = context;
  for (let i = 0; i < pattern.length; i++) {
    const j = sourceIndex + i;
    if (j >= str.length || pattern[i] !== str[j]) {
      return failure(pattern, advance(i, context));
    }
  }

  return success(pattern, advance(pattern.length, context));
});

export const choice = <X, U>(ps: Array<P<X, U>>): P<X, U> => parser(context => {
  const es: Array<E<U>> = [];

  for (const p of ps) {
    const [r, next] = p.parse(context);

    if (r.ok) {
      return [r, { ...next, cut: true }];
    }

    es.push(r.error);

    if (next.cut) {
      break;
    }
  }

  return failure('いずれか', context, es);
});

const regexpP = <U>(matcher: RegExp) => parser<string, U>(context => {
  const { source: { str }, pos: { index: startIndex } } = context;
  let index = startIndex;

  while (index < str.length) {
    const c = String.fromCodePoint(str.codePointAt(index)!);
    const ms = c.match(matcher);
    if (ms === null || ms.length === 0 || ms[0].length === 0) {
      break;
    }
    index += ms[0].length;
  }

  return success(
    str.substring(startIndex, index),
    advance(index - startIndex, context),
  );
});

export const spaceP = <U>(): P<None, U> =>
  regexpP<U>(/^\s/u).map(_ => None);

export const wordP = <U>(): P<string, U> =>
  regexpP<U>(/^[\w\d_あ-んア-ン一-龠々〆]/u).nonempty().withLabel('単語');

export const recursiveP = <T, U>(): [P<T, U>, (p: P<T, U>) => void] => {
  let inner: P<T, U>;
  const set = (p: P<T, U>) => { inner = p; };
  const proxy = parser<T, U>(context => inner.parse(context));
  return [proxy, set];
};

export const makeErrorMessage = (error: ParserError<{}>): string[] => {
  const { label, source: { lines }, pos: { line, column }, children } = error;
  const near = lines[line].substring(column - 4, column + 4);
  const ls = [
    `${label} ${1 + line}行目 ${1 + column}文字目《${near}》付近`,
  ];
  for (const c of children) {
    for (const l of makeErrorMessage(c)) {
      ls.push('    ' + l);
    }
  }
  return ls;
};
