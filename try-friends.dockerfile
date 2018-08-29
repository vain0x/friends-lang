FROM microsoft/aspnetcore-build
WORKDIR /app
ADD ./ ./
RUN cd try-friends/FriendsLang.WebTrial && \
        npm install && \
        dotnet restore && \
        dotnet build
EXPOSE 80
WORKDIR /app/try-friends/FriendsLang.WebTrial
ENTRYPOINT [ "dotnet", "run", "-c", "Release" ]
