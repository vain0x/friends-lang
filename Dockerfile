FROM fsharp:4.1
ENV FRIENDS_VERSION 1.0.2
RUN sudo apt-get update \
    && apt-get install -y zip
RUN cd /usr/local/src \
    && wget https://github.com/vain0/VainZero.Friends/archive/v${FRIENDS_VERSION}.zip \
    && unzip v${FRIENDS_VERSION}.zip \
    && rm v${FRIENDS_VERSION}.zip \
    && cd VainZero.Friends-${FRIENDS_VERSION} \
    && mono .paket/paket.bootstrapper.exe \
    && mono .paket/paket.exe install \
    && xbuild VainZero.Friends.sln
RUN echo "#!/usr/bin/env bash\nmono /usr/local/src/VainZero.Friends-${FRIENDS_VERSION}/VainZero.Friends.Repl/bin/Debug/VainZero.Friends.Repl.exe" >> /usr/local/bin/friends \
    && chmod +x /usr/local/bin/friends
