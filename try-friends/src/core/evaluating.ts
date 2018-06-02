import {
  AppTerm,
  CutProp,
  Env,
  Knowledge,
  nilTerm,
  Pred,
  PredProp,
  Prop,
  Rule,
  Solution,
  Term,
  TrueProp,
  Var,
  VarId,
  VarTerm,
} from './ast';
import { flatMap } from './iterable';

const todo = (): never => {
  throw new Error('Not implemented.');
};

const exhaust = (value: never): never => value;

const nextVarId = (() => {
  let count = 0;
  return () => ++count;
})();

const zeroTerm = { atom: '0' };
const succTerm = { atom: 'succ' };

const Term = {
  vars(term: Term): Var[] {
    if ('var' in term) {
      return [term.var];
    } else if ('atom' in term) {
      return [];
    } else if ('f' in term) {
      return Term.vars(term.x);
    } else {
      return exhaust(term);
    }
  },
  withVarId(term: Term, varId: VarId): Term {
    if ('var' in term) {
      return { var: { varId, varName: term.var.varName } };
    } else if ('atom' in term) {
      return term;
    } else if ('f' in term) {
      return {
        f: term.f,
        x: Term.withVarId(term.x, varId),
      };
    } else {
      return exhaust(term);
    }
  },
};

const Prop = {
  withVarId(prop: Prop, varId: VarId): Prop {
    if ('pred' in prop) {
      return {
        pred: prop.pred,
        term: Term.withVarId(prop.term, varId),
      };
    } else if ('left' in prop) {
      return {
        left: Prop.withVarId(prop.left, varId),
        right: Prop.withVarId(prop.right, varId),
      };
    } else {
      return exhaust(prop);
    }
  },

  /**
   * Refresh all variables in the proposition
   * by changing var ids to fresh one.
   */
  refresh(prop: Prop): Prop {
    return Prop.withVarId(prop, nextVarId());
  },

  vars(prop: Prop): Var[] {
    if ('pred' in prop) {
      return Term.vars(prop.term);
    } else if ('left' in prop) {
      // FIXME: perf
      return [
        ...Prop.vars(prop.left),
        ...Prop.vars(prop.right),
      ];
    } else {
      return exhaust(prop);
    }
  },
};

const Rule = {
  refresh(rule: Rule): Rule {
    const varId = nextVarId();
    const head = Prop.withVarId(rule.head, varId) as PredProp;
    const goal = rule.goal !== undefined
      ? Prop.withVarId(rule.goal, varId)
      : undefined;
    return { head, goal };
  },
};

const Knowledge = {
  default() {
    return {};
  },
  assume(knowledge: Knowledge, rule: Rule): Knowledge {
    const predName = rule.head.pred;
    const rules = [...(knowledge[predName] || []), rule];
    return {
      ...knowledge,
      [predName]: rules,
    };
  },
  assumeMany(knowledge: Knowledge, rules: Rule[]): Knowledge {
    let k = knowledge;
    for (const rule of rules) {
      k = Knowledge.assume(k, rule);
    }
    return k;
  },
  /**
   * Find all rules associated with the specified predicate.
   * The predicate is true only if one of them applies.
   */
  rules(knowledge: Knowledge, predName: string): Rule[] {
    return knowledge[predName] || [];
  },
};

