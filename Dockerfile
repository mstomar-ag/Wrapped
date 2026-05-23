FROM node:22-bookworm-slim AS web-build
WORKDIR /web
COPY web/package.json web/package-lock.json* ./
RUN npm install --no-audit --no-fund --legacy-peer-deps
COPY web ./
RUN npm run build

FROM node:22-bookworm-slim

# Chromium dependencies for Remotion's headless renderer + fonts
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    chromium \
    libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libxkbcommon0 \
    libxcomposite1 libxdamage1 libxrandr2 libgbm1 libpango-1.0-0 \
    libcairo2 libasound2 fonts-liberation \
  && rm -rf /var/lib/apt/lists/*

# Use the system chromium installed above (works on both arm64 and amd64).
# Remotion will skip its CDN download and use this binary.
ENV REMOTION_CHROME_EXECUTABLE_PATH=/usr/bin/chromium
ENV PUPPETEER_SKIP_DOWNLOAD=true

# Run as a non-root user. Chromium refuses to run as root without --no-sandbox,
# and giving it --no-sandbox in a container is a security risk. Better: run
# under a regular user that Chromium is happy to use.
RUN useradd --create-home --shell /bin/bash app

WORKDIR /app
COPY --chown=app:app package.json package-lock.json ./
RUN npm ci --omit=dev --legacy-peer-deps

COPY --chown=app:app . .
COPY --from=web-build --chown=app:app /web/dist ./web/dist

# Pre-install tsx as a runtime dep so `npx tsx` doesn't redownload it on boot
RUN npm install --no-save tsx --legacy-peer-deps

# Make sure /app and the volume mount points are writable by `app`
RUN mkdir -p /app/data /app/out /app/.remotion-bundle && chown -R app:app /app

USER app
EXPOSE 3000
ENV NODE_ENV=production
CMD ["npx", "tsx", "server/index.ts"]
