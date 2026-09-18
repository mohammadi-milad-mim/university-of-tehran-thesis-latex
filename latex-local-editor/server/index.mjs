import {spawn} from "node:child_process";
import express from "express";
import fs from "node:fs/promises";
import path from "node:path";
import {createServer} from "node:http";
import {WebSocketServer} from "ws";

import {API_PORT, FONT_ROOT, MAX_JSON_BYTES, THESIS_PDF, THESIS_ROOT, BIND_HOST, PRODUCTION, TOOL_ROOT, ALLOWED_HOSTS} from "./config.mjs";
import {PreviewBuildRunner} from "./buildRunner.mjs";
import {readAuthorFile, saveAuthorFile} from "./fileApi.mjs";
import {buildThesisIndex} from "./indexer.mjs";
import {readLatestPreview} from "./previewWorkspace.mjs";
import {locateSourcePosition} from "./synctex.mjs";
import {startWorkspaceWatcher} from "./watcher.mjs";

import {requestAllowed} from "./requestPolicy.mjs";

const app = express();
app.disable("x-powered-by");
app.use((req, res, next) => {
  if (!requestAllowed(req, ALLOWED_HOSTS)) return res.status(403).json({error: "untrusted host or origin"});
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");
  next();
});

app.use(express.json({limit: MAX_JSON_BYTES}));

let indexPromise = buildThesisIndex();
const server = createServer(app);
const wss = new WebSocketServer({server, path: "/ws", verifyClient: ({req}) => requestAllowed(req, ALLOWED_HOSTS)});
function broadcast(payload) {
  const body = JSON.stringify(payload);
  for (const client of wss.clients) if (client.readyState === 1) client.send(body);
}
const buildRunner = new PreviewBuildRunner((status) => broadcast({type: "preview-status", status}));

app.get("/api/health", async (_req, res, next) => {
  try {
    const [toolchain, sourcePdf, preview] = await Promise.all([inspectToolchain(), fileMetadata(THESIS_PDF), readLatestPreview()]);
    res.json({ok: true, workspace: THESIS_ROOT, sourcePdf, preview, toolchain});
  } catch (error) { next(error); }
});

app.get("/api/index", async (_req, res, next) => {
  try { res.json(await indexPromise); } catch (error) { next(error); }
});

app.get("/api/file", async (req, res, next) => {
  try {
    const result = await readAuthorFile(String(req.query.path || ""));
    if (result.error) return res.status(result.status).json(result);
    res.json(result);
  } catch (error) { next(error); }
});

app.post("/api/file", async (req, res, next) => {
  try {
    const result = await saveAuthorFile(req.body?.path, req.body?.content, req.body?.expectedHash);
    if (result.error) return res.status(result.status).json(result);
    res.json(result);
  } catch (error) { next(error); }
});

app.get("/api/preview/status", (_req, res) => res.json(buildRunner.status()));
app.post("/api/preview", (req, res) => {
  if (req.get("X-Thesis-Latex-Editor-Action") !== "preview-pdf") return res.status(403).json({error: "explicit preview action header required"});
  const result = buildRunner.start(req.body?.buffers ?? []);
  if (!result.started) return res.status(409).json({error: result.reason, status: buildRunner.status()});
  res.status(202).json({...result, status: buildRunner.status()});
});

app.get("/api/pdf", async (_req, res, next) => {
  try {
    const preview = await readLatestPreview();
    const pdf = preview?.pdf || THESIS_PDF;
    await fs.access(pdf);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Accept-Ranges", "bytes");
    res.sendFile(pdf);
  } catch (error) {
    if (error?.code === "ENOENT") return res.status(404).json({error: "no thesis PDF is available"});
    next(error);
  }
});

app.get("/api/pdf-info", async (_req, res, next) => {
  try {
    const preview = await readLatestPreview();
    const source = await fileMetadata(THESIS_PDF);
    res.json(preview ? {kind: "preview", revision: preview.revision, finishedAt: preview.finishedAt} : {kind: "source", ...source});
  } catch (error) { next(error); }
});

