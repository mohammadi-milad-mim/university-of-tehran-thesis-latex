import {BookOpen, ChevronLeft, FileCog, FileText, Search, X} from "lucide-react";
import {useMemo, useState} from "react";

import type {FileBuffer, ThesisFile, ThesisGroup} from "../types";

type Props = {
  groups: ThesisGroup[];
  activePath: string | null;
  buffers: FileBuffer[];
  onOpen: (file: ThesisFile, line?: number) => void;
  onCloseMobile?: () => void;
};

export function Navigator({groups, activePath, buffers, onOpen, onCloseMobile}: Props) {
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(["chapters", "support"]));
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(() => new Set(activePath ? [activePath] : []));
  const normalized = normalize(query);
  const visibleGroups = useMemo(() => groups.map((group) => ({
    ...group,
    files: group.files.filter((file) => !normalized || matches(`${file.title} ${file.path} ${file.outline.map((item) => item.title).join(" ")}`, normalized)),
  })).filter((group) => group.files.length), [groups, normalized]);
  const bufferByPath = new Map(buffers.map((buffer) => [buffer.path, buffer]));

  function toggleGroup(id: string) {
    setExpanded((current) => toggleSet(current, id));
  }
  function toggleFile(path: string) {
    setExpandedFiles((current) => toggleSet(current, path));
  }

  return (
    <aside className="navigator" aria-label="فهرست پایان‌نامه">
      <div className="navigator-title"><div><BookOpen size={17} /><strong>ساختار پایان‌نامه</strong></div>{onCloseMobile ? <button onClick={onCloseMobile} aria-label="بستن فهرست"><X size={18} /></button> : null}</div>
      <label className="search"><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="جست‌وجوی فایل یا بخش…" spellCheck={false} />{query ? <button onClick={() => setQuery("")} aria-label="پاک کردن"><X size={13} /></button> : null}</label>
      <nav>
        {visibleGroups.map((group) => {
          const isOpen = normalized ? true : expanded.has(group.id);
          return (
            <section className="nav-group" key={group.id}>
              <button className="nav-group-title" onClick={() => toggleGroup(group.id)} aria-expanded={isOpen}><span>{group.title}</span><small>{toFa(group.files.length)}</small><ChevronLeft className={isOpen ? "rotated" : ""} size={14} /></button>
              {isOpen ? group.files.map((file) => {
                const active = file.path === activePath;
                const buffer = bufferByPath.get(file.path);
                const hasOutline = file.outline.length > 1;
                const fileOpen = normalized ? true : expandedFiles.has(file.path) || active;
                return (
                  <div className="nav-file-wrap" key={file.path}>
                    <div className={`nav-file ${active ? "active" : ""}`}>
                      <button className="nav-file-main" onClick={() => onOpen(file)} title={file.path}>
                        {file.group === "support" ? <FileCog size={14} /> : <FileText size={14} />}
                        <span>{file.title}</span>
                        {buffer && buffer.saveState !== "clean" ? <i className={`file-state ${buffer.saveState}`} title="تغییر ذخیره‌نشده" /> : null}
                      </button>
                      {hasOutline ? <button className="nav-file-toggle" onClick={() => toggleFile(file.path)} aria-label="نمایش بخش‌ها"><ChevronLeft className={fileOpen ? "rotated" : ""} size={13} /></button> : null}
                    </div>
                    {hasOutline && fileOpen ? <div className="nav-outline">{file.outline.slice(1).map((item) => <button key={item.id} style={{paddingRight: `${8 + Math.max(0, item.level - 2) * 12}px`}} onClick={() => onOpen(file, item.line)}><span>{item.title}</span><small>{toFa(item.line)}</small></button>)}</div> : null}
                  </div>
                );
              }) : null}
            </section>
          );
        })}
        {visibleGroups.length === 0 ? <div className="nav-empty">نتیجه‌ای پیدا نشد.</div> : null}
      </nav>
      <div className="nav-footer"><span>{toFa(groups.reduce((sum, group) => sum + group.files.length, 0))} فایل قابل ویرایش</span><span>محلی و خصوصی</span></div>
    </aside>
  );
}

function normalize(value: string) { return value.trim().toLocaleLowerCase("fa").replace(/ي/g, "ی").replace(/ك/g, "ک"); }
function matches(value: string, query: string) { return normalize(value).includes(query); }
function toggleSet(current: Set<string>, value: string) { const next = new Set(current); if (next.has(value)) next.delete(value); else next.add(value); return next; }
const FA = "۰۱۲۳۴۵۶۷۸۹";
function toFa(value: number | string) { return String(value).replace(/\d/g, (digit) => FA[Number(digit)]); }
