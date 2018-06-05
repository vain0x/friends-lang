// Parser combinator.

import { ok as assertOk } from 'assert';
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
  message: string;
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
    return this.and(second).map(([l, r]) => Object.assign(l, r));
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
        return failure('Expected any character is consumed here.', context);
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

const parserError = <U>(message: string, context: C<U>): E<U> => {
  return {
    source: context.source,
    pos: context.pos,
    u: context.u,
    message,
  };
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

const successResult = <X, U>(value: X, context: C<U>): R<X, U> => {
  return {
    ok: true,
    value,
  };
};

const success = <X, U>(value: X, context: C<U>): [R<X, U>, C<U>] => {
  return [successResult(value, context), context];
};

const failureResult = <U>(message: string, context: C<U>): R<never, U> => {
  return {
    ok: false,
    error: parserError(message, context),
  };
};

const failure = <X, U>(message: string, context: C<U>): [R<X, U>, C<U>] => {
  return [failureResult(message, context), context];
};

export const endOfInput = <U>(): P<None, U> => parser(context => {
  const { source: { str }, pos: { index } } = context;
  if (index < str.length) {
    return failure('Expected an end of input.', context);
  } else {
    return success(None, context);
  }
});

export const expect = <U>(pattern: string): P<string, U> => parser(context => {
  const { source: { str }, pos: { index: sourceIndex } } = context;
  for (let i = 0; i < pattern.length; i++) {
    const j = sourceIndex + i;
    if (j >= str.length || pattern[i] !== str[j]) {
      return failure(`Expected '${pattern}'.`, advance(i, context));
    }
  }

  return success(pattern, advance(pattern.length, context));
});

export const choice = <X, U>(ps: Array<P<X, U>>): P<X, U> => parser(context => {
  const es: Array<R<X, U>> = [];

  for (const p of ps) {
    const [r, next] = p.parse(context);

    if (r.ok) {
      return [r, next];
    }

    if (next.cut) {
      break;
    }

    es.push(r);
  }

  return failure(`Expected one of (..).`, context);
});

export const seq = <X, U>(ps: Array<P<X, U>>): P<X[], U> => parser(context => {
  const xs: X[] = [];
  let current = context;

  for (const p of ps) {
    const [r, next] = p.parse(current);
    if (!r.ok) {
      return [r, next];
    }

    xs.push(r.value);
    current = next;
  }

  return success(xs, current);
});

export const spaceP = <U>(): P<None, U> => parser(context => {
  const { source: { str }, pos: { index: startIndex } } = context;
  const PART = 8;
  let index = startIndex;

  while (true) {
    const near = str.substring(index, index + PART);
    const ms = near.match(/^\s*/);
    if (ms === null || ms.length === 0) {
      break;
    }

    const length = ms[0].length;
    index += length;

    if (length < PART) {
      break;
    }

    break;
  }

  return success(None, advance(index - startIndex, context));
});

export const wordP = <U>(): P<string, U> => parser(context => {
  const { source: { lines }, pos: { line, column } } = context;
  const near = lines[line].substring(column);
  const ms = near.match(/^[\w\d_あ-んア-ン]+/); // FIXME: Should Hakase recognize Kanjis?
  if (ms === null || ms.length === 0) {
    return failure('Expected a word.', context);
  }

  const word = ms[0];
  return success(word, advance(word.length, context));
});

export const recursiveP = <T, U>(): [P<T, U>, (p: P<T, U>) => void] => {
  let inner: P<T, U>;
  const set = (p: P<T, U>) => { inner = p; };
  const proxy = parser<T, U>(context => inner.parse(context));
  return [proxy, set];
};
