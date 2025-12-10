# Build stage
FROM node:20 AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code, build config, and public assets
COPY tsconfig.json tsconfig.build.json ./
COPY src/ ./src/
COPY public/ ./public/

# Build TypeScript
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

LABEL org.opencontainers.image.source="https://github.com/ausward/QTLogs"

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm install --omit=dev

# Copy built files from builder stage
COPY --from=builder /app/dist ./dist

# Copy public assets from builder stage
COPY --from=builder /app/public ./public

# Create data directory for persistent database storage
RUN mkdir -p /app/data

# Expose the application port
EXPOSE 3000

# Run the application
CMD ["node", "dist/index.js"]
