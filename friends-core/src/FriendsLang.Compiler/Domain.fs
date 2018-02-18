namespace FriendsLang.Compiler

  [<CompilationRepresentation(CompilationRepresentationFlags.ModuleSuffix)>]
  module Vector =
    let empty = Array.empty
    let singleton x = Array.singleton x
    let map x = Array.map x
    let fold x = Array.fold x
    let append x = Array.append x
    let ofList x = Array.ofList x
    let ofSeq x = Array.ofSeq x

  [<CompilationRepresentation(CompilationRepresentationFlags.ModuleSuffix)>]
  module HashMap =
    let empty = Map.empty

namespace FriendsLang.Compiler.Ast

  open FriendsLang.Compiler

  [<CompilationRepresentation(CompilationRepresentationFlags.ModuleSuffix)>]
  module Predicate =
    let name (Predicate name) = name

  [<CompilationRepresentation(CompilationRepresentationFlags.ModuleSuffix)>]
  module Atom =
    let name (Atom name) = name

  [<CompilationRepresentation(CompilationRepresentationFlags.ModuleSuffix)>]
  module Variable =
    let replaceId id var =
      { var with Id = id }

  [<CompilationRepresentation(CompilationRepresentationFlags.ModuleSuffix)>]
  module Proposition =
    let conj l r =
      match (l, r) with
      | (AndProposition l, AndProposition r) ->
        AndProposition (Vector.append l r)
      | (AndProposition l, r) ->
        AndProposition (Vector.append l (Vector.singleton r))
      | (l, AndProposition r) ->
        AndProposition (Vector.append (Vector.singleton l) r)
      | (l, r) ->
        AndProposition (Vector.ofList [l; r])

  [<CompilationRepresentation(CompilationRepresentationFlags.ModuleSuffix)>]
  module Rule =
    let head rule =
      match rule with
      | AxiomRule prop ->
        prop
      | InferRule (prop, _) ->
        prop

    let predicate rule =
      (rule |> head).Predicate

  [<AutoOpen>]
  [<CompilationRepresentation(CompilationRepresentationFlags.ModuleSuffix)>]
  module Extensions =
    type Predicate with
      member this.Name =
        this |> Predicate.name

      member this.Item
        with get term =
          AtomicProposition.Create(this, term)

    type Atom with
      member this.Name =
        this |> Atom.name

    type Variable with
      member this.ReplaceId(id) =
        this |> Variable.replaceId id

    type Proposition with
      member this.And(r) =
        Proposition.conj this r

    type Rule with
      member this.Head =
        this |> Rule.head

      member this.Predicate =
        this |> Rule.predicate
