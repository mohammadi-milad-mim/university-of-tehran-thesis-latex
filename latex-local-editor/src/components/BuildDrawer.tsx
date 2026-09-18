import {AlertCircle, CheckCircle2, ChevronDown, LoaderCircle, X} from "lucide-react";
import type {PreviewStatus} from "../types";

export function BuildDrawer({status, open, onClose, onDiagnostic}: {status: PreviewStatus; open: boolean; onClose: () => void; onDiagnostic: (path: string, line: number) => void}) {
  if (!open) return null;
  const icon = status.phase === "running" ? <LoaderCircle className="spin" size={18} /> : status.phase === "succeeded" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />;
  const title = status.phase === "running" ? "در حال ساخت پیش‌نمایش دقیق…" : status.phase === "succeeded" ? "پیش‌نمایش آماده شد" : status.phase === "failed" ? "ساخت PDF ناموفق بود" : "گزارش پیش‌نمایش";
  return <section className={`build-drawer ${status.phase}`}><header><div>{icon}<strong>{title}</strong></div><button onClick={onClose} aria-label="بستن گزارش"><X size={17} /></button></header>{status.diagnostics.length ? <div className="build-diagnostics">{status.diagnostics.map((diagnostic, index) => <button key={`${diagnostic.path}:${diagnostic.line}:${index}`} onClick={() => diagnostic.path && diagnostic.line ? onDiagnostic(diagnostic.path, diagnostic.line) : undefined}><AlertCircle size={14} /><span>{diagnostic.message}</span>{diagnostic.path ? <small dir="ltr">{diagnostic.path}:{diagnostic.line}</small> : null}</button>)}</div> : null}<details><summary><ChevronDown size={14} /> خروجی فنی XeLaTeX</summary><pre dir="ltr">{status.log.slice(-80).join("\n") || "هنوز گزارشی ثبت نشده است."}</pre></details></section>;
}
