namespace FriendsLang.Repl

open System
open System.Text
open FriendsLang.Compiler
open FriendsLang.Compiler.Ast
open FriendsLang.Compiler.Parsing
open FriendsLang.Compiler.Evaluating

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
  open FriendsLang.Compiler.Printing.Printing

  let mutable knowledge = Knowledge.Empty
  let mutable buffer = StringBuilder()

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
    if buffer.Length > 0 || line |> String.isEmpty |> not then
      buffer.AppendLine(line) |> ignore
      let source = string buffer
      match Parsing.parseStatement source with
      | Result.Ok statement ->
        match statement with
        | Rule rule ->
          knowledge <- knowledge.Add(rule)
        | Query prop ->
          query prop
        buffer.Clear() |> ignore
      | Result.Error message ->
        if line |> String.isEmpty then
          eprintfn "%s" message
          buffer.Clear() |> ignore

  let rec run () =
    printf "%s" (if buffer.Length = 0 then "> " else "| ")
    let line = Console.ReadLine()
    if line |> isNull |> not then
      let line = line |> String.trimEnd [|' '|]
      read (line |> String.trimEnd [|' '|])
      run ()

  [<EntryPoint>]
  let main _ =
    try
      Encoding.RegisterProvider(CodePagesEncodingProvider.Instance)

      printfn "%s" "ようこそジャパリパークへ！"
      run ()
    with
    | e -> eprintfn "%A" e
    0
