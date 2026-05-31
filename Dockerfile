FROM node:20-bullseye

# Install dependencies for Playwright/Puppeteer and SQLite3 build
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    libnss3 \
    libxss1 \
    libasound2 \
    libgbm1 \
    libgtk-3-0 \
    xauth \
    xvfb \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 3001

CMD ["node", "server.js"]
