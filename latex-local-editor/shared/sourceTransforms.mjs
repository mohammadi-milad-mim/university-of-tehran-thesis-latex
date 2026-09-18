function safeRange(source, from, to = from) {
  const start = Math.max(0, Math.min(source.length, Number(from) || 0));
  const end = Math.max(start, Math.min(source.length, Number(to) || 0));
  return {from: start, to: end};
}

export function wrapLatexCommand(source, from, to, command) {
  const range = safeRange(source, from, to);
  const selected = source.slice(range.from, range.to);
  const insert = `\\${command}{${selected}}`;
  const content = source.slice(0, range.from) + insert + source.slice(range.to);
  const cursor = selected ? range.from + insert.length : range.from + command.length + 2;
  return {content, from: range.from, to: range.to, insert, cursor};
}

export function setLatexBlock(source, position, command) {
  const cursor = safeRange(source, position).from;
  const lineFrom = source.lastIndexOf("\n", Math.max(0, cursor - 1)) + 1;
  const nextBreak = source.indexOf("\n", cursor);
  const lineTo = nextBreak < 0 ? source.length : nextBreak;
  const line = source.slice(lineFrom, lineTo);
  const existing = line.match(/^\\(?:section|subsection|subsubsection)\{(.*)\}(\\label\{[^}]+\})?$/);
  const title = existing?.[1] ?? line;
  const insert = `\\${command}{${title}}${existing?.[2] ?? ""}`;
  const content = source.slice(0, lineFrom) + insert + source.slice(lineTo);
  return {content, from: lineFrom, to: lineTo, insert, cursor: lineFrom + command.length + 2 + title.length};
}

export function makeItemize(source, from, to) {
  const range = safeRange(source, from, to);
  const selected = source.slice(range.from, range.to) || "مورد تازه";
  const body = selected.split("\n").map((line) => `\\item ${line}`).join("\n");
  const insert = `\\begin{itemize}\n${body}\n\\end{itemize}`;
  const content = source.slice(0, range.from) + insert + source.slice(range.to);
  return {content, from: range.from, to: range.to, insert, cursor: range.from + "\\begin{itemize}\n\\item ".length};
}
