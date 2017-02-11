namespace VainZero.Friends.Core

open System.Collections.Generic
open Basis.Core
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

  let listWithTailFromSeq tailTerm terms =
    Seq.foldBack
      (fun headTerm tailTerm -> ConsTerm (headTerm, tailTerm))
      terms
      tailTerm

  let listFromSeq terms =
    listWithTailFromSeq nil terms

  let seqFromList headTerm tailTerm =
    let rec toList acc =
      function
      | ConsTerm (headTerm, tailTerm) ->
        toList (headTerm :: acc) tailTerm
      | term ->
        (acc |> List.rev, term)
    toList [headTerm] tailTerm

  let zero =
    AtomTerm (Atom "0")

  let succ t =
    AppTerm (Atom "次", t)

  let ofNatural n =
    if n < 0 then invalidArg (string n) "Must be positive."
    seq {0..(n - 1)} |> Seq.fold (fun t _ -> succ t) zero

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
module AtomicProposition =
  let rec replaceId id (prop: AtomicProposition) =
    prop.Predicate.[prop.Term |> Term.replaceId id]

  let rec refresh prop =
    replaceId (Counter.nextId ()) prop

[<CompilationRepresentation(CompilationRepresentationFlags.ModuleSuffix)>]
module Proposition =
  let rec variables =
    function
    | CutProposition ->
      Seq.empty
    | AtomicProposition prop ->
      prop.Term |> Term.variables
    | AndProposition props ->
      props |> Seq.collect variables

  let rec replaceId id =
    function
    | CutProposition ->
      CutProposition
    | AtomicProposition prop ->
      AtomicProposition (prop |> AtomicProposition.replaceId id)
    | AndProposition props ->
      AndProposition (props |> Vector.map (replaceId id))

  let rec refresh prop =
    replaceId (Counter.nextId ()) prop

[<CompilationRepresentation(CompilationRepresentationFlags.ModuleSuffix)>]
module Rule =
  let rec refresh =
    function
    | AxiomRule prop ->
      AxiomRule (prop |> AtomicProposition.refresh)
    | InferRule (head, body) ->
      let id = Counter.nextId ()
      let head = AtomicProposition.replaceId id head
      let body = Proposition.replaceId id body
      InferRule (head, body)

type Knowledge(map: HashMap<Predicate, vector<Rule>>) =
  member this.FindAll(predicate) =
    map.TryFind(predicate) |> Option.getOr Vector.empty

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
    let term = substitute term
    if term = VarTerm v then
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
  let rec tryUnify term term' (env: Environment) =
    let tryUnifyVar var term (env: Environment) =
      match env.TryFind(var) with
      | Some term' ->
        env |> tryUnify term (env.Substitute(term'))
      | None ->
        env.Add(var, term) |> Some
    match (term, term') with
    | (VarTerm var, _) ->
      env |> tryUnifyVar var term'
    | (_, VarTerm var') ->
      env |> tryUnifyVar var' term
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
  type private BacktrackFlow =
    | Break
    | Continue
  with
    member this.Combine(r) =
      match (this, r) with
      | (Break, _)
      | (_, Break) ->
        Break
      | (Continue, Continue) ->
        Continue

  type private ProveFunction(env: Environment, knowledge: Knowledge) =
    let prove prop env =
      ProveFunction(env, knowledge).Prove(prop: Proposition)

    member this.Prove(prop: AtomicProposition) =
      let rules =
        knowledge.FindAll(prop.Predicate)
        |> Vector.map Rule.refresh
      let rec loop i =
        seq {
          if i < rules.Length then
            let loop () = loop (i + 1)
            let rule = rules.[i]
            let head = rule.Head
            match env |> Environment.tryUnify prop.Term head.Term with
            | Some env ->
              match rule with
              | AxiomRule _ ->
                yield (env, Continue)
                yield! loop ()
              | InferRule (_, body) ->
                let (envs, flow) =
                  prove body env |> Seq.fold
                    (fun (envs, flow) (env', flow') ->
                      (env' :: envs, (flow: BacktrackFlow).Combine(flow'))
                    )
                    ([], Continue)
                yield! envs |> Seq.map (fun env -> (env, Continue)) |> Seq.rev
                if flow = Continue then
                  yield! loop ()
            | None ->
              yield! loop ()
        }
      loop 0

    member this.Prove(prop: Proposition) =
      match prop with
      | CutProposition ->
        Seq.singleton (env, Break)
      | AtomicProposition prop ->
        this.Prove(prop)
      | AndProposition props ->
        props |> Vector.fold
          (fun envs prop ->
            envs |> Seq.collect
              (fun (env, flow) ->
                prove prop env
                |> Seq.map (fun (env', flow') -> (env', flow.Combine(flow')))
              )
          )
          (Seq.singleton (env, Continue))

  let prove (prop: Proposition) (env: Environment) (knowledge: Knowledge) =
    ProveFunction(env, knowledge).Prove(prop) |> Seq.map fst

  let query prop knowledge =
    seq {
      let prop = prop |> Proposition.refresh
      let variables = Proposition.variables prop
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
