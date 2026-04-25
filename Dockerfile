FROM node:20-slim

WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY . .
RUN npm run build

EXPOSE 8786
CMD ["node", "dist/src/index.js", "api"]