const Env = {
  default() {
    return {};
  },
  tryFind(env: Env, v: Var): Term | undefined {
    const idMap = env[v.varName];
    if (idMap === undefined) {
      return undefined;
    }
    return idMap[v.varId];
  },
  bind(env: Env, v: Var, term: Term): Env {
    const substTerm = Env.substitute(env, term);

    // Avoid recursion.
    if ('var' in substTerm
      && substTerm.var.varName === v.varName
      && substTerm.var.varId === v.varId
    ) {
      return env;
    }

    const idMap = {
      ...(env[v.varName] || {}),
      [v.varId]: substTerm,
    };
    return {
      ...env,
      [v.varName]: idMap,
    };
  },
  /**
   * Substitutes all variables with their bound term in the environment recursively as possible.
   */
  substitute(env: Env, term: Term): Term {
    if ('var' in term) {
      const bound = Env.tryFind(env, term.var);
      if (bound === undefined) {
        return term;
      }
      return Env.substitute(env, bound);
    } else if ('atom' in term) {
      return term;
    } else if ('f' in term) {
      return {
        f: term.f,
        x: Env.substitute(env, term.x),
      };
    } else {
      return exhaust(term);
    }
  },
  tryUnify: (() => {
    const tryUnifyVar = (env: Env, v: Var, term: Term): Env | undefined => {
      const bound = Env.tryFind(env, v);
      if (bound === undefined) {
        return Env.bind(env, v, term);
      }
      return Env.tryUnify(env, term, Env.substitute(env, bound));
    };

    return (env: Env, lTerm: Term, rTerm: Term): Env | undefined => {
      if ('var' in lTerm) {
        return tryUnifyVar(env, lTerm.var, rTerm);
      } else if ('var' in rTerm) {
        return tryUnifyVar(env, rTerm.var, lTerm);
      } else if ('atom' in lTerm && 'atom' in rTerm && lTerm.atom === rTerm.atom) {
        return env;
      } else if ('f' in lTerm && 'f' in rTerm && lTerm.f === rTerm.f) {
        return Env.tryUnify(env, lTerm.x, rTerm.x);
      } else {
        return undefined;
      }
    };
  })(),
};

interface ProveResult {
  env: Env;
  cut: boolean;
}

const prove = (() => {
  const isNil = (term: Term): boolean => {
    return 'atom' in term && term.atom === nilTerm.atom;
  };

  function* provePred(prop: PredProp, env: Env, knowledge: Knowledge): Iterable<ProveResult> {
    // Build-in predicates.
    {
      if (prop.pred === CutProp.pred && isNil(prop.term)) {
        yield { env, cut: true };
        return;
      } else if (prop.pred === TrueProp.pred && isNil(prop.term)) {
        yield { env, cut: false };
        return;
      }
    }

    const rules = Knowledge.rules(knowledge, prop.pred);
    for (const defaultRule of rules) {
      const rule = Rule.refresh(defaultRule);

      // Try unify head.
      const env2 = Env.tryUnify(env, prop.term, rule.head.term);
      if (env2 === undefined) {
        continue;
      }

      // Try prove goal.
      if (rule.goal === undefined) {
        yield { env: env2, cut: false };
        continue;
      }

      const results = proveProp(rule.goal, env2, knowledge);
      for (const { env: env3, cut } of results) {
        yield { env: env3, cut: false };
        if (cut) {
          return;
        }
      }
    }
  }

  function* proveProp(prop: Prop, env: Env, knowledge: Knowledge): Iterable<ProveResult> {
    if ('pred' in prop) {
      for (const result of provePred(prop, env, knowledge)) {
        yield result;
      }
    } else if ('left' in prop) {
      for (const { env: env2, cut: cut2 } of proveProp(prop.left, env, knowledge)) {
        for (const { env: env3, cut: cut3 } of proveProp(prop.right, env2, knowledge)) {
          yield { env: env3, cut: cut2 || cut3 };
        }
      }
    } else {
      return exhaust(prop);
    }
  }

  function* proveCore(prop: Prop, env: Env, knowledge: Knowledge): Iterable<Env> {
    for (const { env: nextEnv } of proveProp(prop, env, knowledge)) {
      yield nextEnv;
    }
  }

  return proveCore;
})();

const distinct = <X>(xs: X[]): X[] => xs;

