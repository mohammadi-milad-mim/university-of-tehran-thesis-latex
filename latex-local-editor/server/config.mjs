import path from "node:path";
import {fileURLToPath} from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
export const TOOL_ROOT = path.resolve(here, "..");
export const REPO_ROOT = path.resolve(TOOL_ROOT, "..");
export const THESIS_ROOT = process.env.THESIS_LATEX_EDITOR_WORKSPACE
  ? path.resolve(process.env.THESIS_LATEX_EDITOR_WORKSPACE)
  : path.join(REPO_ROOT, "thesis-latex");

export const CACHE_ROOT = process.env.THESIS_LATEX_EDITOR_CACHE
  ? path.resolve(process.env.THESIS_LATEX_EDITOR_CACHE)
  : path.join(TOOL_ROOT, ".cache");
export const PREVIEW_ROOT = path.join(CACHE_ROOT, "preview");
export const THESIS_PDF = path.join(THESIS_ROOT, "output", "thesis.pdf");
export const FONT_ROOT = path.join(THESIS_ROOT, "vendor", "irfonts", "ttf");

export const API_PORT = Number(process.env.THESIS_LATEX_EDITOR_API_PORT || 5185);
export const CLIENT_PORT = Number(process.env.THESIS_LATEX_EDITOR_PORT || 5184);
export const LATEXMK_BIN = process.env.THESIS_LATEX_EDITOR_LATEXMK || "latexmk";
export const SYNCTEX_BIN = process.env.THESIS_LATEX_EDITOR_SYNCTEX || "synctex";
export const MAX_JSON_BYTES = "16mb";
export const MAX_FILE_BYTES = 8 * 1024 * 1024;

export const WRITABLE_PATTERNS = [
  /^chapters\/[0-9]{2}-[a-z0-9][a-z0-9-]*\.tex$/,
  /^appendices\/[A-Z]-[a-z0-9][a-z0-9-]*\.tex$/,
  /^front-matter\/[a-z0-9][a-z0-9-]*\.tex$/,
  /^metadata\.tex$/,
  /^glossary\/(terms|preliminary-acronyms)\.tex$/,
  /^bibliography\/references\.bib$/,
];

export const PROSE_PATTERNS = [
  /^chapters\/.+\.tex$/,
  /^appendices\/.+\.tex$/,
  /^front-matter\/.+\.tex$/,
];

export function isWritablePath(relativePath) {
  return WRITABLE_PATTERNS.some((pattern) => pattern.test(relativePath));
}

export function isVisualPath(relativePath) {
  return PROSE_PATTERNS.some((pattern) => pattern.test(relativePath));
}

export const BIND_HOST = process.env.THESIS_LATEX_EDITOR_HOST || "127.0.0.1";
export const PRODUCTION = process.env.NODE_ENV === "production";
export const ALLOWED_HOSTS = new Set((process.env.THESIS_LATEX_EDITOR_ALLOWED_HOSTS || `127.0.0.1:${API_PORT},localhost:${API_PORT},[::1]:${API_PORT},127.0.0.1:${CLIENT_PORT},localhost:${CLIENT_PORT},[::1]:${CLIENT_PORT}`).split(",").map(s => s.trim()));
