FROM node:22-alpine3.19

WORKDIR /app
RUN apk update
RUN apk add --upgrade texlive-full
RUN apk add --upgrade make
RUN apk add --upgrade zip

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 8080

CMD ["node", "server.js"]