namespace VainZero.Friends.Core

open System
open Basis.Core
open FParsec
open VainZero.Collections

module Parsing =
  module internal Internal =
    type BinaryTree<'x> =
      | Leaf
        of 'x
      | Node
        of BinaryTree<'x> * BinaryTree<'x>

    [<CompilationRepresentation(CompilationRepresentationFlags.ModuleSuffix)>]
    module BinaryTree =
      let rec toNonemptyList =
        function
        | Leaf x ->
          (x, [])
        | Node (l, r) ->
          let (lh, lt) = l |> toNonemptyList
          let (rh, rt) = r |> toNonemptyList
          (lh, List.append lt (rh :: rt))

    type Parser<'x> = Parser<'x, unit>

    let list1Parser p op =
      parse {
        let separatorParser =
          attempt (op |>> (fun () l r -> Node(l, r)))
        let! tree = chainl1 (p |>> Leaf) separatorParser
        return tree |> BinaryTree.toNonemptyList
      }
    let identifierCharParser =
      letter <|> digit <|> pchar '_'

    let identifierParser: Parser<string> =
      many1Chars identifierCharParser

    let keywordParser wordParser =
      spaces >>. wordParser >>. notFollowedBy identifierCharParser >>. spaces

    let hagamoParser: Parser<unit> =
      keywordParser (skipAnyOf "はがも")

    let (termParser: Parser<Term>, termParserRef) =
      createParserForwardedToRef ()

    let atomOrVarTermParser =
      let predefinedVarNames =
        [|
          "あなた"; "きみ"; "だれ"
          "なに"; "あれ"; "これ"; "これら"; "それ"; "それら"
        |]
        |> set
      parse {
        let! name = identifierParser
        return
          if predefinedVarNames |> Set.contains name || name.StartsWith("_")
          then VarTerm (Variable.Create(name))
          else AtomTerm (Atom name)
      }

    let naturalTermParser =
      parse {
        let! digits = many1Chars digit
        do! notFollowedBy identifierCharParser
        match Int32.TryParse(digits) with
        | (true, n) ->
          return Term.ofNatural n
        | (false, _) ->
          return! fail "Too large numeric literal."
      }

    let atomicTermParser =
      attempt naturalTermParser
      <|> atomOrVarTermParser

    let appTermParser =
      parse {
        let separatorParser = keywordParser (skipChar 'の')
        let! (term, terms) = list1Parser atomicTermParser separatorParser
        let rec functors terms =
          parse {
            match terms with
            | [] ->
              return []
            | (AtomTerm atom :: terms) ->
              let! tail = functors terms
              return atom :: tail
            | _ ->
              return! fail "Functor must be an atom."
          }
        let! atoms = functors terms
        return atoms |> Seq.fold (fun term atom -> AppTerm (atom, term)) term
      }

    let listTermParser =
      parse {
        let separatorParser = keywordParser (skipChar 'と')
        let! (term, terms) = list1Parser appTermParser separatorParser
        let! endsWithTail =
          skipString "とか" |> keywordParser |> attempt |> opt
          |>> Option.isSome
        return
          if terms |> List.isEmpty then
            term
          else if endsWithTail then
            let (terms, tailTerm) = (term, terms) |> NonemptyList.decomposeLast
            Term.listWithTailFromSeq tailTerm terms
          else
            (term :: terms) |> Term.listFromSeq
      }

    termParserRef :=
      listTermParser

    let atomicPropositionParser =
      parse {
        let! term = termParser
        do! hagamoParser
        let! predicateName = identifierParser
        do! keywordParser (skipString "フレンズ")
        return (Predicate predicateName).[term]
      }

    let andPropositionParser =
      parse {
        let elementParser =
          parse {
            let! prop = atomicPropositionParser
            return AtomicProposition prop
          }
        let separatorParser =
          keywordParser (skipString "で")
        let! (prop, props) = list1Parser elementParser separatorParser
        return
          if props |> List.isEmpty
          then prop
          else AndProposition (Vector.ofList (prop :: props))
      }

    let propositionParser =
      andPropositionParser

    let axiomRuleParser =
      parse {
        let! prop = atomicPropositionParser
        do! keywordParser (skipString "なんだね！")
        return AxiomRule prop
      }

    let inferRuleParser =
      parse {
        let! bodyProp = propositionParser
        do! keywordParser (skipString "なら")
        let! headProp = atomicPropositionParser
        do! keywordParser (skipString "なんだね！")
        return InferRule (headProp, bodyProp)
      }

    let ruleParser =
      parse {
        do! keywordParser (skipString "すごーい！")
        return! attempt axiomRuleParser <|> inferRuleParser
      }

    let queryParser =
      parse {
        let! prop = propositionParser
        do! keywordParser (skipString "なんだっけ？")
        return Query prop
      }

    let statementParser =
      attempt (ruleParser |>> Rule)
      <|> queryParser

    let inputParser =
      parse {
        do! spaces
        let! statement = statementParser
        do! spaces >>. eof
        return statement
      }

    let run source parser =
      match runParserOnString parser () "input" source with
      | Success (statement, (), _) ->
        statement |> Result.Success
      | Failure (message, _, _) ->
        message |> Result.Failure

  open Internal

  let parseTerm source =
    termParser |> run source

  let parseStatement source =
    inputParser |> run source
