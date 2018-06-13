import {
  AstHelper,
  LangPrinter,
  nilTerm,
  Prop,
  Term,
} from './ast';
import { TestSuite } from './testing-types';
import { exhaust } from './util';

const printTerm = (term: Term): string => {
  if ('var' in term) {
    return term.var.varName;
  } else if ('atom' in term) {
    return term.atom;
  } else if ('f' in term) {
    return printTerm(term.x) + ' の ' + term.f;
  } else if ('head' in term) {
    const head = 'head' in term.head
      ? `「${printTerm(term.head)}」`
      : printTerm(term.head);
    if (term.tail === nilTerm) {
      return head;
    }
    const tail = 'head' in term.tail
      ? printTerm(term.tail)
      : `${printTerm(term.tail)} とか`;
    return `${head} と ${tail}`;
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
  const {
    varTerm,
    listTerm,
  } = AstHelper;

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

    it('can print list', () => {
      eq(
        printTerm({ f: 'かばん', x: { var: { varId: -1, varName: 'かばんちゃん' } } }),
        'かばんちゃん の かばん',
      );
    });

    it('can print list term', () => {
      eq(
        printTerm(listTerm([varTerm('x'), varTerm('y')])),
        'x と y',
      );
    });

    it('can print var-tailed list term', () => {
      eq(
        printTerm(listTerm([varTerm('x'), varTerm('y')], varTerm('z'))),
        'x と y と z とか',
      );
    });

    it('can print nested list term', () => {
      eq(
        printTerm(
          listTerm([
            listTerm([varTerm('x'), varTerm('y')]),
            varTerm('z'),
          ])),
        '「x と y」 と z',
      );
    });
  });
};
