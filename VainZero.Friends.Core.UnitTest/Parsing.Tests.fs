namespace VainZero.Friends.Core

open Basis.Core
open Persimmon
open Persimmon.Syntax.UseTestNameByReflection

module ``test Parsing`` =
  let human = Predicate "ヒトの"
  let tailless = Predicate "しっぽのない"
  let friends = Predicate "ともだちの"
  let kabanChan = AtomTerm (Atom "かばんちゃん")
  let serval = AtomTerm (Atom "サーバル")
  let kimi = VarTerm (Variable.Create("きみ"))
  let dare = VarTerm (Variable.Create("だれ"))

  let ``test parseStatement can parse rules`` =
    let body (source, expected) =
      test {
        match Parsing.parseStatement source with
        | Success statement ->
          match statement with
          | Rule actual ->
            do! actual |> assertEquals expected
          | Query prop ->
            return! fail (sprintf "Query: %A" prop)
        | Failure message ->
          return! fail message
      }
    parameterize {
      case
        ( "すごーい！ かばんちゃん は ヒトの フレンズなんだね！"
        , AxiomRule (Proposition.Create(human, kabanChan))
        )
      case
        ( "すごーい！ きみ が ヒトの フレンズなら きみ は しっぽのない フレンズなんだね！"
        , InferRule
            ( Proposition.Create(tailless, kimi)
            , Proposition.Create(human, kimi)
            )
        )
      case
        ( "すごーい！ サーバル と かばんちゃん は ともだちの フレンズなんだね！"
        , AxiomRule (Proposition.Create(friends, ListTerm [serval; kabanChan]))
        )
      run body
    }

  let ``test parseStatement can parse queries`` =
    let body (source, expected) =
      test {
        match Parsing.parseStatement source with
        | Success statement ->
          match statement with
          | Rule rule ->
            return! fail (sprintf "Rule: %A" rule)
          | Query actual ->
            do! actual |> assertEquals expected
        | Failure message ->
          return! fail message
      }
    parameterize {
      case
        ( "だれ が しっぽのない フレンズなんだっけ？"
        , Proposition.Create(tailless, dare)
        )
      run body
    }
