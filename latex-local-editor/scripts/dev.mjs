#!/usr/bin/env node
import {spawn} from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const apiPort = Number(process.env.THESIS_LATEX_EDITOR_API_PORT || 5185);
const clientPort = Number(process.env.THESIS_LATEX_EDITOR_PORT || 5184);
const previewMode = process.argv.includes("--preview");

if (!fs.existsSync(path.join(root, "node_modules"))) {
  console.error("[thesis-latex-editor] Run `npm install` once before starting the editor.");
  process.exit(1);
}

const viteBin = path.join(root, "node_modules", "vite", "bin", "vite.js");
const api = spawn(process.execPath, [path.join(root, "server", "index.mjs")], {stdio: "inherit", env: process.env});
const client = spawn(process.execPath, [viteBin, ...(previewMode ? ["preview"] : [])], {cwd: root, stdio: "inherit", env: process.env});

console.log(`[thesis-latex-editor] local editor: http://127.0.0.1:${clientPort}`);
console.log(`[thesis-latex-editor] local API: http://127.0.0.1:${apiPort}`);

let stopping = false;
function shutdown(signal = "SIGTERM") {
  if (stopping) return;
  stopping = true;
  api.kill(signal);
  client.kill(signal);
  setTimeout(() => process.exit(0), 1500).unref();
}
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

await Promise.race([
  new Promise((resolve) => api.once("close", resolve)),
  new Promise((resolve) => client.once("close", resolve)),
]);
shutdown();
