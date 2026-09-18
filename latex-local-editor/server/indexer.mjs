import fs from "node:fs/promises";
import path from "node:path";

import {THESIS_ROOT, isVisualPath} from "./config.mjs";

const FRONT_TITLES = {
  "abstract-fa.tex": "چکیدهٔ فارسی",
  "ai-use-disclosure.tex": "گزارش استفاده از هوش مصنوعی",
  "dedication.tex": "تقدیم",
  "acknowledgements.tex": "تقدیر و تشکر",
  "abstract-en.tex": "چکیدهٔ انگلیسی",
};
const FRONT_ORDER = ["ai-use-disclosure.tex", "dedication.tex", "acknowledgements.tex", "abstract-fa.tex", "abstract-en.tex"];

export async function buildThesisIndex() {
  const main = await fs.readFile(path.join(THESIS_ROOT, "main.tex"), "utf8");
  const inputs = Array.from(main.matchAll(/\\input\{([^}]+)\}/g), (match) => match[1].endsWith(".tex") ? match[1] : `${match[1]}.tex`);
  const chapterPaths = inputs.filter((value) => value.startsWith("chapters/"));
  const appendixPaths = inputs.filter((value) => value.startsWith("appendices/"));
  const frontNames = await existingFrontMatter();

  const [frontMatter, chapters, appendices] = await Promise.all([
    Promise.all(frontNames.map((name) => makeFile(`front-matter/${name}`, "front"))),
    Promise.all(chapterPaths.map((value) => makeFile(value, "chapter"))),
    Promise.all(appendixPaths.map((value) => makeFile(value, "appendix"))),
  ]);
  const supportPaths = ["metadata.tex", "glossary/terms.tex", "glossary/preliminary-acronyms.tex", "bibliography/references.bib"];
  const support = await Promise.all(supportPaths.map((value) => makeFile(value, "support")));
  support[0].title = "اطلاعات پایان‌نامه";
  support[1].title = "واژه‌نامه";
  support[2].title = "فهرست اختصارات";
  support[3].title = "منابع و مآخذ";

  const all = [...frontMatter, ...chapters, ...appendices, ...support];
  return {
    generatedAt: new Date().toISOString(),
    groups: [
      {id: "chapters", title: "فصل‌ها", files: chapters},
      {id: "appendices", title: "پیوست‌ها", files: appendices},
      {id: "front", title: "صفحات آغازین و پایانی", files: frontMatter},
      {id: "support", title: "اطلاعات و منابع", files: support},
    ],
    resources: await buildResources(all),
    fileCount: all.length,
  };
}

async function existingFrontMatter() {
  const names = await fs.readdir(path.join(THESIS_ROOT, "front-matter"));
  return [...FRONT_ORDER.filter((name) => names.includes(name)), ...names.filter(name => name.endsWith(".tex") && !FRONT_ORDER.includes(name)).sort()];
}

async function makeFile(relativePath, group) {
  const content = await fs.readFile(path.join(THESIS_ROOT, relativePath), "utf8");
  const outline = extractOutline(content);
  const fileName = path.basename(relativePath);
  const stem = fileName.replace(/\.(tex|bib)$/i, "");
  return {
    path: relativePath,
    fileName,
    title: FRONT_TITLES[fileName] || outline[0]?.title || stem.replace(/^[0-9]{2}-|^[A-Z]-/, "").replace(/-/g, " "),
    group,
    visual: isVisualPath(relativePath),
    outline,
  };
}

export function extractOutline(content) {
  const outline = [];
  const commandPattern = /\\(chapter|section|subsection|subsubsection)\s*\{/g;
  let match;
  while ((match = commandPattern.exec(content))) {
    const balanced = readBalanced(content, commandPattern.lastIndex - 1);
    if (!balanced) continue;
    const line = content.slice(0, match.index).split("\n").length;
    const levels = {chapter: 1, section: 2, subsection: 3, subsubsection: 4};
    outline.push({id: `${match[1]}:${line}`, kind: match[1], level: levels[match[1]], title: latexToPlain(balanced.value), line, from: match.index, to: balanced.to});
    commandPattern.lastIndex = balanced.to;
  }
  return outline;
}

export function readBalanced(content, openIndex) {
  if (content[openIndex] !== "{") return null;
  let depth = 0;
  let escaped = false;
  for (let index = openIndex; index < content.length; index += 1) {
    const char = content[index];
    if (escaped) { escaped = false; continue; }
    if (char === "\\") { escaped = true; continue; }
    if (char === "{") depth += 1;
    if (char === "}") {
      depth -= 1;
      if (depth === 0) return {value: content.slice(openIndex + 1, index), from: openIndex + 1, to: index + 1};
    }
  }
  return null;
}

export function latexToPlain(value) {
  let result = value;
  for (let pass = 0; pass < 5; pass += 1) {
    result = result.replace(/\\texorpdfstring\{([^{}]*)\}\{[^{}]*\}/g, "$1").replace(/\\(?:mbox|lr|textbf|emph|texttt)\{([^{}]*)\}/g, "$1");
  }
  return result.replace(/\\[A-Za-z@]+\*?/g, "").replace(/[{}]/g, "").replace(/~/g, " ").replace(/\s+/g, " ").trim();
}

async function buildResources(files) {
  const citations = [];
  const glossary = [];
  const labels = [];
  for (const file of files) {
    const content = await fs.readFile(path.join(THESIS_ROOT, file.path), "utf8");
    if (file.path.endsWith(".bib")) for (const match of content.matchAll(/@[A-Za-z]+\s*\{\s*([^,\s}]+)/g)) citations.push(match[1]);
    if (file.path === "glossary/terms.tex") for (const match of content.matchAll(/\\(?:newglossaryentry|newacronym)(?:\[[^\]]*\])?\{([^}]+)\}/g)) glossary.push(match[1]);
    for (const match of content.matchAll(/\\label\{([^}]+)\}/g)) labels.push(match[1]);
  }
  return {citations: [...new Set(citations)].sort(), glossary: [...new Set(glossary)].sort(), labels: [...new Set(labels)].sort()};
}
