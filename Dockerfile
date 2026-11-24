FROM node:24-bookworm-slim
WORKDIR /app
COPY package.json ./
COPY src ./src
RUN npm run build
RUN mkdir -p /app/data && chown -R node:node /app
USER node
VOLUME ["/app/data"]
EXPOSE 3000
CMD ["npm", "start"]
