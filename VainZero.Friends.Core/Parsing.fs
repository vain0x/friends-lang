namespace VainZero.Friends.Core

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

    let atomicTermParser =
      attempt varTermParser
      <|> atomTermParser

    let listTermParser =
      parse {
        let elementParser =
          parse {
            let! term = atomicTermParser
            return Leaf term
          }
        let separatorParser =
          parse {
            do! spaces1 >>. skipChar 'と' >>. spaces1
            return fun left right -> Node (left, right)
          }
          |> attempt
        let! tree = chainl1 elementParser separatorParser
        let terms = tree |> BinaryTree.toSeq |> Seq.toList
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

  let parseStatement source =
    match runParserOnString Internal.inputParser () "にゅうりょく" source with
    | Success (statement, (), _) ->
      statement |> Result.Success
    | Failure (message, _, _) ->
      message |> Result.Failure
