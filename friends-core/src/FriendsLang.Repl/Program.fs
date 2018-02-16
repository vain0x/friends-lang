namespace FriendsLang.Repl

open System
open System.Text
open FriendsLang.Compiler

module String =
  let isEmpty str = String.IsNullOrEmpty(str)
  let trimEnd (chars: char[]) (str: string) = str.TrimEnd(chars)

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
  let mutable knowledge = Knowledge.Empty
  let mutable buffer = StringBuilder()

  let quote s =
    sprintf "「%s」" s

  let rec (|NaturalTerm|_|) =
    function
    | AtomTerm (Atom "0") as term ->
      Some 0
    | AppTerm (Atom "次", NaturalTerm n) ->
      Some (n + 1)
    | _ ->
      None

  let rec printTerm term =
    match term with
    | VarTerm v ->
      quote v.Name
    | NaturalTerm n ->
      sprintf "%d" n
    | AppTerm (a, term) ->
      sprintf "%s の %s" (printTerm term) (quote a.Name)
    | AtomTerm a ->
      quote a.Name
    | ConsTerm (headTerm, tailTerm) ->
      let (terms, tailTerm) = Term.seqFromList headTerm tailTerm
      let head = terms |> Seq.map printTerm |> String.concat " と "
      match tailTerm with
      | NilTerm ->
        head
      | _ ->
        sprintf "%s と %s とか" head (printTerm tailTerm)

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
      | Success statement ->
        match statement with
        | Rule rule ->
          knowledge <- knowledge.Add(rule)
        | Query prop ->
          query prop
        buffer.Clear() |> ignore
      | Failure message ->
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
  let main argv =
    try
      Encoding.RegisterProvider(CodePagesEncodingProvider.Instance);

      printfn "%s" "ようこそジャパリパークへ！"
      run ()
    with
    | e -> eprintfn "%A" e
    0
