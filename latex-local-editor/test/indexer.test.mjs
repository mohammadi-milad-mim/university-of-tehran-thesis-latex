import test from "node:test";
import assert from "node:assert/strict";

import {extractOutline, latexToPlain, readBalanced} from "../server/indexer.mjs";

test("outline preserves document order and nested heading text", () => {
  const source = [
    "\\chapter{مقدمه}",
    "متن",
    "\\section{روش \\lr{API}}\\label{sec:method}",
    "\\subsection{جزئیات \\textbf{مهم}}",
  ].join("\n");
  const outline = extractOutline(source);
  assert.deepEqual(outline.map(({kind, level, line, title}) => ({kind, level, line, title})), [
    {kind: "chapter", level: 1, line: 1, title: "مقدمه"},
    {kind: "section", level: 2, line: 3, title: "روش API"},
    {kind: "subsection", level: 3, line: 4, title: "جزئیات مهم"},
  ]);
});

test("balanced parsing and plain-text extraction handle nested braces safely", () => {
  const source = "{الف {ب} ج}";
  assert.deepEqual(readBalanced(source, 0), {value: "الف {ب} ج", from: 1, to: 11});
  assert.equal(latexToPlain("\\texorpdfstring{عنوان \\lr{API}}{Title}"), "عنوان API");
  assert.equal(readBalanced("{ناتمام", 0), null);
});
