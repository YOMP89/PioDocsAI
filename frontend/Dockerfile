FROM node:22-bookworm-slim

WORKDIR /app

ENV PNPM_HOME="/pnpm" \
    PATH="/pnpm:$PATH"
RUN corepack enable && corepack prepare pnpm@12.3.4 --activate

# Se instalan las dependencias en la imagen (no en el volumen del host) para
# que el bind mount de ./frontend no las pise; docker-compose monta ademas un
# volumen nombrado sobre /app/node_modules por esa misma razon.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

EXPOSE 3000

CMD ["pnpm", "exec", "next", "dev", "--hostname", "0.0.0.0", "--port", "3000"]
