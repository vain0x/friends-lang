namespace VainZero.Friends.Repl

open System
open Basis.Core
open VainZero.Friends.Core

module Console =
  let rec readYesNo () =
    match Console.ReadLine() with
    | null | "n" | "N" ->
      false
    | "y" | "Y" ->
      true
    | _ ->
      readYesNo ()

module Program =
  let knowledge = Knowledge.Empty()

  let quote s =
    sprintf "「%s」" s

  let rec printTerm term =
    match term with
    | VarTerm v ->
      quote v.Name
    | AppTerm (a, term) ->
      sprintf "%s の %s" (printTerm term) (quote a.Name)
    | AtomTerm a ->
      quote a.Name
    | ListTerm terms ->
      terms |> Seq.map printTerm |> String.concat " と "

  let query prop =
    let assignments = knowledge |> Knowledge.query prop
    use enumerator = assignments.GetEnumerator()
    let rec walk () =
      if enumerator.MoveNext() then
        let assignment = enumerator.Current
        if assignment |> Array.isEmpty then
          printfn "%s" "そうだよ！"
        else
          printfn "%s" "---------------"
          for (v, t) in assignment do
            printfn "%sは%s、" (quote v.Name) (printTerm t)
          printf "%s" "あってる？ (y/n)"
          if Console.readYesNo ()
          then printfn "やったー！"
          else walk ()
      else
        printfn "%s" "ちがうよ！"
    walk ()

  let read line =
    match Parsing.parseStatement line with
    | Success statement ->
      match statement with
      | Rule rule ->
        knowledge.Add(rule)
      | Query prop ->
        query prop
    | Failure message ->
      eprintfn "%s" message

  let rec run () =
    printf "> "
    match Console.ReadLine() with
    | null ->
      ()
    | line ->
      read line
      run ()

  [<EntryPoint>]
  let main _ =
    printfn "%s" "ようこそジャパリパークへ！"
    run ()
    0
