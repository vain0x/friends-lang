namespace FriendsLang.Compiler.Printing
  open FriendsLang.Compiler
  open FriendsLang.Compiler.Ast
  open FriendsLang.Compiler.Evaluating

  module Printing =
    let quote s =
      sprintf "「%s」" s

    let rec (|NaturalTerm|_|) =
      function
      | AtomTerm (Atom "0") ->
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
