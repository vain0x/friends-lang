module FriendsLang.Repl.Tests

open Persimmon
open Persimmon.Syntax.UseTestNameByReflection

let ``my test`` =
  test {
    do! assertPred true
  }
