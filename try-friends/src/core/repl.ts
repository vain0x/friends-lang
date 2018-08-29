import { LangParser, Logger, ProofSystem, Repl, Solution } from './ast';
import { createProofSystem } from './evaluating';
import { FriendsLangParser } from './parsing';
import { exhaust } from './util';

class ImplRepl implements Repl {
  constructor(
    private proofSystem: ProofSystem,
    private parser: LangParser,
    private logger: Logger,
  ) {
  }

  public input(source: string): { accepted: true } | { solutions: Iterable<Solution> } | { err: string } {
    const r = this.parser.parse(source);
    if ('err' in r) {
      return r;
    } else if ('head' in r) {
      this.logger.debug({ rule: r });
      this.proofSystem = this.proofSystem.assume(r);
      return { accepted: true };
    } else if ('query' in r) {
      this.logger.debug({ query: r.query });
      const solutions = this.proofSystem.query(r);
      return { solutions };
    } else {
      return exhaust(r);
    }
  }
}

export const createFriendsLangRepl = (logger: Logger) => {
  return new ImplRepl(createProofSystem(), new FriendsLangParser(), logger);
};
