FROM node:20-alpine
WORKDIR /app

RUN npm install -g bun

COPY package.json ./
RUN bun install

COPY . .

EXPOSE 3003

CMD ["bun", "run", "index.ts"]
