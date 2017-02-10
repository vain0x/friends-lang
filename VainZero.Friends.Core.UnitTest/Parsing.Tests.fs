namespace VainZero.Friends.Core

open Basis.Core
open Persimmon
open Persimmon.Syntax.UseTestNameByReflection

module ``test Parsing`` =
  let human = Predicate "ヒトの"
  let tailless = Predicate "しっぽのない"
  let kabanChan = AtomTerm (Atom "かばんちゃん")
  let serval = AtomTerm (Atom "サーバル")
  let kimi = VarTerm (Variable.Create("きみ"))
  let dare = VarTerm (Variable.Create("だれ"))

  let app f t = AppTerm (Atom f, t)
  let listTerm xs = Term.listFromSeq xs

  let ``test parseTerm can parse terms`` =
    let body (source, expected) =
      test {
        match Parsing.parseTerm source with
        | Success term ->
          do! term |> assertEquals expected
        | Failure message ->
          return! fail message
      }
    parameterize {
      case
        ( "0"
        , Term.zero
        )
      case
        ( "1"
        , Term.zero |> Term.succ
        )
      case
        ( "2"
        , Term.zero |> Term.succ |> Term.succ
        )
      case
        ( "サーバル の みみ"
        , serval |> app "みみ"
        )
      case
        ( "サーバル の みみ の あな の なか"
        , serval |> app "みみ" |> app "あな" |> app "なか"
        )
      case
        ( "サーバル と かばんちゃん"
        , listTerm [serval; kabanChan]
        )
      case
        ( "サーバル の しっぽ と かばんちゃん の みみ"
        , listTerm [(serval |> app "しっぽ"); (kabanChan |> app "みみ")]
        )
      case
        ( "0 と だれ"
        , listTerm [Term.zero; dare]
        )
      case
        ( "0 と サーバル と だれ とか"
        , Term.listWithTailFromSeq dare [Term.zero; serval]
        )
      run body
    }

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
        ( "すごーい！ かばんちゃん は ヒトの フレンズ なんだね！"
        , AxiomRule (human.[kabanChan])
        )
      case
        ( "すごーい！ きみ が ヒトの フレンズ なら きみ は しっぽのない フレンズ なんだね！"
        , InferRule
            ( tailless.[kimi]
            , AtomicProposition (human.[kimi])
            )
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
        ( "だれ が しっぽのない フレンズ なんだっけ？"
        , AtomicProposition tailless.[dare]
        )
      run body
    }
