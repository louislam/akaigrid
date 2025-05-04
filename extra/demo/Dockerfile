FROM denoland/deno:debian-2.3.1
WORKDIR /app

RUN mkdir -p /app/data && chown -R deno:deno /app/data

USER deno
COPY --chown=deno:deno ./backend /app/backend
COPY --chown=deno:deno ./common /app/common
COPY --chown=deno:deno ./frontend-dist /app/frontend-dist
COPY --chown=deno:deno ./extra/demo/config-demo.yaml /app/config.yaml
COPY --chown=deno:deno ./deno.jsonc /app/deno.jsonc
COPY --chown=deno:deno ./videos /app/videos

CMD ["task", "start"]
