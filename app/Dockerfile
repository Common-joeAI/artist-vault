FROM node:20-bookworm-slim

RUN apt-get update   && apt-get install -y openssl ca-certificates wget   && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

COPY . .

RUN npx prisma generate && npx prisma db push && npm run build

EXPOSE 3002

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3   CMD wget -qO- http://127.0.0.1:3002/api/health || exit 1

CMD ["sh","-lc","npx prisma db push && mkdir -p public/uploads && npm run start -- --hostname 0.0.0.0 --port 3002"]
