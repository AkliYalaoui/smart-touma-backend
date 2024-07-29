FROM node:22-alpine3.19

WORKDIR /app
RUN apt-get update && apt-get install texlive && apt-get clean
COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 8080

CMD ["node", "server.js"]