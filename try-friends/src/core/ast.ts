/*!
 * Abstract syntax tree (AST).
 */

/**
 * Predicate.
 */
export type Pred = string;

/**
 * Atom. Identified by name.
 */
export type Atom = string;

/**
 * Variable: a symbol to unify.
 */
export interface Var {
  varId: number;
  varName: string;
}

export type TermTag =
  'var_term'
  | 'atom_term'
  | 'app_term'
  ;

/**
 * Term: an expression to represent an object.
 */
export interface Term {
  tag: TermTag;
}

export interface VarTerm {
  tag: 'var_term';
  var: Var;
}

/**
 * Atom: a constant.
 */
export interface AtomTerm {
  tag: 'atom_term';
  atom: Atom;
}

/**
 * Application term: a node to compose atoms and variables into one term.
 */
export interface AppTerm {
  tag: 'app_term';
  atom: Atom;
  term: Term;
}

export type PropTag =
  'atomic_prop'
  | 'cut_prop'
  | 'and_prop'
  ;

/**
 * Proposition: an expression to represent a statement.
 */
export interface Prop {
  tag: PropTag;
}

/**
 * Proposition which consists of a predicate.
 */
export interface PredProp {
  tag: 'atomic_prop';
  pred: Pred;
}

export interface AndProp {
  tag: 'and_prop';
  left: Prop;
  right: Prop;
}

// FIXME: Should be a predicate.
/**
 * '!' operator.
 */
export interface CutProp {
  tag: 'cut_prop';
}

/**
 * Rule: an axiom or inference rule that we consider is true with no thought.
 */
export interface Rule {
  head: Pred;
  body: Prop | undefined;
}

export type StatementTag =
  'rule_statement'
  | 'query_statement'
  ;

export interface Statement {
  tag: StatementTag;
}

export interface RuleStatement {
  tag: 'rule_statement';
  rule: Rule;
}

export interface QueryStatement {
  tag: 'query_statement';
  prop: Prop;
}
