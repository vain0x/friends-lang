import { AtomTerm, Term, VarTerm } from './ast';
import { None, Option, Some } from './option';
import { choice, endOfInput, expect, parse, Parser, parser, recursiveP, spaceP, wordP } from './parser-combinator';
import { TestSuite } from './testing-types';

const blankP = spaceP();
const blank1P = blankP.nonempty();
const identP = wordP();

const hagamoP = expect('は');

const varIdents = new Set([
  'あなた', 'きみ', 'かれ', 'かのじょ', 'だれ',
  'なに', 'あれ', 'これ', 'これら', 'それ', 'それら',
]);

const varOrAtomP: Parser<VarTerm | AtomTerm, {}> = identP.map(word => {
  if (word.startsWith('_') || varIdents.has(word)) {
    return { var: { varName: word, varId: -1 } };
  } else {
    return { atom: word };
  }
});

const [termP, initTermP] = recursiveP<Term, {}>();

initTermP(
  choice([
    expect('「').attempt().andR(blankP).andR(termP).andL(blankP).andL(expect('」')),
    varOrAtomP,
  ]));

const subjectP = termP.map(t => ({ subject: t }));

const predicateP = expect('定命の').map(p => ({ predicate: p }));

const ruleStatementP =
  expect('すごーい！').attempt().andR(blankP)
    .andR(subjectP).andL(blank1P)
    .andL(hagamoP).andL(blank1P)
    .andA(predicateP).andL(blank1P)
    .andL(expect('フレンズ')).andL(blankP)
    .andL(expect('なんだね！')).andL(blankP)
    .map(x => Object.assign({}, x, { type: 'rule' }))
  ;

const queryStatementP =
  subjectP.andL(blank1P)
    .andL(hagamoP).andL(blank1P).attempt()
    .andA(predicateP).andL(blank1P)
    .andL(expect('フレンズ')).andL(blankP)
    .andL(expect('なんですか？')).andL(blankP)
    .map(x => Object.assign({}, x, { type: 'query' }))
  ;

const statementP =
  blankP
    .andR(choice([
      ruleStatementP,
      queryStatementP,
    ]))
    .andL(blankP)
    .andL(endOfInput());

export const tryParse = (source: string) => {
  const r = parse({ source, u: 0, parser: statementP });
  if (!r.ok) {
    const { source: { lines }, message, pos: { line, column } } = r.error;
    const near = lines[line].substring(0, column);
    throw new Error(`Parse Error:\n${message}\nAt ${1 + line} line, ${1 + column} column, near '${near}'`);
  }
  return r.value;
};

export const testSuite: TestSuite = ({ describe, context, it, eq }) => {
  it('can parse rule statement', () => {
    eq(
      { type: 'rule', subject: { var: { varName: 'あなた', varId: -1 } }, predicate: '定命の' },
      tryParse('すごーい！ あなた は 定命の フレンズ なんだね！'),
    );
  });
  it('can parse group term', () => {
    eq(
      { type: 'rule', subject: { atom: 'ソクラテスさん' }, predicate: '定命の' },
      tryParse('すごーい！ 「「 ソクラテスさん 」」 は 定命の フレンズ なんだね！'),
    );
  });

  it('can parse query statement', () => {
    eq(
      { type: 'query', subject: { atom: 'ソクラテスさん' }, predicate: '定命の' },
      tryParse('ソクラテスさん　は\r\n\t定命の フレンズ なんですか？ '),
    );
  });
};
