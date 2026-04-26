# --- STAGE 1: BASE (Clean PHP with essential extensions) ---
FROM php:8.3-cli-alpine AS base

# Install runtime dependencies only
# oniguruma is required for mbstring
RUN apk add --no-cache \
    libuv \
    oniguruma \
    oniguruma-dev

# Install essential extensions
RUN docker-php-ext-install pcntl mbstring

# Remove dev dependencies to keep the base image slim
RUN apk del oniguruma-dev

WORKDIR /app

# --- STAGE 2: BUILDER (Build tools and Composer) ---
FROM base AS builder

# Install build dependencies (will be discarded in final image)
# oniguruma-dev is required to compile mbstring if not pre-built
RUN apk add --no-cache \
    autoconf \
    g++ \
    make \
    linux-headers \
    oniguruma-dev \
    composer

# Install PHP dependencies
COPY composer.json composer.lock ./
RUN composer install --no-dev --optimize-autoloader


# --- STAGE 4: PRODUCTION (Ultra-lightweight final image) ---
FROM base AS production

# Create a non-root user and group
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy already built vendor from the builder stage
COPY --from=builder /app/vendor /app/vendor

# Copy application source code
COPY . .

# Hardening: Remove development and documentation files
RUN rm -rf php docs tests Makefile composer.json composer.lock .git .github

# Ensure the non-root user owns the application files
RUN chown -R appuser:appgroup /app

# Switch to the non-root user
USER appuser

# Default command for production
CMD ["php", "src/server.php"]