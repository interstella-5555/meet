FROM oven/bun:1-alpine

WORKDIR /app

COPY apps/chatbot/package.json ./apps/chatbot/package.json
RUN cd apps/chatbot && bun install

COPY apps/chatbot/ ./apps/chatbot/
COPY apps/api/src/db/ ./apps/api/src/db/

ENV NODE_ENV=production

CMD ["bun", "apps/chatbot/src/index.ts"]
