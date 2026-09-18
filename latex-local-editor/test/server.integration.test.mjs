import test, {after} from "node:test";
import assert from "node:assert/strict";
import {spawn} from "node:child_process";
import fs from "node:fs/promises";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {WebSocket} from "ws";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sandbox = await fs.mkdtemp(path.join(os.tmpdir(), "thesis-editor-server-"));
const workspace = path.join(sandbox, "thesis");
const cache = path.join(sandbox, "cache");
const port = await unusedPort();
await makeFixture(workspace);

const child = spawn(process.execPath, [path.join(projectRoot, "server", "index.mjs")], {
  cwd: projectRoot,
  env: {...process.env, THESIS_LATEX_EDITOR_WORKSPACE: workspace, THESIS_LATEX_EDITOR_CACHE: cache, THESIS_LATEX_EDITOR_API_PORT: String(port)},
  stdio: ["ignore", "pipe", "pipe"],
});
let childOutput = "";
child.stdout.on("data", (chunk) => { childOutput += chunk; });
child.stderr.on("data", (chunk) => { childOutput += chunk; });
const base = `http://127.0.0.1:${port}`;
await waitForServer(base, child);

after(async () => {
  child.kill("SIGTERM");
  await Promise.race([new Promise((resolve) => child.once("exit", resolve)), new Promise((resolve) => setTimeout(resolve, 1500))]);
  await fs.rm(sandbox, {recursive: true, force: true});
});

test("loopback API enforces access rules, conflicts, preview intent, and file-change events", async () => {
  const indexResponse = await fetch(`${base}/api/index`);
  assert.equal(indexResponse.status, 200);
  assert.equal((await indexResponse.json()).fileCount, 7);

  assert.equal((await fetch(`${base}/api/file?path=main.tex`)).status, 403);
  assert.equal((await fetch(`${base}/api/file?path=${encodeURIComponent("../main.tex")}`)).status, 403);
  const readResponse = await fetch(`${base}/api/file?path=chapters%2F01-one.tex`);
  assert.equal(readResponse.status, 200);
  const original = await readResponse.json();

  const websocket = new WebSocket(`ws://127.0.0.1:${port}/ws`);
  await new Promise((resolve, reject) => { websocket.once("open", resolve); websocket.once("error", reject); });
  const eventPromise = waitForMessage(websocket, (payload) => payload.type === "files-changed");
  const external = `${original.content}\nتغییر بیرونی`;
  await fs.writeFile(path.join(workspace, "chapters", "01-one.tex"), external, "utf8");
  const event = await eventPromise;
  assert.deepEqual(event.paths, ["chapters/01-one.tex"]);
  websocket.close();

  const conflictResponse = await fetch(`${base}/api/file`, {method: "POST", headers: {"content-type": "application/json"}, body: JSON.stringify({path: original.path, content: "نسخهٔ من", expectedHash: original.hash})});
  assert.equal(conflictResponse.status, 409);
  const conflict = await conflictResponse.json();
  assert.equal(conflict.currentContent, external);

  const saveResponse = await fetch(`${base}/api/file`, {method: "POST", headers: {"content-type": "application/json"}, body: JSON.stringify({path: original.path, content: "نسخهٔ ادغام‌شده", expectedHash: conflict.currentHash})});
  assert.equal(saveResponse.status, 200);
  assert.equal(await fs.readFile(path.join(workspace, original.path), "utf8"), "نسخهٔ ادغام‌شده");

  assert.equal((await fetch(`${base}/api/preview`, {method: "POST", headers: {"content-type": "application/json"}, body: JSON.stringify({buffers: []})})).status, 403);
  assert.equal((await fetch(`${base}/api/preview`, {method: "POST", headers: {"content-type": "application/json", "X-Thesis-Latex-Editor-Action": "preview-pdf"}, body: JSON.stringify({buffers: [{path: "main.tex", content: "x"}]})})).status, 409);
});

async function waitForServer(url, processHandle) {
  const deadline = Date.now() + 6000;
  while (Date.now() < deadline) {
    if (processHandle.exitCode != null) throw new Error(`fixture API exited early:\n${childOutput}`);
    try { if ((await fetch(`${url}/api/index`)).ok) return; } catch {}
    await new Promise((resolve) => setTimeout(resolve, 40));
  }
  throw new Error(`fixture API did not start:\n${childOutput}`);
}

function waitForMessage(socket, predicate) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("WebSocket fixture event timed out")), 3000);
    socket.on("message", (data) => {
      const payload = JSON.parse(String(data));
      if (!predicate(payload)) return;
      clearTimeout(timeout);
      resolve(payload);
    });
  });
}

async function unusedPort() {
  const server = net.createServer();
  await new Promise((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
  const address = server.address();
  const selected = typeof address === "object" && address ? address.port : 0;
  await new Promise((resolve) => server.close(resolve));
  return selected;
}

async function makeFixture(root) {
  for (const directory of ["chapters", "appendices", "front-matter", "glossary", "bibliography", "output", "vendor/irfonts/ttf"]) await fs.mkdir(path.join(root, directory), {recursive: true});
  const files = {
    "main.tex": "\\input{chapters/01-one}\n\\input{appendices/A-extra}\n",
    "latexmkrc": "$pdflatex = 'xelatex -no-shell-escape %O %S';\n",
    "chapters/01-one.tex": "\\chapter{فصل اول}\\label{ch:one}\nمتن",
    "appendices/A-extra.tex": "\\chapter{پیوست}",
    "front-matter/abstract-fa.tex": "\\chapter{چکیده}",
    "metadata.tex": "عنوان",
    "glossary/terms.tex": "\\newglossaryentry{agent}{name={عامل},description={توضیح}}",
    "glossary/preliminary-acronyms.tex": "\\newacronym{ai}{AI}{Artificial Intelligence}",
    "bibliography/references.bib": "@article{alpha2024,title={Alpha}}",
    "output/thesis.pdf": "%PDF-1.4\n%%EOF\n",
  };
  await Promise.all(Object.entries(files).map(async ([relative, content]) => fs.writeFile(path.join(root, relative), content, "utf8")));
}
