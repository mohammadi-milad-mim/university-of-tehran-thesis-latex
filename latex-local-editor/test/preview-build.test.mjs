import test, {after} from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const sandbox = await fs.mkdtemp(path.join(os.tmpdir(), "thesis-editor-build-"));
const workspace = path.join(sandbox, "thesis");
const cache = path.join(sandbox, "cache");
const fakeLatexmk = path.join(sandbox, "latexmk-fixture");
await fs.mkdir(path.join(workspace, "chapters"), {recursive: true});
await fs.writeFile(path.join(workspace, "main.tex"), "\\input{chapters/01-one}\n", "utf8");
await fs.writeFile(path.join(workspace, "latexmkrc"), "$pdflatex = 'xelatex -no-shell-escape %O %S';\n", "utf8");
await fs.writeFile(path.join(workspace, "chapters", "01-one.tex"), "نسخهٔ دیسک", "utf8");
await fs.writeFile(fakeLatexmk, "#!/bin/sh\nif [ \"$FAKE_LATEX_FAILURE\" = \"1\" ]; then\n  printf '%s\\n' \"./chapters/01-one.tex:3: fixture failure\"\n  exit 1\nfi\nmkdir -p .build\nprintf '%s\\n' '%PDF-1.4' '%%EOF' > .build/main.pdf\nexit 0\n", "utf8");
await fs.chmod(fakeLatexmk, 0o755);
process.env.THESIS_LATEX_EDITOR_WORKSPACE = workspace;
process.env.THESIS_LATEX_EDITOR_CACHE = cache;
process.env.THESIS_LATEX_EDITOR_LATEXMK = fakeLatexmk;

const {PreviewBuildRunner} = await import("../server/buildRunner.mjs");
after(async () => { await fs.rm(sandbox, {recursive: true, force: true}); });

test("preview builds queue once, include unsaved tabs, and retain the last good PDF on failure", async () => {
  const runner = new PreviewBuildRunner();
  const buffers = [{path: "chapters/01-one.tex", content: "نسخهٔ ذخیره‌نشده", baseHash: "a".repeat(64)}];
  assert.equal(runner.start(buffers).started, true);
  assert.equal(runner.start(buffers).started, false);
  await waitForFinish(runner);
  assert.equal(runner.status().phase, "succeeded");
  const successful = await runner.availablePdf();
  assert.ok(successful?.pdf);
  assert.equal(await fs.readFile(path.join(successful.workspace, "chapters", "01-one.tex"), "utf8"), "نسخهٔ ذخیره‌نشده");
  assert.equal(await fs.readFile(path.join(workspace, "chapters", "01-one.tex"), "utf8"), "نسخهٔ دیسک");

  process.env.FAKE_LATEX_FAILURE = "1";
  assert.equal(runner.start(buffers).started, true);
  await waitForFinish(runner);
  assert.equal(runner.status().phase, "failed");
  assert.equal(runner.status().diagnostics[0].path, "chapters/01-one.tex");
  assert.equal((await runner.availablePdf()).revision, successful.revision);
  assert.equal(runner.start([{path: "main.tex", content: "x"}]).started, false);
});

async function waitForFinish(runner) {
  const deadline = Date.now() + 4000;
  while (runner.status().phase === "running" && Date.now() < deadline) await new Promise((resolve) => setTimeout(resolve, 15));
  assert.notEqual(runner.status().phase, "running", "fixture build timed out");
}
