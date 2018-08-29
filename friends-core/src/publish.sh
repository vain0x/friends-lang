set -eu
test $(basename $(pwd)) = src
rm -rf ./publish/
cd ./FriendsLang.Repl/
dotnet publish -c Release -r win-x64 -o ../publish/friendsi-win-x64
dotnet publish -c Release -r osx-x64 -o ../publish/friendsi-osx-x64
dotnet publish -c Release -r linux-x64 -o ../publish/friendsi-linux-x64
cd ../publish/
zip -r friendsi-win-x64.zip friendsi-win-x64
zip -r friendsi-osx-x64.zip friendsi-osx-x64
zip -r friendsi-linux-x64.zip friendsi-linux-x64
sha256sum --binary *.zip > checksum.txt
