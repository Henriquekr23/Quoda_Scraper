FROM oven/bun:alpine

WORKDIR /app

# Copy dependency configs
COPY package.json tsconfig.json drizzle.config.ts ./

# Install dependencies
RUN bun install

# Copy database migrations and source code
COPY drizzle ./drizzle
COPY src ./src

# Create storage volume mountpoints
RUN mkdir -p storage/raw/xls storage/raw/html storage/raw/pdf

# Environment variables
ENV NODE_ENV=production

# Start container: execute pending migrations, seed database, then start cron scheduler with immediate execution
CMD ["sh", "-c", "bun run db:migrate && bun run src/database/seed.ts && bun run src/index.ts --now"]