export function* query(prop: Prop, globalEnv: Env, globalKnowledge: Knowledge): Iterable<Solution> {
  prop = Prop.refresh(prop);
  const vars = distinct(Prop.vars(prop));
  for (const localEnv of prove(prop, globalEnv, globalKnowledge)) {
    const solution: Solution = [];
    for (const v of vars) {
      const term = Env.substitute(localEnv, { var: v });
      if (term === undefined) {
        continue;
      }
      const assignment = {
        varName: v.varName,
        term,
      };
      solution.push(assignment);
    }
    yield solution;
  }
}

// -------------------------------------------------------------
// Unit Testing
// -------------------------------------------------------------

export interface TestTools {
  describe: (description: string, body: (this: void) => void) => void;
  context: (description: string, body: (this: void) => void) => void;
  it: (description: string, body: (this: void) => void) => void;
  eq: <T>(actual: T, expected: T) => void;
}

export const tests = ({ describe, context, it, eq }: TestTools) => {
  const free = (varName: string): VarTerm => ({ var: { varId: -1, varName } });
  const x = free('x');
  const y = free('y');
  const pred = (predName: string) => (term: Term) => ({
    pred: predName,
    term,
  });

  const socrates = { atom: 'socrates' };
  const plato = { atom: 'plato' };
  const f = (t: Term): AppTerm => ({ f: 'f', x: t });

  const mortal = pred('mortal');
  const human = pred('human');

  describe('Knowledge', () => {
    const k = Knowledge.default();

    it('doesn\'t know undefined predicates', () => {
      eq(Knowledge.rules(k, 'human'), []);
    });

    it('can assume many', () => {
      const r1 = { head: human(socrates) };
      const r2 = { head: human(plato) };
      const k1 = Knowledge.assume(k, r1);
      const k2 = Knowledge.assume(k1, r2);
      eq(Knowledge.rules(k1, 'human'), [r1]);
      eq(Knowledge.rules(k2, 'human'), [r1, r2]);
    });
  });

  describe('Env', () => {
    const e = Env.default();

    it('can bind a var and find it', () => {
      eq(Env.tryFind(Env.bind(e, x.var, socrates), x.var), socrates);
    });

    it('can\'t find unbound var', () => {
      eq(Env.tryFind(e, x.var), undefined);
    });

    describe('tryUnify', () => {
      const cases = [
        {
          desc: 'var binding',
          left: x,
          right: socrates,
          test: x,
          expected: socrates,
        },
        {
          desc: 'app binding',
          left: f(x),
          right: f(socrates),
          test: x,
          expected: socrates,
        },
      ];

      for (const { desc, left, right, test, expected } of cases) {
        it(desc, () => {
          const env = Env.tryUnify(e, left, right);
          if (env === undefined) {
            throw new Error('Couldn\'t unify.');
          }
          eq(Env.substitute(env, test), expected);
        });
      }
    });
  });

  context('Syllogism', () => {
    const major = {
      head: mortal(x),
      goal: human(x),
    };
    const minor = {
      head: human(socrates),
    };
    const conclution = mortal(socrates);

    const env = Env.default();
    const k = Knowledge.assumeMany(Knowledge.default(), [major, minor]);

    it('can find rules', () => {
      eq(Knowledge.rules(k, conclution.pred), [major]);
      eq(Knowledge.rules(k, major.goal.pred), [minor]);
    });

    it('can match head', () => {
      eq(Env.tryUnify(env, major.head.term, conclution.term), {
        x: {
          [-1]: socrates,
        },
      });
    });

    it('can conclude', () => {
      const solutions = [...query(conclution, env, k)];
      eq(solutions, [[]]);
    });

    it('can find all solutions', () => {
      const platoRule = { head: human(plato) };
      const k2 = Knowledge.assume(k, platoRule);
      const solutions = [...query(mortal(x), env, k2)];
      eq(solutions, [
        [
          { varName: 'x', term: socrates },
        ],
        [
          { varName: 'x', term: plato },
        ],
      ]);
    });
  });
};
