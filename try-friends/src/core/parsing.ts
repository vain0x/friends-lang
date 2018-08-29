import { AtomTerm, ConjProp, LangParser, nilTerm, PredProp, Prop, Query, Rule, Statement, Term, VarTerm } from './ast';
import { None, Option, Some } from './option';
import {
  choice,
  endOfInputP,
  expect,
  makeErrorMessage,
  Parser,
  recursiveP,
  restOfLineP,
  runParser,
  spaceP,
  wordP,
} from './parser-combinator';
import { TestSuite } from './testing-types';

interface RuleStatementBody {
  head: PredProp | undefined;
  deProps: Prop[];
}

const varIdents = new Set([
  'あなた', 'きみ', 'かれ', 'かのじょ', 'だれ',
  'なに', 'あれ', 'これ', 'これら', 'それ', 'それら',
]);

const makeAppTerm = ({ term, apps }: { term: Term, apps: string[] }): { term: Term } => {
  // t no f no g -> g (f t)
  for (let i = apps.length - 1; i >= 0; i--) {
    term = { f: apps[i], x: term };
  }
  return { term };
};

const makeListTerm = (
  { term, items, tailed }: {
    term: Term,
    items: Array<{ term: Term }>,
    tailed: boolean,
  },
): { term: Term } => {
  if (items.length === 0) {
    return { term };
  }

  let i = items.length - 1;
  let t: Term;
  if (tailed) {
    t = items[i].term;
    i--;
  } else {
    t = nilTerm;
  }
  for (; i >= 0; i--) {
    t = { head: items[i].term, tail: t };
  }
  t = { head: term, tail: t };
  return { term: t };
};

const makeConjProp = (props: Prop[]): Prop => {
  // [p, q, r] -> p && (q && r)
  let conj: Prop = props[props.length - 1];
  for (let i = props.length - 2; i >= 0; i--) {
    conj = { left: props[i], right: conj };
  }
  return conj;
};

// Syntax:
// statement = sugoi conj (nara conj)? nandane | conj nandesuka
// conj = prop (de conj)*
// prop = term ha pred friends
// term = (atom | var | (term)) (no atom)* (to term (to term)* toka?)

const [termP, initTermP] = recursiveP<{ term: Term }>();
const [appTermP, initAppTermP] = recursiveP<{ term: Term }>();

const commentP = expect('//').attempt().andR(restOfLineP());
const blankP = spaceP().andL(commentP.andR(spaceP()).many());
const identP = wordP();

const expectIdentP = (ident: string) =>
  identP.filter(x => x === ident, ident);

const hagamoP = identP.filter(w => 'はがも'.includes(w), 'は/が/も');

const predP = identP.map(pred => ({ pred }));

const varOrAtomP: Parser<{ term: VarTerm | AtomTerm }> =
  identP.map(ident => {
    if (ident.startsWith('_') || varIdents.has(ident)) {
      return { term: { var: { varName: ident, varId: -1 } } };
    } else {
      return { term: { atom: ident } };
    }
  });

const groupTermP =
  expect('「').attempt().andR(blankP)
    .andR(termP).andL(blankP)
    .andL(expect('」'));

const appsP =
  (expectIdentP('の').attempt().andL(blankP).andR(identP))
    .many()
    .map(apps => ({ apps }));

const conssP =
  (
    expectIdentP('と').attempt().andL(blankP)
      .andR(appTermP).andL(blankP)
  ).many().map(items => ({ items }))
    .andA(expectIdentP('とか').attempt().opt().map(x => ({ tailed: x !== None })));

const makeAppTermP = (): Parser<{ term: Term }> =>
  choice([
    groupTermP,
    varOrAtomP,
  ]).andL(blankP)
    .andA(appsP)
    .map(makeAppTerm);

const makeTermP = (): Parser<{ term: Term }> =>
  appTermP.andL(blankP)
    .andA(conssP)
    .map(makeListTerm);

const propP =
  termP.andL(blankP)
    .andL(hagamoP).andL(blankP)
    .andA(predP).andL(blankP)
    .andL(expect('フレンズ'));

const dePropsP =
  (expectIdentP('で').attempt().andR(blankP)
    .andR(propP).andL(blankP)
  ).many()
    .map(deProps => ({ deProps }));

const conjPropP: Parser<Prop> =
  propP.map(first => ({ first })).andL(blankP)
    .andA(dePropsP)
    .map(({ first, deProps }) => makeConjProp([first, ...deProps]));

const headPropP = propP.map(head => ({ head }));

