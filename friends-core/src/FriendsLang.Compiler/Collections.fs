namespace FriendsLang.Compiler

module NonemptyList =
  let decomposeLast (head, tail) =
    let rec decomposeLast acc =
      function
      | [] ->
        ([], head)
      | [last] ->
        (List.rev acc, last)
      | x :: xs ->
        decomposeLast (x :: acc) xs
    decomposeLast [head] tail
