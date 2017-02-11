namespace VainZero.Friends.Core

type Predicate =
  | Predicate
    of string
with
  member this.Name =
    let (Predicate name) = this
    name

type Atom =
  | Atom
    of string
with
  member this.Name =
    let (Atom name) = this
    name

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

  member this.ReplaceId(id) =
    { this with Id = id }

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
    of vector<Proposition>
with
  member this.And(r) =
    match (this, r) with
    | (AndProposition l, AndProposition r) ->
      AndProposition (Vector.append l r)
    | (AndProposition l, r) ->
      AndProposition (Vector.append l (Vector.singleton r))
    | (l, AndProposition r) ->
      AndProposition (Vector.append (Vector.singleton l) r)
    | (l, r) ->
      AndProposition (Vector.ofList [l; r])

type Rule =
  | AxiomRule
    of AtomicProposition
  | InferRule
    of AtomicProposition * Proposition
with
  member this.Head =
    match this with
    | AxiomRule prop ->
      prop
    | InferRule (prop, _) ->
      prop

  member this.Predicate =
    this.Head.Predicate

type Statement =
  | Rule
    of Rule
  | Query
    of Proposition

type Predicate with
  member this.Item
    with get term =
      AtomicProposition.Create(this, term)
