import { LangPrinter, Prop, Term } from './ast';
import { TestSuite } from './testing-types';
import { exhaust } from './util';

const printTerm = (term: Term): string => {
  if ('var' in term) {
    return term.var.varName;
  } else if ('atom' in term) {
    return term.atom;
  } else if ('f' in term) {
    return printTerm(term.x) + ' の ' + term.f;
  } else {
    return exhaust(term);
  }
};

export class FriendsLangPrinter implements LangPrinter {
  public printTerm(term: Term): string {
    return printTerm(term);
  }
}

export const testSuite: TestSuite = ({ describe, context, it, eq }) => {
  describe('printTerm', () => {
    it('can print var', () => {
      eq(printTerm({ var: { varId: -1, varName: 'あなた' } }), 'あなた');
    });

    it('can print atom', () => {
      eq(printTerm({ atom: 'かばんちゃん' }), 'かばんちゃん');
    });

    it('can print app', () => {
      eq(
        printTerm({ f: 'かばん', x: { var: { varId: -1, varName: 'かばんちゃん' } } }),
        'かばんちゃん の かばん',
      );
    });
  });
};
