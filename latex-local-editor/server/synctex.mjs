import {spawn} from "node:child_process";
import path from "node:path";

import {SYNCTEX_BIN} from "./config.mjs";
import {sanitizeRelativePath} from "./security.mjs";

export async function locateSourcePosition({workspace, relativePath, line, column = 1}) {
  const safePath = sanitizeRelativePath(relativePath);
  if (!safePath) return null;
  const safeLine = Math.max(1, Number(line) || 1);
  const safeColumn = Math.max(1, Number(column) || 1);
  const pdf = path.join(workspace, ".build", "main.pdf");
  const result = await run(SYNCTEX_BIN, ["view", "-i", `${safeLine}:${safeColumn}:${safePath}`, "-o", pdf], workspace);
  if (result.code !== 0) return null;
  return parseSynctexView(result.stdout);
}

export function parseSynctexView(output) {
  const pages = [...output.matchAll(/^Page:(\d+)$/gm)];
  if (!pages.length) return null;
  const firstIndex = pages[0].index ?? 0;
  const end = output.indexOf("SyncTeX result end", firstIndex);
  const block = output.slice(firstIndex, end < 0 ? undefined : end);
  const number = (key) => {
    const match = block.match(new RegExp(`^${key}:([-+0-9.]+)$`, "m"));
    return match ? Number(match[1]) : null;
  };
  return {page: Number(pages[0][1]), x: number("x"), y: number("y"), h: number("h"), v: number("v")};
}

function run(command, args, cwd) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {cwd, stdio: ["ignore", "pipe", "pipe"]});
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", (error) => resolve({code: 1, stdout, stderr: `${stderr}\n${error.message}`}));
    child.on("close", (code) => resolve({code: code ?? 1, stdout, stderr}));
  });
}
