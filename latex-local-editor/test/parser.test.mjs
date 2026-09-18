import test from "node:test";
import assert from "node:assert/strict";

import {
  findHeadings, findInlineCommands, findProtectedEnvironments, firstStrongDirection,
} from "../shared/latexParser.mjs";
import {makeItemize, setLatexBlock, wrapLatexCommand} from "../shared/sourceTransforms.mjs";

test("direction follows the first strong Persian or Latin character", () => {
  assert.equal(firstStrongDirection("  ۱۲۳ متن فارسی API"), "rtl");
  assert.equal(firstStrongDirection("  123 API و متن"), "ltr");
  assert.equal(firstStrongDirection("\\section{عنوان}"), "ltr");
  assert.equal(firstStrongDirection("  ۱۲۳"), "rtl");
});

test("visual parsing is read-only and keeps unknown LaTeX byte-identical", () => {
  const source = "\\section{نتایج \\lr{API}}\nمتن \\textbf{مهم} و \\unknown{دست‌نخورده}.\n";
  const before = Buffer.from(source);
  assert.equal(findHeadings(source)[0].title, "نتایج API");
  assert.deepEqual(findInlineCommands(source).map((item) => item.command), ["lr", "textbf"]);
  assert.deepEqual(findProtectedEnvironments(source), []);
  assert.deepEqual(Buffer.from(source), before);
});

test("protected environments collapse to the outer exact source range", () => {
  const source = [
    "پیش",
    "\\begin{figure}",
    "\\begin{tabular}{cc} الف & ب \\\\ \\end{tabular}",
    "\\caption{نمودار اصلی}\\label{fig:main}",
    "\\end{figure}",
    "پس",
  ].join("\n");
  const ranges = findProtectedEnvironments(source);
  assert.equal(ranges.length, 1);
  assert.equal(ranges[0].environment, "figure");
  assert.equal(ranges[0].title, "نمودار اصلی");
  assert.equal(source.slice(ranges[0].from, ranges[0].to), source.split("\n").slice(1, 5).join("\n"));
});

test("supported formatting changes only the requested source range", () => {
  const source = "قبل متن انتخابی بعد";
  const from = source.indexOf("متن");
  const to = from + "متن انتخابی".length;
  const wrapped = wrapLatexCommand(source, from, to, "textbf");
  assert.equal(wrapped.content, "قبل \\textbf{متن انتخابی} بعد");
  assert.equal(wrapped.content.slice(0, from), source.slice(0, from));
  assert.equal(wrapped.content.slice(from + wrapped.insert.length), source.slice(to));

  const heading = setLatexBlock("پیش\nعنوان\nپس", 6, "section");
  assert.equal(heading.content, "پیش\n\\section{عنوان}\nپس");
  const relabeled = setLatexBlock("\\subsection{عنوان}\\label{sec:x}", 4, "section");
  assert.equal(relabeled.content, "\\section{عنوان}\\label{sec:x}");

  const list = makeItemize("الف\nب", 0, 5);
  assert.equal(list.content, "\\begin{itemize}\n\\item الف\n\\item ب\n\\end{itemize}");
});
