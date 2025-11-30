# Build stage
FROM node:20 AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code and build config
COPY tsconfig.json tsconfig.build.json ./
COPY src/ ./src/

# Build TypeScript
RUN ./node_modules/.bin/tsc -p tsconfig.build.json

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm install --omit=dev

# Copy built files from builder stage
COPY --from=builder /app/dist ./dist

# Copy public assets
COPY public/ ./public/

# Expose the application port
EXPOSE 3000

# Run the application
CMD ["node", "dist/index.js"]
