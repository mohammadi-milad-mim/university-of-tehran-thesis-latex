const PROTECTED = new Set([
  "figure", "figure*", "table", "table*", "longtable", "tabular", "tabularx",
  "equation", "equation*", "align", "align*", "gather", "gather*", "multline",
  "ThesisChart", "ThesisLandscape", "landscape", "minipage",
]);

export function firstStrongDirection(text) {
  for (const character of text) {
    if (/\p{Script=Arabic}|\p{Script=Hebrew}/u.test(character)) return "rtl";
    if (/\p{Letter}/u.test(character)) return "ltr";
  }
  return "rtl";
}

export function readBalanced(content, openIndex) {
  if (content[openIndex] !== "{") return null;
  let depth = 0;
  let escaped = false;
  for (let index = openIndex; index < content.length; index += 1) {
    const character = content[index];
    if (escaped) { escaped = false; continue; }
    if (character === "\\") { escaped = true; continue; }
    if (character === "{") depth += 1;
    if (character === "}") {
      depth -= 1;
      if (depth === 0) return {from: openIndex + 1, to: index, end: index + 1, value: content.slice(openIndex + 1, index)};
    }
  }
  return null;
}

export function plainLatex(value) {
  let result = value;
  for (let pass = 0; pass < 6; pass += 1) {
    result = result
      .replace(/\\texorpdfstring\{([^{}]*)\}\{[^{}]*\}/g, "$1")
      .replace(/\\(?:mbox|lr|textbf|emph|texttt)\{([^{}]*)\}/g, "$1");
  }
  return result.replace(/\\[A-Za-z@]+\*?/g, "").replace(/[{}]/g, "").replace(/~/g, " ").replace(/\s+/g, " ").trim();
}

export function findProtectedEnvironments(content) {
  const token = /\\(begin|end)\{([^}]+)\}/g;
  const stack = [];
  const ranges = [];
  let match;
  while ((match = token.exec(content))) {
    const kind = match[1];
    const environment = match[2];
    if (kind === "begin") {
      stack.push({environment, from: match.index, headerEnd: token.lastIndex});
      continue;
    }
    let openIndex = stack.length - 1;
    while (openIndex >= 0 && stack[openIndex].environment !== environment) openIndex -= 1;
    if (openIndex < 0) continue;
    const [open] = stack.splice(openIndex, 1);
    if (!PROTECTED.has(environment)) continue;
    const body = content.slice(open.headerEnd, match.index);
    const caption = body.match(/\\caption(?:\[[^\]]*\])?\{([^{}]*)\}/)?.[1];
    const label = body.match(/\\label\{([^}]+)\}/)?.[1];
    ranges.push({from: open.from, to: token.lastIndex, environment, title: plainLatex(caption || label || protectedTitle(environment)), label: label || null});
  }
  return ranges
    .sort((a, b) => a.from - b.from || b.to - a.to)
    .filter((candidate, index, all) => !all.some((parent, parentIndex) => parentIndex !== index && parent.from <= candidate.from && parent.to >= candidate.to));
}

export function findInlineCommands(content, from = 0, to = content.length) {
  const result = [];
  const pattern = /\\(textbf|emph|lr|mbox|cite|ref|gls)\s*\{/g;
  pattern.lastIndex = from;
  let match;
  while ((match = pattern.exec(content)) && match.index < to) {
    const balanced = readBalanced(content, pattern.lastIndex - 1);
    if (!balanced || balanced.end > to) continue;
    result.push({command: match[1], from: match.index, to: balanced.end, contentFrom: balanced.from, contentTo: balanced.to, value: balanced.value});
    pattern.lastIndex = balanced.end;
  }
  return result;
}

export function findHeadings(content) {
  const result = [];
  const pattern = /\\(chapter|section|subsection|subsubsection)\s*\{/g;
  let match;
  while ((match = pattern.exec(content))) {
    const balanced = readBalanced(content, pattern.lastIndex - 1);
    if (!balanced) continue;
    const lineEnd = content.indexOf("\n", balanced.end);
    const suffixLimit = lineEnd < 0 ? content.length : lineEnd;
    const labelMatch = content.slice(balanced.end, suffixLimit).match(/^\s*\\label\{[^}]+\}/);
    result.push({command: match[1], from: match.index, to: labelMatch ? balanced.end + labelMatch[0].length : balanced.end, contentFrom: balanced.from, contentTo: balanced.to, title: plainLatex(balanced.value)});
    pattern.lastIndex = balanced.end;
  }
  return result;
}

function protectedTitle(environment) {
  const titles = {
    figure: "شکل", "figure*": "شکل", table: "جدول", "table*": "جدول", longtable: "جدول بلند",
    ThesisChart: "نمودار", equation: "معادله", "equation*": "معادله", align: "معادله",
    ThesisLandscape: "بخش افقی", landscape: "بخش افقی", minipage: "چیدمان ویژه",
  };
  return titles[environment] || environment;
}
