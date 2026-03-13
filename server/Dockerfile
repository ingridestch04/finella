# Stage 1: deps
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# Stage 2: builder
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json tsconfig.json ./
RUN npm ci
COPY src ./src
COPY prisma ./prisma
RUN npx prisma generate && npm run build

# Stage 3: runner (~200MB)
FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=deps    /app/node_modules          ./node_modules
COPY --from=builder /app/dist                  ./dist
COPY --from=builder /app/node_modules/.prisma  ./node_modules/.prisma
COPY prisma ./prisma
EXPOSE 3000
CMD ["node", "dist/index.js"]
