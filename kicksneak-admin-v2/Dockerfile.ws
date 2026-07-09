FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY ws-server.js ./
EXPOSE 3005
CMD ["node", "ws-server.js"]
