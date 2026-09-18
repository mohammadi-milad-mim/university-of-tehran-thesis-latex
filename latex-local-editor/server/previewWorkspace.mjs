import fs from "node:fs/promises";
import path from "node:path";

import {PREVIEW_ROOT, THESIS_ROOT, isWritablePath} from "./config.mjs";
import {sanitizeRelativePath} from "./security.mjs";

const EXCLUDED_ROOTS = new Set([".build", "output", "tmp", ".git", "node_modules", ".cache"]);

export async function createPreviewSnapshot(revision, buffers) {
  await fs.mkdir(PREVIEW_ROOT, {recursive: true});
  const snapshot = path.join(PREVIEW_ROOT, `work-${revision}`);
  const workspace = path.join(snapshot, "thesis-latex");
  await fs.mkdir(snapshot, {recursive: false});
  await fs.mkdir(workspace);
  try {
  await copyTree(THESIS_ROOT, workspace, true);
  for (const name of ["figures", "experiment_results"]) {
    const source = path.join(path.dirname(THESIS_ROOT), name);
    try {
      const stat = await fs.lstat(source);
      if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error("shared directory must be a real directory");
      await fs.mkdir(path.join(snapshot, name));
      await copyTree(source, path.join(snapshot, name), true);
    } catch (error) { if (error.code !== "ENOENT") throw error; }
  }
  for (const buffer of buffers) {
    const relativePath = sanitizeRelativePath(buffer.path);
    if (!relativePath || !isWritablePath(relativePath) || typeof buffer.content !== "string") throw new Error(`invalid preview buffer: ${String(buffer.path)}`);
    const destination = path.join(workspace, relativePath);
    assertInside(workspace, destination);
    await fs.writeFile(destination, buffer.content, "utf8");
  }
  await enableSynctex(path.join(workspace, "latexmkrc"));
  return workspace;
  } catch (error) {
    await discardWorkspace(workspace).catch(() => undefined);
    throw error;
  }
}

export async function publishPreview(workspace, revision) {
  const pdf = path.join(workspace, ".build", "main.pdf");
  await fs.access(pdf);
  const previous = await readLatestPreview();
  const metadata = {revision, workspace, pdf, finishedAt: new Date().toISOString()};
  await fs.writeFile(path.join(PREVIEW_ROOT, "latest.json"), JSON.stringify(metadata), "utf8");
  if (previous?.workspace && previous.workspace !== workspace) await discardWorkspace(previous.workspace).catch(() => undefined);
  return metadata;
}

export async function readLatestPreview() {
  try {
    const raw = await fs.readFile(path.join(PREVIEW_ROOT, "latest.json"), "utf8");
    const metadata = JSON.parse(raw);
    await fs.access(metadata.pdf);
    return metadata;
  } catch { return null; }
}

export async function discardWorkspace(workspace) {
  if (!workspace) return;
  const snapshot = path.basename(workspace) === "thesis-latex" ? path.dirname(workspace) : workspace;
  const relative = path.relative(PREVIEW_ROOT, snapshot);
  if (!relative.startsWith("work-") || relative.includes(path.sep)) return;
  await fs.rm(snapshot, {recursive: true, force: true});
}

async function copyTree(source, destination, isRoot = false) {
  const entries = await fs.readdir(source, {withFileTypes: true});
  for (const entry of entries) {
    if ((isRoot && EXCLUDED_ROOTS.has(entry.name)) || entry.name === ".DS_Store") continue;
    const from = path.join(source, entry.name);
    const to = path.join(destination, entry.name);
    if (entry.isSymbolicLink()) continue;
    if (entry.isDirectory()) {
      await fs.mkdir(to, {recursive: true});
      await copyTree(from, to, false);
    } else if (entry.isFile()) await fs.copyFile(from, to);
  }
}

async function enableSynctex(rcPath) {
  const original = await fs.readFile(rcPath, "utf8");
  const withSync = original.includes("-synctex=1") ? original : original.replace("xelatex -no-shell-escape", "xelatex -synctex=1 -no-shell-escape");
  await fs.writeFile(rcPath, withSync, "utf8");
}

function assertInside(root, target) {
  const relative = path.relative(root, target);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) throw new Error("preview path escapes cache");
}
