import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import {MAX_FILE_BYTES, isVisualPath} from "./config.mjs";
import {isSha256, resolveAllowedFile, sha256} from "./security.mjs";

export async function readAuthorFile(rawPath) {
  const resolved = await resolveAllowedFile(rawPath);
  if (resolved.error) return resolved;
  if (resolved.stat.size > MAX_FILE_BYTES) return {error: "file is too large", status: 413};
  const content = await fs.readFile(resolved.absolutePath, "utf8");
  return {
    path: resolved.relativePath,
    content,
    hash: sha256(content),
    modifiedAt: resolved.stat.mtime.toISOString(),
    visual: isVisualPath(resolved.relativePath),
  };
}

export async function saveAuthorFile(rawPath, content, expectedHash) {
  if (typeof content !== "string") return {error: "content must be a string", status: 400};
  if (Buffer.byteLength(content, "utf8") > MAX_FILE_BYTES) return {error: "content is too large", status: 413};
  if (!isSha256(expectedHash)) return {error: "expectedHash must be the hash returned by the file read", status: 400};

  const resolved = await resolveAllowedFile(rawPath);
  if (resolved.error) return resolved;
  const diskContent = await fs.readFile(resolved.absolutePath, "utf8");
  const diskHash = sha256(diskContent);
  if (diskHash !== expectedHash.toLowerCase()) {
    return {
      error: "conflict",
      status: 409,
      path: resolved.relativePath,
      currentHash: diskHash,
      currentContent: diskContent,
    };
  }

  const directory = path.dirname(resolved.absolutePath);
  const temporary = path.join(
    directory,
    `.${path.basename(resolved.absolutePath)}.${process.pid}.${crypto.randomBytes(5).toString("hex")}.tmp`,
  );
  try {
    await fs.writeFile(temporary, content, {encoding: "utf8", flag: "wx", mode: resolved.stat.mode});
    const handle = await fs.open(temporary, "r");
    try { await handle.sync(); } finally { await handle.close(); }
    await fs.rename(temporary, resolved.absolutePath);
  } catch (error) {
    await fs.unlink(temporary).catch(() => undefined);
    throw error;
  }
  const stat = await fs.stat(resolved.absolutePath);
  return {path: resolved.relativePath, hash: sha256(content), modifiedAt: stat.mtime.toISOString()};
}
