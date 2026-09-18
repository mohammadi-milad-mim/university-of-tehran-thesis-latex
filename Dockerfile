FROM node:22.22.0-bookworm-slim@sha256:dd9d21971ec4395903fa6143c2b9267d048ae01ca6d3ea96f16cb30df6187d94 AS editor-build
WORKDIR /app/latex-local-editor
COPY latex-local-editor/package*.json ./
RUN npm ci
COPY latex-local-editor/ ./
RUN npm run build && npm prune --omit=dev

FROM node:22.22.0-bookworm-slim@sha256:dd9d21971ec4395903fa6143c2b9267d048ae01ca6d3ea96f16cb30df6187d94
# Debian snapshot pins the matching TeX Live and Biber package set.
RUN printf 'deb [check-valid-until=no] http://snapshot.debian.org/archive/debian/20260201T000000Z bookworm main\n' > /etc/apt/sources.list \
 && rm -f /etc/apt/sources.list.d/debian.sources \
 && apt-get update \
 && apt-get install -y --no-install-recommends texlive-xetex texlive-lang-arabic texlive-latex-extra texlive-bibtex-extra texlive-fonts-recommended fonts-texgyre biber latexmk python3 python3-pypdf poppler-utils make fontconfig ca-certificates tini \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /app/latex-local-editor
COPY --from=editor-build --chown=node:node /app/latex-local-editor ./
RUN mkdir -p /workspace/thesis-latex /workspace/figures /workspace/experiment_results /workspace/defense-poster-template /cache \
 && chown -R node:node /workspace /cache
ENV NODE_ENV=production THESIS_LATEX_EDITOR_HOST=0.0.0.0 THESIS_LATEX_EDITOR_API_PORT=5185 THESIS_LATEX_EDITOR_WORKSPACE=/workspace/thesis-latex THESIS_LATEX_EDITOR_CACHE=/cache
USER node
EXPOSE 5185
HEALTHCHECK --interval=15s --timeout=5s --start-period=30s CMD node -e "fetch('http://127.0.0.1:5185/api/index').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["node", "scripts/start.mjs"]
