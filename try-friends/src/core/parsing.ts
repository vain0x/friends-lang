import { AtomTerm, ConjProp, PredProp, Prop, Query, Rule, Term, VarTerm } from './ast';
import { None, Option, Some } from './option';
import {
  choice,
  endOfInput,
  expect,
  parse,
  Parser,
  parser,
  ParserError,
  recursiveP,
  spaceP,
  successP,
  wordP,
} from './parser-combinator';
import { TestSuite } from './testing-types';

const blankP = spaceP();
const boundaryP = blankP;
const identP = wordP();

const hagamoP = identP.filter(w => 'はがも'.includes(w), 'は/が/も');

const varIdents = new Set([
  'あなた', 'きみ', 'かれ', 'かのじょ', 'だれ',
  'なに', 'あれ', 'これ', 'これら', 'それ', 'それら',
]);

// pred nandane
// pred (de conj)* nara pred nandane

// Syntax:
// statement = sugoi conj (nara conj)? nandane | conj nandesuka
// conj = pred (de conj)*
// pred = term ha p friends
// term = (atom | var | (term)) (no atom)* (to term)* toka?

const varOrAtomP: Parser<VarTerm | AtomTerm, {}> = identP.map(ident => {
  if (ident.startsWith('_') || varIdents.has(ident)) {
    return { var: { varName: ident, varId: -1 } };
  } else {
    return { atom: ident };
  }
});

const [termP, initTermP] = recursiveP<Term, {}>();

const groupTermP =
  expect('「').attempt().andR(blankP)
    .andR(termP).andL(blankP)
    .andL(expect('」'));

const expectIdentP = (ident: string) =>
  identP.filter(x => x === ident, `Expected '${ident}'.`);

const appsP =
  (expectIdentP('の').attempt().andL(blankP).andR(identP))
    .many()
    .map(apps => ({ apps }));

const termPCore: Parser<Term, {}> =
  choice([
    groupTermP,
    varOrAtomP,
  ]).map(term => ({ term }))
    .andA(appsP)
    .map(({ term, apps }) => {
      // t no f no g -> g (f t)
      for (let i = apps.length - 1; i >= 0; i--) {
        term = { f: apps[i], x: term };
      }
      return term;
    });

const subjectP = termP.map(term => ({ term }));
const predP = identP.map(pred => ({ pred }));

const propP =
  subjectP.andL(blankP)
    .andL(hagamoP).andL(blankP)
    .andA(predP).andL(blankP)
    .andL(expect('フレンズ'));

const dePropsP =
  expectIdentP('で').attempt().andR(blankP).andR(propP).andL(blankP)
    .many()
    .map(deProps => ({ deProps }));

const makeConjProp = (props: Prop[]): Prop => {
  // [p, q, r] -> p && (q && r)
  let conj: Prop = props[props.length - 1];
  for (let i = props.length - 2; i >= 0; i--) {
    conj = { left: props[i], right: conj };
  }
  return conj;
};

const conjPropP: Parser<Prop, {}> =
  propP.map(first => ({ first })).andL(blankP)
    .andA(dePropsP)
    .map(({ first, deProps }) => makeConjProp([first, ...deProps]));

const axiomBodyP: Parser<{ head: undefined, deProps: Prop[] }, {}> =
  expect('なんだね！').attempt().map(() => ({ head: undefined, deProps: [] }));

const inferP: Parser<{ head: PredProp | undefined, deProps: Prop[] }, {}> =
  dePropsP.andL(blankP)
    .andL(expectIdentP('なら'))
    .andA(propP.map(head => ({ head }))).andL(blankP)
    .andL(expect('なんだね！'));

const ruleStatementP: Parser<Rule, {}> =
  expect('すごーい！').attempt().andR(blankP)
    .andR(propP.map(first => ({ first }))).andL(blankP)
    .andA(choice([
      axiomBodyP,
      inferP,
    ]))
    .map(body => body.head === undefined
      ? { head: body.first }
      : { head: body.head, goal: makeConjProp([body.first, ...body.deProps]) },
    );

const queryStatementP: Parser<Query, {}> =
  conjPropP.map(query => ({ query })).andL(blankP)
    .andL(choice([
      expect('なんですか？'),
      expect('なんだっけ？'),
    ])).andL(blankP);

const statementP =
  blankP
    .andR(choice<Rule | Query, {}>([
      ruleStatementP,
      queryStatementP,
    ]))
    .andL(blankP)
    .andL(endOfInput());

initTermP(termPCore);

const makeErrorMessage = (error: ParserError<{}>): string[] => {
  const { label, source: { lines }, pos: { line, column }, children } = error;
  const near = lines[line].substring(0, column);
  const ls = [
    `${label} at ${1 + line} line, ${1 + column} column near '${near}'`,
  ];
  for (const c of children) {
    for (const l of makeErrorMessage(c)) {
      ls.push('    ' + l);
    }
  }
  return ls;
};

export const tryParse = (source: string) => {
  const r = parse({ source, u: 0, parser: statementP });
  if (!r.ok) {
    throw new Error(`Parse Error. Expected:\n${makeErrorMessage(r.error).join('\n')}`);
  }
  return r.value;
};

export const testSuite: TestSuite = ({ describe, context, it, eq }) => {
  it('can parse rule statement', () => {
    eq(
      { head: { term: { var: { varName: 'あなた', varId: -1 } }, pred: '定命の' } },
      tryParse('すごーい！ あなた は 定命の フレンズ なんだね！'),
    );
  });

  it('can parse group term', () => {
    eq(
      { head: { term: { atom: 'ソクラテスさん' }, pred: '定命の' } },
      tryParse('すごーい！ 「「 ソクラテスさん 」」 は 定命の フレンズ なんだね！'),
    );
  });

  it('can parse query statement', () => {
    eq(
      { query: { term: { atom: 'ソクラテスさん' }, pred: '定命の' } },
      tryParse('ソクラテスさん　は\r\n\t定命の フレンズ なんですか？ '),
    );
  });

  it('can parse conjunction', () => {
    eq(
      {
        query: {
          left: { term: { atom: 'ソクラテスさん' }, pred: '定命の' },
          right: {
            left: { term: { atom: 'ソクラテスさん' }, pred: '人間の' },
            right: { term: { atom: 'プラトンさん' }, pred: '師匠の' },
          },
        },
      },
      tryParse('ソクラテスさん は 定命の フレンズ で ソクラテスさん は 人間の フレンズ で プラトンさん が 師匠の フレンズ なんですか？'),
    );
  });
};
