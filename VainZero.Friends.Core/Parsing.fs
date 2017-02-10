namespace VainZero.Friends.Core

open System
open Basis.Core
open FParsec

module Parsing =
  module internal Internal =
    type BinaryTree<'x> =
      | Leaf
        of 'x
      | Node
        of BinaryTree<'x> * BinaryTree<'x>

    [<CompilationRepresentation(CompilationRepresentationFlags.ModuleSuffix)>]
    module BinaryTree =
      let rec toSeq tree =
        seq {
          match tree with
          | Leaf x ->
            yield x
          | Node (l, r) ->
            yield! toSeq l
            yield! toSeq r
        }

    type Parser<'x> = Parser<'x, unit>

    let list1Parser p op =
      parse {
        let separatorParser =
          attempt (op |>> (fun () l r -> Node(l, r)))
        let! tree = chainl1 (p |>> Leaf) separatorParser
        return tree |> BinaryTree.toSeq |> Seq.toList
      }

    let hagamoParser: Parser<unit> =
      skipAnyOf "はがも"

    let identifierParser: Parser<string> =
      many1Chars (letter <|> digit <|> pchar '_')

    let varIdentifierParser =
      attempt (regex @"あなた|きみ|だれ|なに")
      <|> (followedBy (skipChar '_') >>. identifierParser)

    let (termParser: Parser<Term>, termParserRef) =
      createParserForwardedToRef ()

    let varTermParser =
      parse {
        let! name = varIdentifierParser
        return VarTerm (Variable.Create(name))
      }

    let atomTermParser =
      parse {
        let! name = identifierParser
        return AtomTerm (Atom name)
      }

    let naturalTermParser =
      let succ = Atom "次"
      parse {
        let! digits = many1Chars digit
        do! notFollowedBy (letter <|> pchar '_')
        match Int32.TryParse(digits) with
        | (true, n) ->
          if n < 0 then
            failwith "never"
          else
            let rec loop i =
              if i = 0 then
                AtomTerm (Atom "0")
              else
                AppTerm (succ, loop (i - 1))
            return loop n
        | (false, _) ->
          return! fail "Too large numeric literal."
      }

    let atomicTermParser =
      attempt varTermParser
      <|> attempt naturalTermParser
      <|> atomTermParser

    let appTermParser =
      parse {
        let separatorParser = spaces1 >>. skipChar 'の' >>. spaces1
        let! terms = list1Parser atomicTermParser separatorParser
        match terms with
        | [] -> failwith "never"
        | term :: terms ->
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
        let separatorParser = spaces1 >>. skipChar 'と' >>. spaces1
        let! terms = list1Parser appTermParser separatorParser
        match terms with
        | [term] ->
          return term
        | terms ->
          return ListTerm terms
      }

    termParserRef :=
      listTermParser

    let axiomRuleParser =
      parse {
        let! term = termParser
        do! spaces1 >>. hagamoParser >>. spaces1
        let! predicateName = identifierParser
        do! spaces1 >>. skipString "フレンズ" >>. spaces >>. skipString "なんだね！"
        let prop = Proposition.Create(Predicate predicateName, term)
        return AxiomRule prop
      }

    let inferRuleParser =
      parse {
        let! bodyTerm = termParser
        do! spaces1 >>. hagamoParser >>. spaces1
        let! bodyPredicateName = identifierParser
        do! spaces1 >>. skipString "フレンズ" >>. spaces >>. skipString "なら" >>. spaces1
        let! headTerm = termParser
        do! spaces1 >>. hagamoParser >>. spaces1
        let! headPredicateName = identifierParser
        do! spaces1 >>. skipString "フレンズ" >>. spaces >>. skipString "なんだね！"
        let head = Proposition.Create(Predicate headPredicateName, headTerm)
        let body = Proposition.Create(Predicate bodyPredicateName, bodyTerm)
        return InferRule (head, body)
      }

    let ruleParser =
      parse {
        do! skipString "すごーい！" >>. spaces1
        return! attempt axiomRuleParser <|> inferRuleParser
      }

    let queryParser =
      parse {
        let! term = termParser
        do! spaces1 >>. hagamoParser >>. spaces1
        let! predicateName = identifierParser
        do! spaces1 >>. skipString "フレンズ" >>. spaces >>. skipString "なんだっけ？"
        let prop = Proposition.Create(Predicate predicateName, term)
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
      match runParserOnString parser () "にゅうりょく" source with
      | Success (statement, (), _) ->
        statement |> Result.Success
      | Failure (message, _, _) ->
        message |> Result.Failure

  open Internal

  let parseTerm source =
    termParser |> run source

  let parseStatement source =
    inputParser |> run source
