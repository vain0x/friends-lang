module Test

open Persimmon
open UseTestNameByReflection

let ``my test`` = test {
  do! assertPred true
}

