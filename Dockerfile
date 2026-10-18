# Production Dockerfile for StudyMate on ARM64 / x86_64
FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5173
ENV STORAGE_DIR=/app/storage

# Create storage volume directory
RUN mkdir -p /app/storage

# Copy pre-built production assets and server
COPY package.json ./
COPY dist ./dist
COPY server.js ./server.js

EXPOSE 5173

CMD ["node", "server.js"]
