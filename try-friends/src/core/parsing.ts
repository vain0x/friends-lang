import { None, Option, Some } from './option';
import { choice, endOfInput, expect, parse, Parser, parser } from './parser-combinator';
import { TestSuite } from './testing-types';

const singleSpaceP =
  choice([
    expect(' '),
    expect('　'),
  ].map(p => p.attempt()));

const blankP = singleSpaceP.many().map(_ => None);

const blank1P = singleSpaceP.andR(blankP);

const hagamoP = expect('は');

const termP = expect('あなた');

const subjectP = termP.map(t => ({ subject: t }));

const predicateP = expect('定命の').map(p => ({ predicate: p }));

const ruleStatementP =
  expect('すごーい！').attempt().andL(blank1P)
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
    eq({ type: 'rule', subject: 'あなた', predicate: '定命の' }, tryParse('すごーい！ あなた は 定命の フレンズ なんだね！ '));
  });

  it('can parse query statement', () => {
    eq({ type: 'query', subject: 'あなた', predicate: '定命の' }, tryParse('あなた は 定命の フレンズ なんですか？ '));
  });
};
