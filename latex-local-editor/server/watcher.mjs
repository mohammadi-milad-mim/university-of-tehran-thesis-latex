import chokidar from "chokidar";
import path from "node:path";

import {THESIS_PDF, THESIS_ROOT, isWritablePath} from "./config.mjs";

export function startWorkspaceWatcher(onEvent) {
  const targets = [
    path.join(THESIS_ROOT, "main.tex"),
    path.join(THESIS_ROOT, "chapters"),
    path.join(THESIS_ROOT, "appendices"),
    path.join(THESIS_ROOT, "front-matter"),
    path.join(THESIS_ROOT, "metadata.tex"),
    path.join(THESIS_ROOT, "glossary"),
    path.join(THESIS_ROOT, "bibliography", "references.bib"),
    THESIS_PDF,
  ];
  const watcher = chokidar.watch(targets, {ignoreInitial: true, usePolling: process.env.THESIS_LATEX_EDITOR_POLLING === "1", awaitWriteFinish: {stabilityThreshold: 180, pollInterval: 50}});
  let pending = new Set();
  let timer = null;
  const flush = () => {
    const events = [...pending];
    pending = new Set();
    timer = null;
    const files = events.filter((value) => value !== "output/thesis.pdf" && (isWritablePath(value) || value === "main.tex"));
    if (files.length) onEvent({type: "files-changed", paths: files});
    if (events.includes("output/thesis.pdf")) onEvent({type: "source-pdf-changed"});
  };
  watcher.on("all", (_event, absolutePath) => {
    const relative = path.relative(THESIS_ROOT, absolutePath).split(path.sep).join("/");
    pending.add(relative);
    if (timer) clearTimeout(timer);
    timer = setTimeout(flush, 250);
  });
  return {close: async () => { if (timer) clearTimeout(timer); await watcher.close(); }};
}
