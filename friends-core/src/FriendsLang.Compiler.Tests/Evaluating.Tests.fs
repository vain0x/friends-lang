namespace FriendsLang.Compiler

open FriendsLang.Compiler.Ast
open FriendsLang.Compiler.Evaluating
open Persimmon
open Persimmon.Syntax.UseTestNameByReflection

module ``test Term`` =
  let x = VarTerm (Variable.Create("X"))
  let y = VarTerm (Variable.Create("Y"))
  let listTerm = Term.listFromSeq

  let ``test seqFromList`` =
    let body ((headTerm, tailTerm), expected) =
      test {
        do! Term.seqFromList headTerm tailTerm |> assertEquals expected
      }
    parameterize {
      case
        ( (x, Term.nil)
        , ([x], Term.nil)
        )
      case
        ( (x, ConsTerm (y, Term.nil))
        , ([x; y], Term.nil)
        )
      case
        ( (x, ConsTerm (x, y))
        , ([x; x], y)
        )
      run body
    }

module ``test Environment`` =
  let x = VarTerm (Variable.Create("X"))
  let y = VarTerm (Variable.Create("Y"))
  let z = VarTerm (Variable.Create("Z"))
  let socrates = AtomTerm (Atom "socrates")
  let plato = AtomTerm (Atom "plato")
  let listTerm = Term.listFromSeq

  let ``test tryUnify success`` =
    let body (term, term', testTerm, expected) =
      test {
        match Environment.Empty |> Environment.tryUnify term term' with
        | Some env ->
          do! assertEquals (env.Substitute(term)) (env.Substitute(term'))
          do! env.Substitute(testTerm) |> assertEquals expected
        | None ->
          return! fail "Unification failed."
      }
    parameterize {
      // Each atom matches the same atom.
      case
        ( socrates, socrates
        , x, x
        )
      // Variables match each other and don't refer to circularly.
      case
        ( x, y
        , x, y
        )
      // Unbound variables match any terms.
      case
        ( x, socrates
        , x, socrates
        )
      case
        ( x, listTerm [socrates; plato]
        , x, listTerm [socrates; plato]
        )
      // Bound variables match bound terms.
      case
        ( listTerm [x; Term.succ x]
        , listTerm [Term.zero; y]
        , y, Term.succ Term.zero
        )
      // Each list term matches the list term with the same content.
      case
        ( listTerm [x; y]
        , listTerm [socrates; plato]
        , x, socrates
        )
      // Lists with tail term match lists.
      case
        ( Term.listWithTailFromSeq x []
        , listTerm []
        , x, listTerm []
        )
      case
        ( Term.listWithTailFromSeq x []
        , listTerm [socrates; plato]
        , x, (listTerm [socrates; plato])
        )
      case
        ( Term.listWithTailFromSeq x [y; z]
        , listTerm [socrates; plato]
        , x, (listTerm [])
        )
      case
        ( Term.listWithTailFromSeq x [z]
        , Term.listWithTailFromSeq y [socrates; plato]
        , x, (Term.listWithTailFromSeq y [plato])
        )
      run body
    }

  let ``test tryUnify failure`` =
    let body (term, term') =
      test {
        match Environment.Empty |> Environment.tryUnify term term' with
        | Some _ ->
          return! fail "Unification succeeded unexpectedly."
        | None ->
          return ()
      }
    parameterize {
      case (socrates, plato)
      case (listTerm [x], listTerm [x; y])
      run body
    }

module ``test Knowledge `` =
  let query prop knowledge =
    knowledge |> Knowledge.query prop
    |> Seq.map (fun xs -> xs |> Array.map (fun (var, term) -> (var.Name, term)))

  let human = Predicate "human"
  let mortal = Predicate "mortal"
  let x = VarTerm (Variable.Create "X")
  let y = VarTerm (Variable.Create "Y")

  let socrates = AtomTerm (Atom "socrates")
  let plato = AtomTerm (Atom "plato")

  let socratesIsHuman =
    AxiomRule (human.[socrates])
  let platoIsHuman =
    AxiomRule (human.[plato])
  let humanIsMortal =
    InferRule
      ( mortal.[x]
      , AtomicProposition (human.[x])
      )

  let socratesKnowledge =
    Knowledge.Empty
      .Add(socratesIsHuman)
      .Add(platoIsHuman)
      .Add(humanIsMortal)

  let ``test Add and FindAll`` =
    test {
      let knowledge = socratesKnowledge
      do!
        knowledge.FindAll(human)
        |> Seq.toArray
        |> assertEquals [|socratesIsHuman; platoIsHuman|]
      do!
        knowledge.FindAll(mortal)
        |> Seq.toArray
        |> assertEquals [|humanIsMortal|]
      do!
        knowledge.FindAll(Predicate "unknown-predicate")
        |> Seq.isEmpty
        |> assertEquals true
    }

  let ``test prove`` =
    test {
      let knowledge = socratesKnowledge
      let prove prop = Knowledge.prove prop Environment.Empty
      do!
        knowledge
        |> prove (AtomicProposition (human.[socrates]))
        |> Seq.length
        |> assertEquals 1
      do!
        knowledge
        |> prove (AtomicProposition (mortal.[x]))
        |> Seq.length
        |> assertEquals 2
    }

  let ``test query`` =
    let body (prop, expected) =
      test {
        do!
          socratesKnowledge
          |> Knowledge.query prop
          |> Seq.map
            (fun assignments ->
              assignments |> Array.map (fun (var, term) -> (var.Name, term))
            )
          |> Seq.toArray
          |> assertEquals expected
      }
    parameterize {
      case
        ( AtomicProposition mortal.[x]
        , [|
            [|("X", socrates)|]
            [|("X", plato)|]
          |]
        )
      run body
    }

  module ``test FizzBuzz`` =
    let zero = AtomTerm (Atom "0")
    let app f t = AppTerm (Atom f, t)
    let succ t = AppTerm (Atom "次", t)
    let listTerm = Term.listFromSeq
    let andProp props = AndProposition (Vector.ofSeq props)

    let fizzAtom = AtomTerm (Atom "Fizz")
    let buzzAtom = AtomTerm (Atom "Buzz")
    let fizzBuzzAtom = AtomTerm (Atom "FizzBuzz")
    let fizzBuzzPredicate =
      Predicate "FizzBuzz"
    let fizzBuzzProposition x y =
      fizzBuzzPredicate.[Term.listFromSeq [x; y]]
    let natural = Predicate "natural"
    let multiple3 = Predicate "multiple-3"
    let multiple5 = Predicate "multiple-5"
    let multiple15 = Predicate "multiple-15"
    let lessThan l r = (Predicate "lessThan").[listTerm [l; r]]
    let between x l r = (Predicate "between").[listTerm [x; l; r]]
    let l = VarTerm (Variable.Create "L")
    let r = VarTerm (Variable.Create "R")

    let knowledge =
      [|
        // natural
        AxiomRule natural.[zero]
        InferRule
          ( natural.[succ x]
          , AtomicProposition natural.[x]
          )
        // multiple3
        AxiomRule multiple3.[zero]
        InferRule
          ( multiple3.[x |> succ |> succ |> succ]
          , AtomicProposition multiple3.[x]
          )
        // multiple5
        AxiomRule multiple5.[zero]
        InferRule
          ( multiple5.[x |> succ |> succ |> succ |> succ |> succ]
          , AtomicProposition multiple5.[x]
          )
        // multiple15
        InferRule
          ( multiple15.[x]
          , andProp ([multiple3.[x]; multiple5.[x]] |> List.map AtomicProposition)
          )
        // fizzBuzz
        InferRule
          ( fizzBuzzProposition x fizzBuzzAtom
          , andProp [AtomicProposition multiple15.[x]; CutProposition]
          )
        InferRule
          ( fizzBuzzProposition x fizzAtom
          , andProp [AtomicProposition multiple3.[x]; CutProposition]
          )
        InferRule
          ( fizzBuzzProposition x buzzAtom
          , andProp [AtomicProposition multiple5.[x]; CutProposition]
          )
        InferRule
          ( fizzBuzzProposition x x
          , AtomicProposition natural.[x]
          )
        // lessThan
        AxiomRule (lessThan (Term.zero) (Term.succ y))
        InferRule
          ( lessThan (Term.succ x) (Term.succ y)
          , AtomicProposition (lessThan x y)
          )
        // between
        InferRule
          ( between l l r
          , AtomicProposition (lessThan l r)
          )
        InferRule
          ( between x l r
          , andProp
              ([(lessThan l r); (between x (Term.succ l) r)] |> List.map AtomicProposition)
          )
      |]
      |> fun rules -> Knowledge.FromRules(rules)

    let prove prop = knowledge |> Knowledge.prove prop Environment.Empty

    let ``test prove`` =
      test {
        do!
          prove (AtomicProposition multiple3.[zero]) |> Seq.length
          |> assertEquals 1
        do!
          prove (AtomicProposition multiple3.[Term.ofNatural 1]) |> Seq.length
          |> assertEquals 0
        do!
          prove (AtomicProposition multiple3.[Term.ofNatural 6]) |> Seq.length
          |> assertEquals 1
        do!
          prove (AtomicProposition multiple15.[Term.zero]) |> Seq.length
          |> assertEquals 1
        do!
          prove (AtomicProposition multiple15.[Term.ofNatural 6]) |> Seq.length
          |> assertEquals 0
        do!
          prove (AtomicProposition multiple15.[Term.ofNatural 30]) |> Seq.length
          |> assertEquals 1
        do!
          prove (AtomicProposition (fizzBuzzProposition (Term.ofNatural 3) fizzAtom))
          |> Seq.length
          |> assertEquals 1
        do!
          let n = Term.ofNatural 14
          prove (AtomicProposition (fizzBuzzProposition n n))
          |> Seq.length
          |> assertEquals 1
        do!
          prove (AtomicProposition (lessThan Term.zero Term.zero))
          |> Seq.length
          |> assertEquals 0
        do!
          prove (AtomicProposition (lessThan Term.zero (Term.ofNatural 1)))
          |> Seq.length
          |> assertEquals 1
        do!
          prove (AtomicProposition (lessThan (Term.ofNatural 3) (Term.ofNatural 5)))
          |> Seq.length
          |> assertEquals 1
        do!
          prove (AtomicProposition (between x Term.zero (Term.ofNatural 3)))
          |> Seq.map (fun env -> env.Substitute(x))
          |> Seq.toArray
          |> assertEquals [|for i in 0..2 -> Term.ofNatural i|]
      }

    let ``test query`` =
      test {
        let query prop = knowledge |> query prop
        do!
          query (AtomicProposition (multiple3.[x]))
          |> Seq.take 3
          |> Seq.collect (Seq.map snd)
          |> Seq.toArray
          |> assertEquals [|Term.zero; Term.ofNatural 3; Term.ofNatural 6|]
        do!
          query (AtomicProposition (fizzBuzzProposition (Term.ofNatural 3) x))
          |> Seq.toArray
          |> assertEquals [|[|("X", fizzAtom)|]|]
        do!
          let n = 16
          let prop =
            andProp
              [
                AtomicProposition (between x Term.zero (Term.ofNatural n))
                AtomicProposition (fizzBuzzProposition x y)
              ]
          query prop
          |>  Seq.toArray
          |> assertEquals
            [|for i in 0..(n - 1) ->
                let y =
                  if i % 15 = 0 then fizzBuzzAtom
                  elif i % 3 = 0 then fizzAtom
                  elif i % 5 = 0 then buzzAtom
                  else Term.ofNatural i
                [|("X", Term.ofNatural i); ("Y", y)|]
            |]
      }

  module ``test arithmetic`` =
    let zero = AtomTerm (Atom "0")
    let app f t = AppTerm (Atom f, t)
    let succ t = AppTerm (Atom "次", t)
    let listTerm = Term.listFromSeq
    let pairTerm x y = listTerm [|x; y|]
    let andProp props = AndProposition (Vector.ofSeq props)

    let x = VarTerm (Variable.Create "X")
    let y = VarTerm (Variable.Create "Y")
    let z = VarTerm (Variable.Create "Z")

    let equal = Predicate "equal"
    let add x y = app "add" (listTerm [|x; y|])
    let subtract x y = app "subtract" (pairTerm x y)

    let knowledge =
      [|
        // add
        AxiomRule equal.[pairTerm (add x zero) x]
        InferRule
          ( equal.[pairTerm (add x (succ y)) (succ z)]
          , AtomicProposition equal.[pairTerm (add x y) z]
          )
        // subtract
        InferRule
          ( equal.[pairTerm (subtract x y) z]
          , AtomicProposition equal.[pairTerm (add z y) x]
          )
      |]
      |> fun rules -> Knowledge.FromRules(rules)

    let query prop =
      knowledge |> query prop

    let ``test query equal(add)`` =
      test {
        do!
          // 1 + 2 = z
          let equation = equal.[pairTerm (add (Term.ofNatural 1) (Term.ofNatural 2)) z] in
          query (AtomicProposition equation)
          |> Seq.toArray
          |> assertEquals [|[|("Z", Term.ofNatural 3)|]|]
        do!
          // 1 + y = 3
          let equation = equal.[pairTerm (add (Term.ofNatural 1) y) (Term.ofNatural 3)] in
          query (AtomicProposition equation)
          |> Seq.toArray
          |> assertEquals [|[|("Y", Term.ofNatural 2)|]|]
      }

    let ``test query equal(add) nondeterminism`` =
      test {
        do!
          // x + y = 3
          query (AtomicProposition (equal.[pairTerm (add x y) (Term.ofNatural 3)]))
          |> Seq.toArray
          |> assertEquals
            [|
              for i in 0..3 ->
                [|
                  ("X", Term.ofNatural (3 - i))
                  ("Y", Term.ofNatural i)
                |]
            |]
        do!
          // 1 + y = z
          let n = 5 in
          query (AtomicProposition (equal.[pairTerm (add (Term.ofNatural 1) y) z]))
          |> Seq.take n
          |> Seq.toArray
          |> assertEquals
            [|
              for i in 0..(n - 1) ->
                [|
                  ("Y", Term.ofNatural i)
                  ("Z", Term.ofNatural (i + 1))
                |]
            |]
      }

    let ``test query equal(subtract)`` =
      test {
        // 3 - 1 = z
        do!
          let equation = equal.[pairTerm (subtract (Term.ofNatural 3) (Term.ofNatural 1)) z] in
          query (AtomicProposition equation)
          |> Seq.toArray
          |> assertEquals [|[|("Z", Term.ofNatural 2)|]|]
        // 1 - 3 = z (No solution)
        do!
          let equation = equal.[pairTerm (subtract (Term.ofNatural 1) (Term.ofNatural 3)) z] in
          query (AtomicProposition equation)
          |> Seq.toArray
          |> assertEquals [||]
      }
