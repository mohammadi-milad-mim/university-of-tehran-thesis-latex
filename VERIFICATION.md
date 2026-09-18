# Verification report

Local verification: 2026-09-18, macOS / Apple Silicon. Checks completed before the user-authorized publication to `main`.

## Passed

- **Source preservation:** SHA-256 comparison of 326 original source/asset files found no changes. The private baseline and comparison patterns remain outside this repository.
- **Privacy:** inspected candidate publication files and newly generated PDFs, including filenames, PDF text/metadata, and binary asset contents. No thesis-specific names, title, student identifier, project branding, private paths, or copied long thesis paragraphs were found. The destination repository's pre-existing MIT copyright notice remains intact; upstream/font attribution is retained.
- **Native template:** clean-copy XeLaTeX/Biber build and structural verification. The sample thesis has 34 pages; the defense poster has one page. No unresolved reference/citation, missing-glyph, or overfull-horizontal-box errors in the final thesis log.
- **Document behavior:** six chapters, chapter title leaves, Abjad preliminary folios, English closing pages, references, used terminology, first-use English footnotes, unused-term exclusion, short list captions versus long body captions, shared figures/data, two-page longtable with repeated headers, landscape appendix, embedded Persian/Latin fonts, and SyncTeX.
- **Visual QA:** rendered and inspected thesis pages, the updated multipage appendix, poster, and browser screenshots. The sample PDFs in `sample-output` are newly generated from this kit.
- **Editor checks:** 19 unit/integration tests, TypeScript checking, and production frontend build pass.
- **Browser checks:** 16 tests pass across Chromium, Firefox, and WebKit. Two duplicate real-compiler tests are intentionally skipped: compilation is exercised once in Chromium; editing interactions are exercised in all three engines. Tests cover Persian/ZWNJ and Latin text, explicit direction/isolation, mode byte fidelity, undo/redo, search, save/reopen, external conflicts, protected content, completion, synthetic composition events, keyboard selection/copy/paste, delayed-save typing, multi-buffer PDF preview, canvas rendering, and SyncTeX.
- **Dependency audit:** npm audit reports zero vulnerabilities in the resolved lockfile at verification time.
- **Docker arm64:** rebuilt the final image and passed healthy Compose startup, production browser/PDF rendering, explicit bind-mount saves, stale-save conflicts, real unsaved-buffer preview, SyncTeX, external file watching over WebSocket, restart persistence, Host/Origin checks, non-root execution, and read-only shared mounts. Fresh in-container thesis verification and poster compilation also pass. These are Linux arm64 containers on an Apple Silicon macOS host.
- **Docker amd64:** the final image now starts successfully under emulation on Apple Silicon. Clean in-container thesis verification and poster compilation pass, as do production browser/PDF rendering, explicit host-persistent saves, stale conflicts, unsaved-buffer preview, SyncTeX, external-file WebSocket notifications, restart persistence, Origin rejection, non-root execution, and read-only shared mounts. An intentionally invalid unsaved buffer fails compilation while retaining the byte-identical last successful PDF and saved source. This is emulated Linux amd64, not a physical x86 host.
- **Final pre-publication review:** reran all 19 editor tests, type checking, production build, and 16 browser tests (two intentional duplicate-compiler skips); npm audit reports zero vulnerabilities. Checked all 117 publication files, local Markdown links, ignored build outputs, original-source hashes, and private patterns. No test markers or generated intermediates are included; curated sample PDFs are versioned in `sample-output` and editor screenshots in `docs/previews`. Restored the missing `output/` ignore rule.
- **Retry fixes:** corrected smoke-test newline escapes and made `make clean` remove both thesis and poster intermediates, preventing native/container Biber version mismatches.
- **Illustrated overview:** `OVERVIEW.md` includes the actual container-served editor screenshot and thumbnails of the sanitized thesis and poster.

## Checks requiring other environments

- **Windows and native Linux host behavior:** not run on physical hosts. Compose, polling, UID/GID guidance, platform-independent paths, and CI for amd64/arm64 are provided, but are not substitutes for measured host tests.
- **Physical Persian IME:** synthetic browser composition, text insertion, and keyboard copy/paste were tested; physical keyboard/IME behavior still needs manual testing on each supported host.
- **CI:** workflow files are supplied; remote results must be checked after publication.

## Reproduce

```sh
cd latex-local-editor
npm ci
npm run check
npx playwright install chromium firefox webkit
npm run test:e2e
cd ..
make -C thesis-latex verify poster
```

With Docker running:

```sh
docker compose up --build -d --wait
docker compose exec -w /workspace/thesis-latex editor make clean verify poster
node scripts/smoke.mjs
docker compose restart editor
docker compose up -d --wait
docker buildx build --platform linux/amd64 --load -t ut-thesis-kit:amd64 .
```

The smoke script temporarily edits only the public sample chapter and restores it in `finally`. Run it against this kit, not a personal thesis. CI uses separate amd64/arm64 runners for container verification. See `docs/docker.md` for Linux ownership configuration.

## Remaining qualifications

The glossary scanner recognizes direct literal term commands in chapter/front-matter sources; custom macros or complex conditional authoring may require extending it. Builds can still report benign glossaries package compatibility notices and Vite's bundle-size notice. Neither is a failed build. This is a trusted local editor, not an untrusted multi-user compilation service. University formatting requirements should be checked independently of the kit's preserved 25 mm layout.
