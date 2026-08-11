# Development Dockerfile for Watch Party Extension Server
# Lightweight image for local development — no curl, no postgres clients

FROM node:22-alpine

WORKDIR /app

# Install dependencies (with lockfile for reproducible builds)
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copy source code
COPY . .

# Non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

USER nodejs
EXPOSE 3001

# TCP liveness check — local-relay is a pure WebSocket server (no HTTP /health).
# Reads PORT (default 8080) so the check always targets the actual listen port.
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD node -e "const p=process.env.PORT||8080;require('net').connect(p,'localhost',()=>process.exit(0)).on('error',()=>process.exit(1))"

CMD ["npm", "start"]
