namespace VainZero.Friends.Core

open Persimmon
open Persimmon.Syntax.UseTestNameByReflection

module ``test Environment`` =
  let x = VarTerm (Variable.Create("X"))
  let y = VarTerm (Variable.Create("Y"))
  let socrates = AtomTerm (Atom "socrates")
  let plato = AtomTerm (Atom "plato")

  let ``test tryUnify success`` =
    let body (term, term', testTerm, expected) =
      test {
        match Environment.Empty |> Environment.tryUnify term term' with
        | Some env ->
          do! assertEquals (env.Substitute(term)) (env.Substitute(term'))
          do! env.Substitute(x) |> assertEquals expected
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
      // Variables match any terms.
      case
        ( x, socrates
        , x, socrates
        )
      case
        ( x, ListTerm [socrates; plato]
        , x, ListTerm [socrates; plato]
        )
      // Each list term matches the list term with the same content.
      case
        ( ListTerm [x; y]
        , ListTerm [socrates; plato]
        , x, socrates
        )
      run body
    }

  let ``test tryUnify failure`` =
    let body (term, term') =
      test {
        match Environment.Empty |> Environment.tryUnify term term' with
        | Some env ->
          return! fail "Unification succeeded unexpectedly."
        | None ->
          return ()
      }
    parameterize {
      case (socrates, plato)
      case (ListTerm [x], ListTerm [x; y])
      run body
    }
