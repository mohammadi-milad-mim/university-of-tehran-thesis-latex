import test, {after} from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const sandbox = await fs.mkdtemp(path.join(os.tmpdir(), "thesis-editor-workspace-"));
const workspace = path.join(sandbox, "thesis");
const cache = path.join(sandbox, "cache");
await makeFixture(workspace);
process.env.THESIS_LATEX_EDITOR_WORKSPACE = workspace;
process.env.THESIS_LATEX_EDITOR_CACHE = cache;

const {buildThesisIndex} = await import("../server/indexer.mjs");
const {readAuthorFile, saveAuthorFile} = await import("../server/fileApi.mjs");
const {resolveAllowedFile, sanitizeRelativePath, sha256} = await import("../server/security.mjs");
const {createPreviewSnapshot, discardWorkspace} = await import("../server/previewWorkspace.mjs");

after(async () => { await fs.rm(sandbox, {recursive: true, force: true}); });

test("paths and write access are contained to existing author files", async () => {
  for (const rejected of ["", "/etc/passwd", "../main.tex", "chapters//01-one.tex", "chapters/../main.tex", "main.tex", "figures/a.tex", "chapters/new.tex"]) {
    if (rejected === "main.tex" || rejected === "figures/a.tex" || rejected === "chapters/new.tex") assert.ok((await resolveAllowedFile(rejected)).error);
    else assert.equal(sanitizeRelativePath(rejected), null);
  }
  const allowed = await resolveAllowedFile("chapters/01-one.tex");
  assert.equal(allowed.relativePath, "chapters/01-one.tex");

  const outside = path.join(sandbox, "outside.tex");
  await fs.writeFile(outside, "outside", "utf8");
  await fs.symlink(outside, path.join(workspace, "chapters", "03-escape.tex"));
  assert.match((await resolveAllowedFile("chapters/03-escape.tex")).error, /escapes/);
});

test("index follows main.tex and extracts navigation resources", async () => {
  const index = await buildThesisIndex();
  const chapters = index.groups.find((group) => group.id === "chapters").files;
  assert.deepEqual(chapters.map((file) => file.path), ["chapters/02-two.tex", "chapters/01-one.tex"]);
  assert.equal(chapters[0].outline[0].title, "فصل دوم");
  assert.deepEqual(index.resources.citations, ["alpha2024"]);
  assert.deepEqual(index.resources.glossary, ["agent"]);
  assert.deepEqual(index.resources.labels, ["ch:one", "ch:two"]);
});

test("manual saves are atomic and stale hashes return a disk snapshot", async () => {
  const first = await readAuthorFile("chapters/01-one.tex");
  assert.equal(first.visual, true);
  const next = `${first.content}\nمتن تازه`;
  const saved = await saveAuthorFile(first.path, next, first.hash);
  assert.equal(saved.hash, sha256(next));
  assert.equal(await fs.readFile(path.join(workspace, first.path), "utf8"), next);
  assert.deepEqual((await fs.readdir(path.join(workspace, "chapters"))).filter((name) => name.includes(".tmp")), []);

  const conflict = await saveAuthorFile(first.path, "نسخهٔ قدیمی", first.hash);
  assert.equal(conflict.status, 409);
  assert.equal(conflict.currentContent, next);
  assert.equal(await fs.readFile(path.join(workspace, first.path), "utf8"), next);
});

test("preview mirrors into editor cache, overlays buffers, and leaves source untouched", async () => {
  const sourcePath = path.join(workspace, "chapters", "02-two.tex");
  const sourceBefore = await fs.readFile(sourcePath, "utf8");
  const previewContent = `${sourceBefore}\nپیش‌نمایش ذخیره‌نشده`;
  const snapshot = await createPreviewSnapshot("fixture", [{path: "chapters/02-two.tex", content: previewContent}]);
  assert.equal(await fs.readFile(path.join(snapshot, "chapters", "02-two.tex"), "utf8"), previewContent);
  assert.equal(await fs.readFile(sourcePath, "utf8"), sourceBefore);
  await assert.rejects(fs.access(path.join(snapshot, "output", "thesis.pdf")));
  assert.match(await fs.readFile(path.join(snapshot, "latexmkrc"), "utf8"), /-synctex=1/);
  await discardWorkspace(snapshot);
});

async function makeFixture(root) {
  for (const directory of ["chapters", "appendices", "front-matter", "glossary", "bibliography", "output", "figures"]) await fs.mkdir(path.join(root, directory), {recursive: true});
  const files = {
    "main.tex": "\\input{chapters/02-two}\n\\input{chapters/01-one}\n\\input{appendices/A-extra}\n",
    "latexmkrc": "$pdflatex = 'xelatex -no-shell-escape %O %S';\n",
    "chapters/01-one.tex": "\\chapter{فصل اول}\\label{ch:one}\nمتن اول",
    "chapters/02-two.tex": "\\chapter{فصل دوم}\\label{ch:two}\nمتن دوم",
    "appendices/A-extra.tex": "\\chapter{پیوست}",
    "front-matter/abstract-fa.tex": "\\chapter{چکیده}",
    "metadata.tex": "\\newcommand{\\ThesisTitle}{عنوان}",
    "glossary/terms.tex": "\\newglossaryentry{agent}{name={عامل},description={توضیح}}",
    "glossary/preliminary-acronyms.tex": "\\newacronym{ai}{AI}{Artificial Intelligence}",
    "bibliography/references.bib": "@article{alpha2024, title={Alpha}}",
    "output/thesis.pdf": "%PDF-1.4\n%%EOF\n",
    "figures/a.tex": "not editable",
  };
  await Promise.all(Object.entries(files).map(async ([relative, content]) => {
    const destination = path.join(root, relative);
    await fs.mkdir(path.dirname(destination), {recursive: true});
    await fs.writeFile(destination, content, "utf8");
  }));
}
