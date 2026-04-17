FROM node:20-alpine

WORKDIR /app

COPY . .

RUN corepack enable && \
    pnpm install --frozen-lockfile && \
    pnpm --filter @pulsco/csi build && \
    pnpm --filter @pulsco/aseo-core build && \
    pnpm --filter @pulsco/aseo-content-engine build && \
    pnpm --filter @pulsco/programmatic-seo build && \
    pnpm --filter @pulsco/seo-schema-engine build && \
    pnpm --filter @pulsco/aseo-csi-adapter build && \
    pnpm --filter @pulsco/seo-realtime-engine build && \
    pnpm --filter @pulsco/content-refresh-engine build && \
    pnpm --filter @pulsco/gso-delivery-engine build && \
    pnpm --filter @pulsco/linking-engine build && \
    pnpm --filter @pulsco/authority-engine build && \
    pnpm --filter @pulsco/seo-control-center build && \
    pnpm --filter @pulsco/seo-discovery-engine build

EXPOSE 3120

CMD ["pnpm", "--filter", "@pulsco/seo-discovery-engine", "start"]
