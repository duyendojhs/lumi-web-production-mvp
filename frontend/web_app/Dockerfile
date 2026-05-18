FROM node:20-alpine

WORKDIR /app

COPY frontend/web_app/package*.json ./frontend/web_app/

WORKDIR /app/frontend/web_app
RUN npm ci

WORKDIR /app
COPY ai_module ./ai_module
COPY frontend/web_app ./frontend/web_app

WORKDIR /app/frontend/web_app
RUN npm run build

EXPOSE 3000

CMD ["npm", "run", "start"]
