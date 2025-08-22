# Multi-stage Docker build for Behavioral Health Analytics Platform
# Stage 1: Build stage
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Install dependencies for native modules (canvas, sharp, etc.)
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    musl-dev \
    giflib-dev \
    pixman-dev \
    pangomm-dev \
    libjpeg-turbo-dev \
    freetype-dev \
    pkgconfig

# Copy package files
COPY package*.json ./

# Install dependencies (including dev deps required for build)
RUN npm ci
RUN npm rebuild canvas --build-from-source

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Stage 2: Production stage
FROM node:20-alpine AS production

# Install runtime dependencies for canvas and other native modules
RUN apk add --no-cache \
    cairo \
    jpeg \
    pango \
    musl \
    giflib \
    pixman \
    pangomm \
    libjpeg-turbo \
    freetype

# Create app user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Set working directory
WORKDIR /app

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
# Vite outputs frontend to /app/dist/public; copy that into ./client/dist for app static serving
COPY --from=builder /app/dist/public ./client/dist
COPY --from=builder /app/public ./public

# Copy necessary configuration files
COPY --from=builder /app/drizzle.config.ts ./
COPY --from=builder /app/server/data ./server/data
COPY --from=builder /app/shared ./shared

# Copy app init script
COPY docker/app-init.sh /usr/local/bin/app-init.sh
RUN chmod +x /usr/local/bin/app-init.sh

# Create necessary directories with proper permissions
RUN mkdir -p uploads/daily-reports/pdfs uploads/temp logs data
RUN chown -R nextjs:nodejs /app

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/api/health', (res) => process.exit(res.statusCode === 200 ? 0 : 1))"

# Start the application via init script (runs migrations then starts)
CMD ["/usr/local/bin/app-init.sh"]