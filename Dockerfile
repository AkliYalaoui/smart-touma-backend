FROM node:22-alpine3.19

WORKDIR /app

RUN apk update
RUN apk upgrade
RUN apk add --no-cache perl wget
RUN wget http://mirror.ctan.org/systems/texlive/tlnet/install-tl-unx.tar.gz
RUN tar -xzf install-tl-unx.tar.gz
RUN cd install-tl-20*
RUN ./install-tl

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 8080

CMD ["node", "server.js"]