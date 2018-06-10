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

interface ParserResultFailure {
  ok: false;
  error: ParserError;
}

export type ParserResult<T> =
  ParserResultSuccess<T>
  | ParserResultFailure;

export interface ParserContext {
  source: Source;
  pos: Position;
  warning: ParserError[];
  cut: boolean;
}

export interface ParserError {
  source: Source;
  pos: Position;
  label: string;
  children: ParserError[];
}

type P<X> = Parser<X>;
type C = ParserContext;
type E = ParserError;
type R<X> = ParserResult<X>;
type PF<X> = (c: C) => [R<X>, C];

export class Parser<X> {
  constructor(private readonly parseFn: PF<X>) {
  }

  public map<Y>(f: (value: X) => Y): Parser<Y> {
    return parser(context => {
      const [r, c] = this.parse(context);
      if (!r.ok) {
        return [r, c];
      }
      return [{ ok: true, value: f(r.value) }, c];
    });
  }

  public withLabel(label: string): Parser<X> {
    return parser(context => {
      const [r, c] = this.parse(context);
      if (!r.ok) {
        return [{ ok: false, error: { ...r.error, label } }, c];
      }
      return [r, c];
    });
  }

  public filter(f: (value: X) => boolean, label: string): Parser<X> {
    return parser(context => {
      const [r, c] = this.parse(context);
      if (r.ok && !f(r.value)) {
        return failure(label, context);
      }
      return [r, c];
    });
  }

  public discard(): Parser<None> {
    return this.map(_ => None);
  }

  public and<Y>(second: Parser<Y>): Parser<[X, Y]> {
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

  public andL<Y>(second: Parser<Y>): Parser<X> {
    return this.and(second).map(([l, r]) => l);
  }

  public andR<Y>(second: Parser<Y>): Parser<Y> {
    return this.and(second).map(([l, r]) => r);
  }

  public andA<Y>(second: Parser<Y>): Parser<X & Y> {
    return this.and(second).map(([l, r]) => Object.assign({}, l, r));
  }

  public many(): Parser<X[]> {
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

  public opt(): Parser<Option<X>> {
    return choice<Option<X>>([
      this.map(Some),
      successP<None>(None),
    ]);
  }

  public attempt(): Parser<X> {
    return parser(context => {
      const [r, next] = this.parse(context);
      return [r, { ...next, cut: false }];
    });
  }

  public nonempty(): Parser<X> {
    return parser(context => {
      const [r, next] = this.parse(context);
      if (r.ok && next.pos.index === context.pos.index) {
        return failure('any character', context);
      }
      return [r, next];
    });
  }

  public parse(context: C): [R<X>, C] {
    return this.parseFn(context);
  }
}

export const parser = <X>(parseFn: PF<X>): Parser<X> => {
  return new Parser<X>(parseFn);
};

export const parse = <X, Y>(arg: { source: string, parser: P<X> }): R<X> => {
  const { source, parser: p } = arg;
  const context = newContext({ source });
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

const newContext = (p: { source: string }): C => {
  return {
    source: newSource(p.source),
    pos: zeroPos,
    warning: [],
    cut: true,
  };
};

const advance = (len: number, context: C): C => {
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

const success = <X>(value: X, context: C): [R<X>, C] => {
  const r: R<X> = {
    ok: true,
    value,
  };
  return [r, context];
};

const failure = <X>(label: string, context: C, children?: E[]): [R<X>, C] => {
  const r: R<X> = {
    ok: false,
    error: {
      source: context.source,
      pos: context.pos,
      label,
      children: children !== undefined ? children : [],
    },
  };
  return [r, context];
};

export const successP = <T>(value: T): P<T> => parser(context => {
  return success(value, context);
});

export const endOfInputP = (): P<None> => parser(context => {
  const { source: { str }, pos: { index } } = context;
  if (index < str.length) {
    return failure('終端', context);
  } else {
    return success(None, context);
  }
});

export const expect = (pattern: string): P<string> => parser(context => {
  const { source: { str }, pos: { index: sourceIndex } } = context;
  for (let i = 0; i < pattern.length; i++) {
    const j = sourceIndex + i;
    if (j >= str.length || pattern[i] !== str[j]) {
      return failure(pattern, advance(i, context));
    }
  }

  return success(pattern, advance(pattern.length, context));
});

export const choice = <X>(ps: Array<P<X>>): P<X> => parser(context => {
  const es: E[] = [];

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

const regexpP = (matcher: RegExp) => parser<string>(context => {
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

export const spaceP = (): P<None> =>
  regexpP(/^\s/u).map(_ => None);

export const wordP = (): P<string> =>
  regexpP(/^[\w\d_あ-んア-ン一-龠々〆]/u).nonempty().withLabel('単語');

export const recursiveP = <T>(): [P<T>, (p: P<T>) => void] => {
  let inner: P<T>;
  const set = (p: P<T>) => { inner = p; };
  const proxy = parser<T>(context => inner.parse(context));
  return [proxy, set];
};

export const makeErrorMessage = (error: E): string[] => {
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
