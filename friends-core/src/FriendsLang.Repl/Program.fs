namespace FriendsLang.Repl

open System
open FriendsLang.Compiler

module Program =
  [<EntryPoint>]
  let main _ =
    printfn "Compiler.zero = %d" Compiler.zero
    0
