FROM node:20-bookworm

WORKDIR /app

COPY node_modules ./node_modules
COPY package*.json ./

ARG CACHE_BUST=1
COPY . .

ENV PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1
ENV DATABASE_URL="file:/app/dev.db"
ENV NEXTAUTH_SECRET="placeholder"
ENV NEXTAUTH_URL="https://aiartistvault.com"

RUN npm run build

EXPOSE 3002

CMD ["node_modules/.bin/next", "start", "--hostname", "0.0.0.0", "--port", "3002"]
