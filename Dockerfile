FROM node:22-alpine3.19

WORKDIR /app
RUN apk update && \
    apk add --no-cache \
    texlive \
    texmf-dist-texlive \
    texlive-xetex \
    texlive-luatex \
    texlive-fonts-recommended \
    texlive-fonts-extra \
    texlive-latex-extra \
    ghostscript
    
COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 8080

CMD ["node", "server.js"]