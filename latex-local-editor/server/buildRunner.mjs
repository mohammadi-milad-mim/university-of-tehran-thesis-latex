import {spawn} from "node:child_process";

import {LATEXMK_BIN, MAX_FILE_BYTES, isWritablePath} from "./config.mjs";
import {createPreviewSnapshot, discardWorkspace, publishPreview, readLatestPreview} from "./previewWorkspace.mjs";
import {isSha256, sanitizeRelativePath} from "./security.mjs";

export class PreviewBuildRunner {
  constructor(onUpdate = () => undefined) {
    this.onUpdate = onUpdate;
    this.state = {phase: "idle", revision: null, startedAt: null, finishedAt: null, log: [], diagnostics: []};
    this.child = null;
  }
  status() { return {...this.state}; }
  async availablePdf() { return readLatestPreview(); }

  start(buffers) {
    if (this.state.phase === "running") return {started: false, reason: "preview build already running"};
    const validation = validateBuffers(buffers);
    if (validation.error) return {started: false, reason: validation.error};
    const revision = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
    this.state = {phase: "running", revision, startedAt: new Date().toISOString(), finishedAt: null, log: [], diagnostics: []};
    this.onUpdate(this.status());
    void this.run(revision, validation.buffers);
    return {started: true, revision};
  }

  async run(revision, buffers) {
    let workspace = null;
    try {
      workspace = await createPreviewSnapshot(revision, buffers);
      this.append("نسخهٔ امن پیش‌نمایش آماده شد؛ XeLaTeX در حال اجراست…");
      const result = await this.spawnLatex(workspace);
      if (result.code !== 0) throw new Error(`latexmk exited with code ${result.code}`);
      const metadata = await publishPreview(workspace, revision);
      this.state = {...this.state, phase: "succeeded", finishedAt: metadata.finishedAt};
      this.append("پیش‌نمایش دقیق PDF آماده شد.");
      this.onUpdate(this.status());
    } catch (error) {
      if (workspace) await discardWorkspace(workspace).catch(() => undefined);
      this.state = {...this.state, phase: "failed", finishedAt: new Date().toISOString(), diagnostics: parseDiagnostics(this.state.log), error: error instanceof Error ? error.message : String(error)};
      this.onUpdate(this.status());
    } finally { this.child = null; }
  }

  spawnLatex(workspace) {
    return new Promise((resolve) => {
      const child = spawn(LATEXMK_BIN, ["main.tex"], {cwd: workspace, env: {...process.env, max_print_line: "1000"}, stdio: ["ignore", "pipe", "pipe"]});
      this.child = child;
      const consume = (chunk) => String(chunk).split(/\r?\n/).forEach((line) => line && this.append(line));
      child.stdout.on("data", consume);
      child.stderr.on("data", consume);
      child.on("error", (error) => { this.append(error.message); resolve({code: 1}); });
      child.on("close", (code) => resolve({code: code ?? 1}));
    });
  }

  append(line) {
    const clean = line.replace(/\x1B\[[0-9;]*[A-Za-z]/g, "").slice(0, 1200);
    this.state.log = [...this.state.log, clean].slice(-160);
    this.state.diagnostics = parseDiagnostics(this.state.log);
    this.onUpdate(this.status());
  }
}

function validateBuffers(input) {
  if (!Array.isArray(input)) return {error: "buffers must be an array"};
  const total = input.reduce((sum, item) => sum + (typeof item?.content === "string" ? Buffer.byteLength(item.content, "utf8") : 0), 0);
  if (total > MAX_FILE_BYTES * 2) return {error: "preview buffers are too large"};
  const buffers = [];
  const seen = new Set();
  for (const item of input) {
    const relativePath = sanitizeRelativePath(item?.path);
    if (!relativePath || !isWritablePath(relativePath)) return {error: `invalid preview path: ${String(item?.path)}`};
    if (seen.has(relativePath)) return {error: `duplicate preview path: ${relativePath}`};
    if (typeof item.content !== "string") return {error: `invalid preview content: ${relativePath}`};
    if (item.baseHash != null && !isSha256(item.baseHash)) return {error: `invalid baseHash: ${relativePath}`};
    seen.add(relativePath);
    buffers.push({path: relativePath, content: item.content, baseHash: item.baseHash ?? null});
  }
  return {buffers};
}

export function parseDiagnostics(lines) {
  const diagnostics = [];
  for (const line of lines) {
    const location = line.match(/(?:^|\()\.\/([^():]+\.(?:tex|bib|cls)):(\d+):\s*(.+)/);
    if (location) { diagnostics.push({path: location[1], line: Number(location[2]), message: location[3].trim()}); continue; }
    const missing = line.match(/! LaTeX Error: File `([^']+)' not found/);
    if (missing) diagnostics.push({path: null, line: null, message: `بسته یا فایل لاتک پیدا نشد: ${missing[1]}`});
  }
  return diagnostics.slice(-12);
}