const axiomBodyP: Parser<RuleStatementBody> =
  expect('なんだね！').attempt()
    .map(() => ({ head: undefined, deProps: [] }));

const inferenceBodyP: Parser<RuleStatementBody> =
  dePropsP.andL(blankP)
    .andL(expectIdentP('なら').andR(blankP))
    .andA(headPropP).andL(blankP)
    .andL(expect('なんだね！'));

const ruleP: Parser<Rule> =
  expect('すごーい！').attempt().andR(blankP)
    .andR(propP.map(first => ({ first }))).andL(blankP)
    .andA(choice([
      axiomBodyP,
      inferenceBodyP,
    ]))
    .map(body => body.head === undefined
      ? { head: body.first }
      : { head: body.head, goal: makeConjProp([body.first, ...body.deProps]) },
  );

const queryP: Parser<Query> =
  conjPropP.map(query => ({ query })).andL(blankP)
    .andL(choice([
      expect('なんですか？'),
      expect('なんだっけ？'), // deprecated
    ])).andL(blankP);

const statementP =
  choice<Statement>([
    ruleP,
    queryP,
  ]);

const allP = <X>(p: Parser<X>): Parser<X> =>
  blankP.andR(p).andL(blankP).andL(endOfInputP());

initAppTermP(makeAppTermP());
initTermP(makeTermP());

const tryParse = (source: string): Statement | { err: string } => {
  const r = runParser({ source, parser: allP(statementP) });
  if (!r.ok) {
    return { err: `文法的に間違いがあります:\n${makeErrorMessage(r.error).join('\n')}` };
  }
  return r.value;
};

const parse = (source: string): Statement => {
  const r = tryParse(source);
  if ('err' in r) {
    throw new Error(r.err);
  }
  return r;
};

export class FriendsLangParser implements LangParser {
  public parse(source: string): Statement | { err: string; } {
    return tryParse(source);
  }
}

export const testSuite: TestSuite = ({ describe, context, it, eq }) => {
  const fv = (varName: string) => ({ varName, varId: -1 });
  const anata = { var: { varName: 'あなた', varId: -1 } };

  it('can parse axiom', () => {
    eq(
      { head: { term: { var: { varName: 'あなた', varId: -1 } }, pred: '定命の' } },
      parse('すごーい！ あなた は 定命の フレンズ なんだね！'),
    );
  });

  it('can parse inference rule', () => {
    eq(
      {
        head: {
          term: { var: { varName: 'あなた', varId: -1 } },
          pred: '定命の',
        },
        goal: {
          term: { var: { varName: 'あなた', varId: -1 } },
          pred: '人間の',
        },
      },
      parse('すごーい！ あなた が 人間の フレンズ なら あなた は 定命の フレンズ なんだね！'),
    );
  });

  it('can parse group term', () => {
    eq(
      { head: { term: { atom: 'ソクラテス' }, pred: '人間の' } },
      parse('すごーい！ 「「 ソクラテス 」」 は 人間の フレンズ なんだね！'),
    );
  });

  it('can parse list term', () => {
    eq(
      {
        head: {
          term: {
            head: { atom: 'ソクラテス' },
            tail: {
              head: { atom: 'プラトン' },
              tail: nilTerm,
            },
          },
          pred: '師弟の',
        },
      },
      parse('すごーい！ ソクラテス と プラトン は 師弟の フレンズ なんだね！'),
    );
  });

  it('can parse list with tail term', () => {
    eq(
      { head: { term: { head: { atom: 'ソクラテス' }, tail: anata }, pred: '哲学が得意な' } },
      parse('すごーい！ ソクラテス と あなた とか は 哲学が得意な フレンズ なんだね！'),
    );
  });

  it('can parse query', () => {
    eq(
      { query: { term: { atom: 'ソクラテスさん' }, pred: '定命の' } },
      parse('ソクラテスさん　は\r\n\t定命の フレンズ なんですか？ '),
    );
  });

  it('can parse conjunctive', () => {
    eq(
      {
        query: {
          left: { term: { atom: 'ソクラテスさん' }, pred: '定命の' },
          right: {
            left: { term: { atom: 'ソクラテスさん' }, pred: '人間の' },
            right: { term: { atom: 'プラトンさん' }, pred: '弟子の' },
          },
        },
      },
      parse('ソクラテスさん は 定命の フレンズ で ソクラテスさん は 人間の フレンズ で プラトンさん が 弟子の フレンズ なんですか？'),
    );
  });

  it('can parse comments', () => {
    // throw if failure
    parse('//\nソクラテス//ここはこめんと\r\nは 定命の フレンズ なんですか？ /////');
  });
};