app.get("/api/sync", async (req, res, next) => {
  try {
    const preview = await readLatestPreview();
    if (!preview) return res.status(409).json({error: "build a cached preview before using SyncTeX"});
    if (String(req.query.revision || "") !== preview.revision) return res.status(409).json({error: "preview revision is stale"});
    const result = await locateSourcePosition({workspace: preview.workspace, relativePath: String(req.query.path || ""), line: Number(req.query.line || 1), column: Number(req.query.column || 1)});
    if (!result) return res.status(404).json({error: "no SyncTeX location found"});
    res.json(result);
  } catch (error) { next(error); }
});

app.get("/api/fonts/:file", async (req, res, next) => {
  try {
    const name = path.basename(String(req.params.file));
    const persian = /^IRNazanin(?:-Bold|-Italic)?\.ttf$/i.test(name);
    const latin = /^texgyretermes-(?:regular|bold|italic|bolditalic)\.otf$/.test(name);
    if (!persian && !latin) return res.status(404).end();
    const font = path.join(persian ? FONT_ROOT : path.join(THESIS_ROOT, "vendor", "tex-gyre"), name);
    await fs.access(font);
    res.setHeader("Content-Type", persian ? "font/ttf" : "font/otf");
    res.setHeader("Cache-Control", "private, max-age=86400");
    res.sendFile(font);
  } catch (error) { next(error); }
});

if (PRODUCTION) {
  app.use(express.static(path.join(TOOL_ROOT, "dist")));
  app.get("/", (_req, res) => res.sendFile(path.join(TOOL_ROOT, "dist", "index.html")));
}

app.use((error, _req, res, _next) => {
  console.error("[thesis-latex-editor]", error?.stack || error);
  if (!res.headersSent) res.status(error?.type === "entity.too.large" ? 413 : 500).json({error: "internal editor error"});
});

const watcher = startWorkspaceWatcher((event) => {
  if (event.type === "files-changed") indexPromise = buildThesisIndex();
  broadcast(event);
});

server.listen(API_PORT, BIND_HOST, () => {
  console.log(`[thesis-latex-editor] API on http://127.0.0.1:${API_PORT}`);
  console.log(`[thesis-latex-editor] workspace ${THESIS_ROOT}`);
});

async function fileMetadata(file) {
  try {
    const stat = await fs.stat(file);
    return {available: true, modifiedAt: stat.mtime.toISOString(), size: stat.size};
  } catch (error) {
    if (error?.code === "ENOENT") return {available: false};
    throw error;
  }
}

let toolchainPromise = null;
function inspectToolchain() {
  if (!toolchainPromise) {
    toolchainPromise = Promise.all([
      runCheck("latexmk", ["-v"]), runCheck("xelatex", ["--version"]), runCheck("biber", ["--version"]), runCheck("synctex", ["help"]), runCheck("kpsewhich", ["multirow.sty"]),
    ]).then(([latexmk, xelatex, biber, synctex, multirow]) => ({
      latexmk: latexmk.ok,
      xelatex: xelatex.ok,
      biber: biber.ok,
      synctex: synctex.ok,
      missingPackages: multirow.ok && multirow.stdout.trim() ? [] : ["multirow.sty"],
      exactPreviewReady: latexmk.ok && xelatex.ok && biber.ok && synctex.ok && Boolean(multirow.stdout.trim()),
    }));
  }
  return toolchainPromise;
}

function runCheck(command, args) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {stdio: ["ignore", "pipe", "pipe"]});
    let stdout = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.on("error", () => resolve({ok: false, stdout}));
    child.on("close", (code) => resolve({ok: code === 0, stdout}));
  });
}

async function shutdown() {
  buildRunner.child?.kill("SIGTERM");
  for (const client of wss.clients) client.terminate();
  await watcher.close();
  wss.close();
  server.close();
}
process.on("SIGINT", () => void shutdown());
process.on("SIGTERM", () => void shutdown());
