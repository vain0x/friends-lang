namespace FriendsLang.Compiler

  type NonemptyList<'T> = 'T * 'T list

  /// Represents an immutable array.
  /// TODO: Use System.Collections.ImmutableArray or something.
  type Vector<'T> = 'T[]

  /// Represents an immutable, efficient associative array.
  /// TODO: Use System.Collections.ImmutableDictionary or something.
  type HashMap<'K, 'V when 'K : comparison> = Map<'K, 'V>

namespace FriendsLang.Compiler.Ast

  open FriendsLang.Compiler

  type Predicate =
    | Predicate
      of string

  type Atom =
    | Atom
      of string

  type Variable =
    {
      Name:
        string
      Id:
        int
    }
  with
    static member Create(name) =
      {
        Name =
          name
        Id =
          -1
      }

  type Term =
    | VarTerm
      of Variable
    | AtomTerm
      of Atom
    | AppTerm
      of Atom * Term
    | ConsTerm
      of Term * Term

  type AtomicProposition =
    {
      Predicate:
        Predicate
      Term:
        Term
    }
  with
    static member Create(predicate, term) =
      {
        Predicate =
          predicate
        Term =
          term
      }

  type Proposition =
    | CutProposition
    | AtomicProposition
      of AtomicProposition
    | AndProposition
      of Vector<Proposition>

  type Rule =
    | AxiomRule
      of AtomicProposition
    | InferRule
      of AtomicProposition * Proposition

  type Statement =
    | Rule
      of Rule
    | Query
      of Proposition
