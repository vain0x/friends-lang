#!/usr/bin/env fsharpi

open System
open System.IO

type BatchScript =
  | BatchScript of string * string

let eol = Environment.NewLine

let main () =
  let solutionDir = Environment.CurrentDirectory
  assert (solutionDir.EndsWith("src"))
  let projectDirs = Directory.GetDirectories(solutionDir)

  let write (BatchScript (fileName, content)) =
    let filePath = Path.Combine(solutionDir, fileName)
    let content = content + (if content.EndsWith(eol) then "" else eol)
    File.WriteAllText(filePath, content)

  let (_nontestProjectNames, testProjectNames) =
    let ps = ResizeArray()
    let ts = ResizeArray()
    for projectDir in projectDirs do
      let projectName = Path.GetFileName(projectDir)
      if Path.GetExtension(projectName) = ".Tests" then
        ts.Add(projectName)
      else
        ps.Add(projectName)
    (ps.ToArray(), ts.ToArray())

  let testScript =
    let content =
      [|
        for name in testProjectNames do
          yield sprintf "dotnet test -c Release ./%s/" name
      |]
      |> String.concat eol
    BatchScript ("test.sh", content)

  let watchScript =
    let content =
      [|
        for name in testProjectNames do
          yield sprintf "cd ./%s/ && dotnet watch test &" name
        yield "wait"
      |]
      |> String.concat eol
    BatchScript ("watch.sh", content)

  write testScript
  write watchScript
  0

main ()
