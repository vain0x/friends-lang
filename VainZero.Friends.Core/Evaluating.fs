namespace VainZero.Friends.Core

open System.Collections.Generic
open ExtCore.Collections
open VainZero

module Counter =
  let counter = ref 0

  let nextId () =
    let value = !counter
    counter |> incr
    value

[<CompilationRepresentation(CompilationRepresentationFlags.ModuleSuffix)>]
module Term =
  [<Literal>]
  let NilName = "nil"

  let nil =
    AtomTerm (Atom NilName)

  let listFromSeq xs =
    Seq.foldBack
      (fun headTerm tailTerm -> ConsTerm (headTerm, tailTerm))
      xs
      nil

  let seqFromList headTerm tailTerm =
    let rec toList acc =
      function
      | ConsTerm (headTerm, tailTerm) ->
        toList (headTerm :: acc) tailTerm
      | term ->
        (acc |> List.rev, term)
    toList [headTerm] tailTerm

  let rec variables term =
    seq {
      match term with
      | VarTerm var ->
        yield var
      | AppTerm (_, term) ->
        yield! variables term
      | AtomTerm _ ->
        ()
      | ConsTerm (headTerm, tailTerm) ->
        yield! variables headTerm
        yield! variables tailTerm
    }

  let rec replaceId id =
    let rec loop term =
      match term with
      | VarTerm var ->
        VarTerm (var.ReplaceId(id))
      | AtomTerm  _ ->
        term
      | AppTerm (atom, term) ->
        AppTerm (atom, term |> loop)
      | ConsTerm (headTerm, tailTerm) ->
        ConsTerm (headTerm |> loop, tailTerm |> loop)
    loop

[<AutoOpen>]
module TermExtension =
  let (|NilTerm|_|) =
    function
    | AtomTerm (Atom Term.NilName) -> Some ()
    | _ -> None

[<CompilationRepresentation(CompilationRepresentationFlags.ModuleSuffix)>]
module Proposition =
  let rec replaceId id (prop: Proposition) =
    Proposition.Create(prop.Predicate, prop.Term |> Term.replaceId id)

  let rec refresh prop =
    replaceId (Counter.nextId ()) prop

[<CompilationRepresentation(CompilationRepresentationFlags.ModuleSuffix)>]
module Rule =
  let rec refresh =
    function
    | AxiomRule prop ->
      AxiomRule (prop |> Proposition.refresh)
    | InferRule (head, body) ->
      let id = Counter.nextId ()
      let head = Proposition.replaceId id head
      let body = Proposition.replaceId id body
      InferRule (head, body)

type Knowledge(map: HashMap<Predicate, vector<Rule>>) =
  member this.FindAll(predicate) =
    match map.TryFind(predicate) with
    | Some rules ->
      rules :> seq<_>
    | None ->
      Seq.empty

  member this.Add(rule) =
    let predicate = (rule: Rule).Predicate
    let newRules = Vector.singleton rule
    let rules =
      match map.TryFind(predicate) with
      | Some rules ->
        Vector.append rules newRules
      | None ->
        newRules
    Knowledge(map.Add(predicate, rules))

  static member Empty =
    Knowledge(HashMap.empty)

  static member FromRules(rules) =
    rules |> Seq.fold
      (fun knowledge rule -> (knowledge: Knowledge).Add(rule))
      Knowledge.Empty

type Environment(map: Map<Variable, Term>) =
  let tryFind var =
    map |> Map.tryFind var

  let rec substitute term =
    match term with
    | VarTerm var ->
      match tryFind var with
      | Some term ->
        substitute term
      | None ->
        term
    | AtomTerm _ ->
      term
    | AppTerm (atom, term) ->
      AppTerm (atom, substitute term)
    | ConsTerm (headTerm, tailTerm)  ->
      ConsTerm (headTerm |> substitute, tailTerm |> substitute)

  let add v term =
    if substitute term = VarTerm v then
      map
    else
      map |> Map.add v term

  member this.TryFind(var) =
    tryFind var

  member this.Substitute(term) =
    substitute term

  member this.Add(var, term) =
    Environment(add var term)

  static member val Empty =
    Environment(Map.empty)

[<CompilationRepresentation(CompilationRepresentationFlags.ModuleSuffix)>]
module Environment =
  let rec tryUnify term term' env =
    match (term, term') with
    | (VarTerm var, _) ->
      (env: Environment).Add(var, term') |> Some
    | (_, VarTerm var') ->
      env.Add(var', term) |> Some
    | (AtomTerm atom, AtomTerm atom')
      when atom = atom' ->
      Some env
    | (AppTerm (atom, arg), AppTerm (atom', arg'))
      when atom = atom' ->
      env |> tryUnify arg arg'
    | (ConsTerm (headTerm, tailTerm), ConsTerm (headTerm', tailTerm')) ->
      env
      |> tryUnify headTerm headTerm'
      |> Option.bind (tryUnify tailTerm tailTerm')
    | (_, _) ->
      None

[<CompilationRepresentation(CompilationRepresentationFlags.ModuleSuffix)>]
module Knowledge =
  let prove (prop: Proposition) (env: Environment) (knowledge: Knowledge) =
    let rec prove (prop: Proposition) env =
      seq {
        for rule in knowledge.FindAll(prop.Predicate) do
          let rule = rule |> Rule.refresh
          let head = rule.Head
          match env |> Environment.tryUnify prop.Term head.Term with
          | Some env ->
            match rule with
            | AxiomRule _ ->
              yield env
            | InferRule (_, body) ->
              yield! prove body env
          | None -> ()
      }
    prove prop env

  let query prop knowledge =
    seq {
      let prop = prop |> Proposition.refresh
      let variables = Term.variables prop.Term
      let envs = prove prop Environment.Empty knowledge
      for env in envs do
        yield
          variables
          |> Seq.distinct
          |> Seq.choose
            (fun var ->
              env.TryFind(var)
              |> Option.map (fun term -> (var, env.Substitute(term)))
            )
          |> Seq.toArray
    }
