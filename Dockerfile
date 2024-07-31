FROM node:22-alpine3.19

WORKDIR /app

RUN apk update && \
    apk upgrade && \
    apk add --no-cache perl wget && \
    wget http://mirror.ctan.org/systems/texlive/tlnet/install-tl-unx.tar.gz && \
    tar -xzf install-tl-unx.tar.gz && \
    cd install-tl-* && \
    echo "selected_scheme scheme-small" > texlive.profile && \
    echo "tlpdbopt_install_docfiles 0" >> texlive.profile && \
    echo "tlpdbopt_install_srcfiles 0" >> texlive.profile && \
    ./install-tl --profile=texlive.profile && \
    cd .. && \
    rm -rf install-tl-* install-tl-unx.tar.gz

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 8080

CMD ["node", "server.js"]
