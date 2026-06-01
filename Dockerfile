FROM ghcr.io/puppeteer/puppeteer:latest

USER root
WORKDIR /app
COPY package*.json ./
RUN npm install

COPY . .

# Run as non-root user (provided by puppeteer image)
USER pptruser

EXPOSE 3001
CMD ["node", "server.js"]
