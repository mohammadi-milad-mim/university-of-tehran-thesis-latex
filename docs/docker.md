# Docker

```sh
docker compose up --build -d
docker compose logs -f editor
docker compose exec -w /workspace/thesis-latex editor make verify poster
docker compose down
```

The image uses a digest-pinned Node 22 Debian base and a dated, signature-verified Debian package snapshot, keeping TeX Live and Biber compatible. The snapshot is fetched over HTTP to bootstrap the slim image before CA certificates are installed; apt still verifies repository signatures and package hashes. Dependency downloads are needed only during image construction.

The same Dockerfile supports `linux/amd64` and `linux/arm64`:

```sh
docker buildx build --platform linux/amd64 --load -t ut-thesis-kit:amd64 .
docker buildx build --platform linux/arm64 --load -t ut-thesis-kit:arm64 .
```

Compose publishes only `127.0.0.1:5185`. Set `EDITOR_PORT` to use another host port; the allowed Host list follows it. Shared figures/data are read-only mounts, author files are bind-mounted, and preview cache uses a named volume. Containers run as user `node` (UID/GID 1000), without extra capabilities. The Docker socket is never mounted.

## Linux ownership

For a host account with another UID/GID, create an untracked `compose.override.yaml`:

```yaml
services:
  editor:
    user: "1001:1001" # replace with output of id -u and id -g
    environment:
      THESIS_LATEX_EDITOR_CACHE: /tmp/ut-editor-cache
```

This makes saved author files belong to your account. The override places preview cache in the container's writable temporary directory; it is discarded on recreation. Native Docker Desktop bind mounts on macOS/Windows normally handle ownership mapping themselves. Never solve a permission issue by running the editor privileged.

## Troubleshooting

- **Cannot connect to Docker daemon:** start Docker Desktop/Engine.
- **Port in use:** set `EDITOR_PORT=5195` before running Compose, then open port 5195.
- **403:** use the documented localhost URL, not a LAN hostname; Host and Origin are checked for HTTP and WebSockets.
- **Changes not noticed:** Compose enables polling for Docker Desktop file sharing.
- **Switching between native and Docker TeX:** run `make clean` inside the new environment before rebuilding. It removes both thesis and poster intermediates so Biber never reads a control file from another TeX version.
- **Missing glyph/package:** rebuild the image and run `make doctor`; do not mix Biber with a different BibLaTeX release.
- **PDF build fails:** open build diagnostics; the last successful preview remains visible. PDF preview never saves text.
- **No PDF on first start:** click the preview button or run the final build command.
- **Reset preview cache:** `docker compose down -v` removes the preview volume, not bind-mounted author files.

On Windows, run Compose from the cloned repository in PowerShell or WSL2; no host Make or TeX installation is needed. Actual host-platform verification is listed in VERIFICATION.md.
