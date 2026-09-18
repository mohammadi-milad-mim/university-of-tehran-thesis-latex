import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import {THESIS_ROOT, isWritablePath} from "./config.mjs";

export function sanitizeRelativePath(raw) {
  if (typeof raw !== "string") return null;
  const value = raw.replace(/\\/g, "/").trim();
  if (!value || value.includes("\0") || value.includes("//") || value.startsWith("/")) return null;
  if (path.isAbsolute(value)) return null;
  const parts = value.split("/");
  if (parts.some((part) => !part || part === "." || part === "..")) return null;
  const normalized = path.posix.normalize(value);
  if (normalized !== value || normalized.startsWith("../")) return null;
  return normalized;
}

export function sha256(text) {
  return crypto.createHash("sha256").update(text, "utf8").digest("hex");
}

export async function resolveAllowedFile(rawPath) {
  const relativePath = sanitizeRelativePath(rawPath);
  if (!relativePath || !isWritablePath(relativePath)) {
    return {error: "path is not an editable thesis author file", status: 403};
  }
  const root = await fs.realpath(THESIS_ROOT);
  const requested = path.join(root, relativePath);
  let real;
  try {
    real = await fs.realpath(requested);
  } catch (error) {
    if (error?.code === "ENOENT") return {error: "file not found", status: 404};
    throw error;
  }
  const inside = real === root || real.startsWith(`${root}${path.sep}`);
  if (!inside) return {error: "file escapes thesis workspace", status: 403};
  const stat = await fs.lstat(real);
  if (!stat.isFile() || stat.isSymbolicLink()) return {error: "file is not a regular workspace file", status: 403};
  return {relativePath, absolutePath: real, stat};
}

export function isSha256(value) {
  return typeof value === "string" && /^[a-f0-9]{64}$/i.test(value);
}
