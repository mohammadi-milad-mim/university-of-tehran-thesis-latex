import {
  BookOpenText, Bold, Braces, Code2, FileText, Italic, List, Menu, PanelLeftOpen,
  RefreshCw, Save, Search, TextQuote, Type, X,
} from "lucide-react";
import {useCallback, useEffect, useMemo, useRef, useState} from "react";

import {BuildDrawer} from "./components/BuildDrawer";
import {ConflictDialog} from "./components/ConflictDialog";
import {Navigator} from "./components/Navigator";
import {PdfPanel} from "./components/PdfPanel";
import {EditorPane, type CursorPosition, type EditorHandle} from "./editor/EditorPane";
import type {EditorMode, FileBuffer, Health, PreviewStatus, ThesisFile, ThesisIndex} from "./types";

const EMPTY_STATUS: PreviewStatus = {phase: "idle", revision: null, startedAt: null, finishedAt: null, log: [], diagnostics: []};

export function App() {
  const [index, setIndex] = useState<ThesisIndex | null>(null);
  const [health, setHealth] = useState<Health | null>(null);
  const [buffers, setBuffers] = useState<FileBuffer[]>([]);
  const [activePath, setActivePath] = useState<string | null>(null);
  const [mode, setMode] = useState<EditorMode>("visual");
  const [preferredProseMode, setPreferredProseMode] = useState<EditorMode>("visual");
  const [cursor, setCursor] = useState<CursorPosition>({line: 1, column: 1});
  const [pdfOpen, setPdfOpen] = useState(true);
  const [navOpen, setNavOpen] = useState(false);
  const [pdfStale, setPdfStale] = useState(true);
  const [pdfKind, setPdfKind] = useState<"source" | "preview">("source");
  const [pdfRevision, setPdfRevision] = useState("initial");
  const [targetPage, setTargetPage] = useState<number | null>(null);
  const [previewStatus, setPreviewStatus] = useState<PreviewStatus>(EMPTY_STATUS);
  const [buildOpen, setBuildOpen] = useState(false);
  const [conflictPath, setConflictPath] = useState<string | null>(null);
  const [message, setMessage] = useState("در حال آماده‌سازی ویرایشگر…");
  const editorRef = useRef<EditorHandle>(null);
  const preferredModeRef = useRef<EditorMode>("visual");
  const stateRef = useRef({buffers, activePath, index, previewStatus});
  stateRef.current = {buffers, activePath, index, previewStatus};

  const activeBuffer = buffers.find((buffer) => buffer.path === activePath) ?? null;
  const activeFile = useMemo(() => findFile(index, activePath), [index, activePath]);
  const conflictBuffer = conflictPath ? buffers.find((buffer) => buffer.path === conflictPath) ?? null : null;
  const dirtyCount = buffers.filter((buffer) => buffer.saveState !== "clean").length;

  const refreshIndex = useCallback(async () => {
    const response = await fetch("/api/index");
    if (!response.ok) throw new Error("فهرست پایان‌نامه خوانده نشد.");
    const body = await response.json() as ThesisIndex;
    setIndex(body);
    return body;
  }, []);

  const openFile = useCallback(async (file: ThesisFile, line?: number) => {
    const existing = stateRef.current.buffers.find((buffer) => buffer.path === file.path);
    if (existing) {
      setActivePath(file.path);
      setMode(file.visual ? preferredModeRef.current : "source");
      setNavOpen(false);
      if (line) setTimeout(() => editorRef.current?.jumpToLine(line), 0);
      return;
    }
    setMessage(`در حال باز کردن «${file.title}»…`);
    try {
      const response = await fetch(`/api/file?path=${encodeURIComponent(file.path)}`);
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "فایل باز نشد.");
      const buffer: FileBuffer = {path: body.path, content: body.content, savedContent: body.content, diskHash: body.hash, visual: body.visual, saveState: "clean"};
      setBuffers((current) => current.some(item => item.path === buffer.path) ? current : [...current, buffer]);
      setActivePath(file.path);
      setMode(file.visual ? preferredModeRef.current : "source");
      setMessage("آماده برای نوشتن");
      setNavOpen(false);
      if (line) setTimeout(() => editorRef.current?.jumpToLine(line), 0);
    } catch (error) { setMessage(error instanceof Error ? error.message : String(error)); }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      refreshIndex(),
      fetch("/api/health").then((response) => response.json() as Promise<Health>),
      fetch("/api/preview/status").then((response) => response.json() as Promise<PreviewStatus>),
      fetch("/api/pdf-info").then((response) => response.json()),
    ]).then(([nextIndex, nextHealth, nextStatus, pdfInfo]) => {
      if (cancelled) return;
      setHealth(nextHealth);
      setPreviewStatus(nextStatus);
      setPdfKind(pdfInfo.kind === "preview" ? "preview" : "source");
      setPdfRevision(pdfInfo.revision || pdfInfo.modifiedAt || String(Date.now()));
      const first = nextIndex.groups.find((group) => group.id === "chapters")?.files[0] ?? nextIndex.groups[0]?.files[0];
      if (first) void openFile(first);
    }).catch((error) => { if (!cancelled) setMessage(error instanceof Error ? error.message : String(error)); });
    return () => { cancelled = true; };
  }, [openFile, refreshIndex]);

  useEffect(() => {
    const dirty = buffers.some((buffer) => buffer.saveState !== "clean");
    const handler = (event: BeforeUnloadEvent) => { if (dirty) { event.preventDefault(); event.returnValue = ""; } };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [buffers]);

  const handleExternalChanges = useCallback(async (paths: string[]) => {
    setPdfStale(true);
    await Promise.all(paths.map(async (path) => {
      const current = stateRef.current.buffers.find((buffer) => buffer.path === path);
      if (!current) return;
      const response = await fetch(`/api/file?path=${encodeURIComponent(path)}`);
      if (!response.ok) return;
      const body = await response.json();
      setBuffers((items) => items.map((buffer) => {
        if (buffer.path !== path || body.hash === buffer.diskHash) return buffer;
        if (body.content === buffer.content) return {...buffer, diskHash: body.hash, savedContent: body.content, saveState: "clean", serverContent: undefined, serverHash: undefined};
        if (buffer.saveState === "clean") return {...buffer, content: body.content, savedContent: body.content, diskHash: body.hash, saveState: "clean"};
        return {...buffer, saveState: "conflict", serverContent: body.content, serverHash: body.hash};
      }));
      const latest = stateRef.current.buffers.find(buffer => buffer.path === path);
      if (latest && body.hash !== latest.diskHash && latest.saveState !== "clean" && body.content !== latest.content) setConflictPath(path);
    }));
    await refreshIndex().catch(() => undefined);
    setMessage("تغییرهای بیرونی پایان‌نامه بررسی شد.");
  }, [refreshIndex]);

  useEffect(() => {
    let socket: WebSocket | null = null;
    let retry: number | null = null;
    let disposed = false;
    const connect = () => {
      const protocol = location.protocol === "https:" ? "wss" : "ws";
      socket = new WebSocket(`${protocol}://${location.host}/ws`);
      socket.onmessage = (event) => {
        const payload = JSON.parse(String(event.data));
        if (payload.type === "files-changed") void handleExternalChanges(payload.paths);
        if (payload.type === "source-pdf-changed") { setPdfRevision(`source-${Date.now()}`); setPdfKind("source"); setPdfStale(true); }
        if (payload.type === "preview-status") {
          const status = payload.status as PreviewStatus;
          setPreviewStatus(status);
          if (status.phase === "failed") { setBuildOpen(true); setMessage("ساخت PDF ناموفق بود؛ آخرین PDF سالم حفظ شد."); }
          if (status.phase === "succeeded" && status.revision) {
            setPdfKind("preview"); setPdfRevision(status.revision); setPdfStale(false); setBuildOpen(true); setMessage("پیش‌نمایش دقیق آماده شد.");
          }
        }
      };
      socket.onclose = () => { if (!disposed) retry = window.setTimeout(connect, 1200); };
    };
    connect();
    return () => { disposed = true; if (retry) clearTimeout(retry); socket?.close(); };
  }, [handleExternalChanges]);

  const onEditorChange = useCallback((content: string) => {
    const path = stateRef.current.activePath;
    if (!path) return;
    setBuffers((current) => current.map((buffer) => buffer.path === path ? {...buffer, content, saveState: content === buffer.savedContent ? "clean" : "dirty", error: undefined} : buffer));
    setPdfStale(true);
  }, []);

  const saveWithHash = useCallback(async (path: string, content: string, expectedHash: string) => {
    setBuffers((current) => current.map((buffer) => buffer.path === path ? {...buffer, saveState: "saving"} : buffer));
    setMessage("در حال ذخیرهٔ فایل…");
    try {
      const response = await fetch("/api/file", {method: "POST", headers: {"content-type": "application/json"}, body: JSON.stringify({path, content, expectedHash})});
      const body = await response.json();
      if (response.status === 409) {
        setBuffers((current) => current.map((buffer) => buffer.path === path ? {...buffer, saveState: "conflict", serverContent: body.currentContent, serverHash: body.currentHash} : buffer));
        setConflictPath(path); setMessage("ذخیره متوقف شد؛ فایل روی دیسک تغییر کرده است."); return false;
      }
      if (!response.ok) throw new Error(body.error || "ذخیره ناموفق بود.");
      setBuffers((current) => current.map((buffer) => buffer.path === path ? {...buffer, diskHash: body.hash, savedContent: content, saveState: buffer.content === content ? "clean" : "dirty", serverContent: undefined, serverHash: undefined} : buffer));
      setMessage("فایل با موفقیت ذخیره شد.");
      return true;
    } catch (error) {
      setBuffers((current) => current.map((buffer) => buffer.path === path ? {...buffer, saveState: "error", error: error instanceof Error ? error.message : String(error)} : buffer));
      setMessage(error instanceof Error ? error.message : String(error)); return false;
    }
  }, []);

  const saveActive = useCallback(() => {
    const buffer = stateRef.current.buffers.find((item) => item.path === stateRef.current.activePath);
    if (!buffer || buffer.saveState === "clean" || buffer.saveState === "saving") return;
    void saveWithHash(buffer.path, buffer.content, buffer.diskHash);
  }, [saveWithHash]);

  const refreshPdf = useCallback(async () => {
    if (stateRef.current.previewStatus.phase === "running") return;
    setBuildOpen(true); setMessage("در حال آماده‌سازی پیش‌نمایش امن…");
    try {
      const response = await fetch("/api/preview", {
        method: "POST",
        headers: {"content-type": "application/json", "X-Thesis-Latex-Editor-Action": "preview-pdf"},
        body: JSON.stringify({buffers: stateRef.current.buffers.map((buffer) => ({path: buffer.path, content: buffer.content, baseHash: buffer.diskHash}))}),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "ساخت پیش‌نمایش آغاز نشد.");
      setPreviewStatus(body.status); setMessage("XeLaTeX در نسخهٔ امن در حال اجراست…");
    } catch (error) { setMessage(error instanceof Error ? error.message : String(error)); }
  }, []);

  const syncCursor = useCallback(async () => {
    if (!activePath || pdfKind !== "preview" || pdfStale || !previewStatus.revision) return;
    const query = new URLSearchParams({revision: previewStatus.revision, path: activePath, line: String(cursor.line), column: String(cursor.column)});
    const response = await fetch(`/api/sync?${query}`);
    const body = await response.json();
    if (!response.ok) { setMessage(body.error || "محل نشانگر در PDF پیدا نشد."); return; }
    setTargetPage(null);
    setTimeout(() => setTargetPage(body.page), 0);
    setMessage(`PDF به صفحهٔ ${toFa(body.page)} منتقل شد.`);
  }, [activePath, cursor, pdfKind, pdfStale, previewStatus.revision]);

  function selectMode(next: EditorMode) {
    if (!activeBuffer?.visual && next === "visual") return;
    setMode(next);
    if (activeBuffer?.visual) {
      preferredModeRef.current = next;
      setPreferredProseMode(next);
    }
  }

  function closeTab(path: string) {
    const buffer = buffers.find((item) => item.path === path);
    if (buffer && buffer.saveState !== "clean" && !window.confirm("این فایل تغییر ذخیره‌نشده دارد. زبانه بسته شود؟")) return;
    const indexOf = buffers.findIndex((item) => item.path === path);
    const remaining = buffers.filter((item) => item.path !== path);
    setBuffers(remaining);
    if (activePath === path) setActivePath(remaining[Math.max(0, indexOf - 1)]?.path ?? null);
  }

  async function openDiagnostic(path: string, line: number) {
    const file = findFile(index, path);
    if (file) await openFile(file, line);
  }

  return (
    <main className={`app-shell ${pdfOpen ? "with-pdf" : "without-pdf"}`} dir="rtl">
      <header className="topbar">
        <div className="brand"><button className="mobile-menu" onClick={() => setNavOpen(true)} aria-label="نمایش فهرست"><Menu size={19} /></button><span className="brand-mark"><BookOpenText size={19} /></span><div><strong>ویرایشگر پایان‌نامه</strong><span>لاتک فارسی · محلی و خصوصی</span></div></div>
        <div className="document-name"><strong>{activeFile?.title ?? "پایان‌نامه"}</strong><span dir="ltr">{activePath ?? ""}</span></div>
        <div className="top-actions">
          <span className={`status-pill ${previewStatus.phase}`}><i />{previewStatus.phase === "running" ? "ساخت PDF" : dirtyCount ? `${toFa(dirtyCount)} ذخیره‌نشده` : "همه‌چیز ذخیره شده"}</span>
          {!pdfOpen ? <button className="icon-text-button" onClick={() => setPdfOpen(true)}><PanelLeftOpen size={16} /> PDF</button> : null}
          <button className="button secondary" onClick={() => void refreshPdf()} disabled={previewStatus.phase === "running"}><RefreshCw className={previewStatus.phase === "running" ? "spin" : ""} size={16} /> تازه‌سازی PDF</button>
          <button className="button primary" onClick={saveActive} disabled={!activeBuffer || activeBuffer.saveState === "clean" || activeBuffer.saveState === "saving"}><Save size={16} /> ذخیره</button>
        </div>
      </header>

      {health && !health.toolchain.exactPreviewReady ? <div className="toolchain-banner"><strong>پیش‌نمایش تازه فعلاً آماده نیست.</strong><span>{health.toolchain.missingPackages.length ? `بستهٔ ${health.toolchain.missingPackages.join("، ")} در محیط لاتک پیدا نشد.` : "یکی از ابزارهای XeLaTeX، Biber، latexmk یا SyncTeX در دسترس نیست."} آخرین PDF سالم همچنان نمایش داده می‌شود.</span></div> : null}

      <div className="workspace">
        <div className={`navigator-slot ${navOpen ? "mobile-open" : ""}`}>{index ? <Navigator groups={index.groups} activePath={activePath} buffers={buffers} onOpen={(file, line) => void openFile(file, line)} onCloseMobile={() => setNavOpen(false)} /> : <div className="nav-loading">در حال خواندن ساختار پایان‌نامه…</div>}</div>
        {navOpen ? <button className="mobile-scrim" onClick={() => setNavOpen(false)} aria-label="بستن فهرست" /> : null}

        <section className="editor-column">
          <div className="tabs" role="tablist">{buffers.map((buffer) => {
            const file = findFile(index, buffer.path);
            return <button key={buffer.path} role="tab" aria-selected={buffer.path === activePath} className={buffer.path === activePath ? "active" : ""} onClick={() => { setActivePath(buffer.path); setMode(buffer.visual ? preferredProseMode : "source"); }}><FileText size={13} /><span>{file?.title ?? buffer.path}</span>{buffer.saveState !== "clean" ? <i className={buffer.saveState} /> : null}<X className="close-tab" size={13} onClick={(event) => { event.stopPropagation(); closeTab(buffer.path); }} /></button>;
          })}</div>
          <div className="editor-toolbar">
            <div className="mode-switch" aria-label="حالت ویرایش"><button className={mode === "visual" ? "active" : ""} onClick={() => selectMode("visual")} disabled={!activeBuffer?.visual}><Type size={14} /> نوشتاری</button><button className={mode === "source" ? "active" : ""} onClick={() => selectMode("source")}><Code2 size={14} /> لاتک</button></div>
            <div className="toolbar-separator" />
            <div className="format-actions" aria-label="ابزارهای نوشتاری">
              <button onClick={() => editorRef.current?.setBlock("section")} title="عنوان بخش"><Type size={15} /><span>بخش</span></button>
              <button onClick={() => editorRef.current?.wrapSelection("textbf")} title="ضخیم"><Bold size={15} /></button>
              <button onClick={() => editorRef.current?.wrapSelection("emph")} title="تأکید"><Italic size={15} /></button>
              <button onClick={() => editorRef.current?.toggleList()} title="فهرست"><List size={15} /></button>
              <button onClick={() => editorRef.current?.insertMacro("lr")} title="متن چپ‌به‌راست"><TextQuote size={15} /> LTR</button>
              <button onClick={() => editorRef.current?.insertMacro("cite")} title="درج منبع"><Braces size={15} /> منبع</button>
              <button onClick={() => editorRef.current?.insertMacro("ref")} title="درج ارجاع"><Braces size={15} /> ارجاع</button>
              <button onClick={() => editorRef.current?.insertMacro("gls")} title="درج واژه‌نامه"><Braces size={15} /> واژه</button>
              <button onClick={() => editorRef.current?.search()} title="جست‌وجو در فایل"><Search size={15} /></button>
            </div>
            <span className={`save-state ${activeBuffer?.saveState ?? "clean"}`}>{saveLabel(activeBuffer?.saveState)}</span>
          </div>
          <div className="editor-surface">
            <EditorPane ref={editorRef} buffer={activeBuffer} mode={mode} resources={index?.resources ?? {citations: [], glossary: [], labels: []}} onChange={onEditorChange} onSave={saveActive} onRefreshPdf={() => void refreshPdf()} onCursor={setCursor} onProtectedRange={(from, to) => { setMode("source"); setTimeout(() => editorRef.current?.selectRange(from, to), 0); }} />
            {!activeBuffer ? <div className="editor-empty"><BookOpenText size={34} /><strong>یک فایل را از فهرست انتخاب کنید</strong></div> : null}
          </div>
          <footer className="statusbar"><span>{message}</span><span dir="ltr">Ln {cursor.line}, Col {cursor.column}</span><span>{activeBuffer ? `${toFa(wordCount(activeBuffer.content))} واژه` : ""}</span></footer>
          <BuildDrawer status={previewStatus} open={buildOpen} onClose={() => setBuildOpen(false)} onDiagnostic={(path, line) => void openDiagnostic(path, line)} />
        </section>

        {pdfOpen ? <PdfPanel revisionKey={pdfRevision} kind={pdfKind} stale={pdfStale} targetPage={targetPage} canSync={pdfKind === "preview" && !pdfStale && Boolean(activePath)} onSync={() => void syncCursor()} onClose={() => setPdfOpen(false)} /> : null}
      </div>

      {conflictBuffer ? <ConflictDialog buffer={conflictBuffer} onCancel={() => setConflictPath(null)} onReloadDisk={() => {
        setBuffers((items) => items.map((buffer) => buffer.path === conflictBuffer.path ? {...buffer, content: buffer.serverContent ?? buffer.content, savedContent: buffer.serverContent ?? buffer.savedContent, diskHash: buffer.serverHash ?? buffer.diskHash, saveState: "clean", serverContent: undefined, serverHash: undefined} : buffer)); setConflictPath(null); setMessage("نسخهٔ دیسک بارگذاری شد.");
      }} onKeepMine={() => {
        const serverHash = conflictBuffer.serverHash; if (!serverHash) return; setConflictPath(null); void saveWithHash(conflictBuffer.path, conflictBuffer.content, serverHash);
      }} onMerge={(content) => {
        setBuffers((items) => items.map((buffer) => buffer.path === conflictBuffer.path ? {...buffer, content, diskHash: buffer.serverHash ?? buffer.diskHash, saveState: "dirty", serverContent: undefined, serverHash: undefined} : buffer)); setConflictPath(null); setMessage("ادغام آماده است؛ برای نوشتن روی دیسک، ذخیره را بزنید.");
      }} /> : null}
    </main>
  );
}

function findFile(index: ThesisIndex | null, path: string | null) { return path ? index?.groups.flatMap((group) => group.files).find((file) => file.path === path) ?? null : null; }
function saveLabel(state?: FileBuffer["saveState"]) { return state === "dirty" ? "ذخیره‌نشده" : state === "saving" ? "در حال ذخیره…" : state === "conflict" ? "تعارض فایل" : state === "error" ? "خطای ذخیره" : "ذخیره شده"; }
function wordCount(content: string) { const plain = content.replace(/%.*$/gm, "").replace(/\\[A-Za-z@]+\*?(?:\[[^\]]*\])?/g, " ").replace(/[{}$]/g, " ").trim(); return plain ? plain.split(/\s+/u).length : 0; }
const FA = "۰۱۲۳۴۵۶۷۸۹";
function toFa(value: number | string) { return String(value).replace(/\d/g, (digit) => FA[Number(digit)]); }
