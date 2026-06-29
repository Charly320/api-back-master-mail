# Stage 1: Install all dependencies
FROM node:20-alpine AS deps
# Install dependencies required for native modules (like pg)
RUN apk add --no-cache libc6-compat python3 make g++

WORKDIR /app

# Copy package files and install all dependencies
COPY package*.json ./
RUN npm ci

# Stage 2: Build the application
FROM node:20-alpine AS builder
WORKDIR /app
# Copy node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules
# Copy application source code
COPY . .
# Build the application
RUN npm run build

# Stage 3: Install production dependencies only
FROM node:20-alpine AS prod-deps
# Install dependencies required for native modules
RUN apk add --no-cache libc6-compat python3 make g++
WORKDIR /app
COPY package*.json ./
# Install only production dependencies
RUN npm ci --omit=dev

# Stage 4: Final production image
FROM node:20-alpine AS runner

WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV PORT=3003

# Use the existing 'node' user for security
# Ensure the app directory is owned by the node user
RUN chown -R node:node /app

# Copy production dependencies and compiled app from previous stages
COPY --from=prod-deps --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/dist ./dist
COPY --from=builder --chown=node:node /app/package.json ./package.json

# Expose the application port
EXPOSE 3003

# Switch to non-root user
USER node

# Start the application
CMD ["node", "dist/main"]
