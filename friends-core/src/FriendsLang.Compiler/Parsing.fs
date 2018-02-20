namespace FriendsLang.Compiler.Parsing

open System
open FParsec
open FriendsLang.Compiler
open FriendsLang.Compiler.Ast
open FriendsLang.Compiler.Evaluating

module Parsing =
  module internal Internal =
    type BinaryTree<'x> =
      | Leaf
        of 'x
      | Node
        of BinaryTree<'x> * BinaryTree<'x>

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

    let blank = unicodeSpaces

    let identifierCharParser =
      letter <|> digit <|> pchar '_'

    let identifierParser: Parser<string> =
      many1Chars identifierCharParser

    let keywordParser wordParser =
      blank >>. wordParser >>. notFollowedBy identifierCharParser >>. blank

    let hagamoParser: Parser<unit> =
      keywordParser (skipAnyOf "はがも")

    let (termParser: Parser<Term>, termParserRef) =
      createParserForwardedToRef ()

    let atomOrVarTermParser =
      let predefinedVarNames =
        [|
          "あなた"; "きみ"; "かれ"; "かのじょ"; "だれ"
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
      |> attempt

    let quotedTermParser =
      parse {
        do! skipChar '「' |> attempt
        do! blank
        let! term = termParser
        do! blank >>. skipChar '」'
        return term
      }

    let atomicTermParser =
      naturalTermParser
      <|> quotedTermParser
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
        let! optionalTerms =
          let joshiParser =
            notFollowedBy (skipString "フレンズ")
            >>. identifierParser
          many (attempt (termParser .>> blank .>> joshiParser .>> blank))
        let! predicateName = identifierParser
        do! keywordParser (skipString "フレンズ")
        let term =
          if optionalTerms |> List.isEmpty
          then term
          else Term.listFromSeq (term :: optionalTerms)
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

    let cutParser =
      skipString "たーのしー！" |> keywordParser |> opt |>> Option.isSome

    let axiomRuleParser =
      parse {
        let! prop =
          parse {
            let! prop = atomicPropositionParser
            do! keywordParser (skipString "なんだね！")
            return prop
          } |> attempt
        let! existsCut = cutParser
        return
          if existsCut
          then InferRule (prop, CutProposition)
          else AxiomRule prop
      }

    let inferRuleParser =
      parse {
        let! bodyProp =
          parse {
            let! bodyProp = propositionParser
            do! keywordParser (skipString "なら")
            return bodyProp
          } |> attempt
        let! headProp = atomicPropositionParser
        do! keywordParser (skipString "なんだね！")
        let! existsCut = cutParser
        let bodyProp = if existsCut then bodyProp.And(CutProposition) else bodyProp
        return InferRule (headProp, bodyProp)
      }

    let ruleParser =
      parse {
        do! keywordParser (skipString "すごーい！") |> attempt
        return! axiomRuleParser <|> inferRuleParser
      }

    let queryParser =
      parse {
        let! prop = propositionParser
        do! keywordParser (skipString "なんだっけ？")
        return Query prop
      }

    let statementParser =
      (ruleParser |>> Rule)
      <|> queryParser

    let inputParser =
      parse {
        do! blank
        let! statement = statementParser
        do! blank >>. eof
        return statement
      }

    let run source parser =
      match runParserOnString parser () "input" source with
      | Success (statement, (), _) ->
        statement |> Result.Ok
      | Failure (message, _, _) ->
        message |> Result.Error

  open Internal

  let parseTerm source =
    termParser |> run source

  let parseStatement source =
    inputParser |> run source
