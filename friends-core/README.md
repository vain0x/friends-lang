# Friends-lang Core

A Friends-lang processor on .NET Core.

- Compiler as class library
- REPL app

## CONTRIBUTING
### Development Environment

- Prerequisites:
    - [.NET Core CLI tools](https://www.google.co.jp/search?q=.NET+Core+CLI+tools) (>= 2.0.0)
    - **F# tools** for .NET Core (See <http://fsharp.org/>.)

- Verify:
    ```sh
    dotnet --version
    fsharpc --help
    ```

- Recommended:
    - **VSCode** with the following extensions:
        - C# (for debugging)
        - Ionide-fsharp
        - EditorConfig for VS Code

- Set up:
    ```sh
    cd ./src/
    dotnet restore
    ./test.sh
    ```

- Run:
    ```sh
    dotnet run --project ./FriendsLang.Repl/
    ```

- Scripts:
    - **watch.sh**:
        Executes all unit tests whenever source changed.
    - **test.sh**:
        Executes all unit tests.
    - **publish.sh**:
        Generates executable files.
