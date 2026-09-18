import {ChevronLeft, ChevronRight, FileWarning, LocateFixed, PanelLeftClose, ZoomIn, ZoomOut} from "lucide-react";
import {useCallback, useEffect, useMemo, useRef, useState} from "react";
import * as pdfjs from "pdfjs-dist";
import {exactPdfDocumentOptions, shouldRenderPdfPage} from "../../shared/pdfViewer.mjs";

pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.mjs", import.meta.url).toString();

type Props = {
  revisionKey: string;
  kind: "source" | "preview";
  stale: boolean;
  targetPage: number | null;
  canSync: boolean;
  onSync: () => void;
  onClose: () => void;
};

export function PdfPanel({revisionKey, kind, stale, targetPage, canSync, onSync, onClose}: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef(new Map<number, HTMLDivElement>());
  const [pdf, setPdf] = useState<pdfjs.PDFDocumentProxy | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "missing" | "error">("loading");
  const [message, setMessage] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [baseScale, setBaseScale] = useState(.62);

  useEffect(() => {
    let disposed = false;
    // XeLaTeX embeds shaped Persian glyphs. Draw those glyph outlines directly
    // instead of rebuilding a browser font and shaping the RTL text twice.
    const task = pdfjs.getDocument(exactPdfDocumentOptions(`/api/pdf?revision=${encodeURIComponent(revisionKey)}`));
    setStatus("loading");
    setMessage("");
    setPdf(null);
    void task.promise.then((document) => {
      if (disposed) { void document.destroy(); return; }
      setPdf(document); setStatus("ready");
    }).catch((error: unknown) => {
      if (disposed) return;
      const text = error instanceof Error ? error.message : String(error);
      setStatus(/404|Missing PDF/i.test(text) ? "missing" : "error"); setMessage(text);
    });
    return () => { disposed = true; void task.destroy(); };
  }, [revisionKey]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || !pdf) return;
    let disposed = false;
    const fit = async () => {
      const page = await pdf.getPage(1);
      if (disposed) return;
      const viewport = page.getViewport({scale: 1});
      setBaseScale(Math.max(.25, Math.min(1.3, (host.clientWidth - 38) / viewport.width)));
    };
    void fit();
    const observer = new ResizeObserver(() => void fit());
    observer.observe(host);
    return () => { disposed = true; observer.disconnect(); };
  }, [pdf]);

  const goToPage = useCallback((page: number) => {
    if (!pdf) return;
    const safe = Math.max(1, Math.min(pdf.numPages, page));
    pageRefs.current.get(safe)?.scrollIntoView({block: "start", behavior: "smooth"});
    setCurrentPage(safe);
  }, [pdf]);

  useEffect(() => { if (targetPage) goToPage(targetPage); }, [targetPage, goToPage]);

  const pages = useMemo(() => pdf ? Array.from({length: pdf.numPages}, (_, index) => index + 1) : [], [pdf]);
  const scale = baseScale * zoom;

  useEffect(() => {
    const host = hostRef.current;
    if (!host || !pdf) return;
    let frame = 0;
    const updateCurrentPage = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const hostTop = host.getBoundingClientRect().top + 8;
        let nearestPage = 1;
        let nearestDistance = Number.POSITIVE_INFINITY;
        for (const [pageNumber, element] of pageRefs.current) {
          const rectangle = element.getBoundingClientRect();
          const distance = rectangle.top <= hostTop && rectangle.bottom >= hostTop
            ? 0
            : Math.min(Math.abs(rectangle.top - hostTop), Math.abs(rectangle.bottom - hostTop));
          if (distance < nearestDistance) { nearestDistance = distance; nearestPage = pageNumber; }
        }
        setCurrentPage(nearestPage);
      });
    };
    host.addEventListener("scroll", updateCurrentPage, {passive: true});
    updateCurrentPage();
    return () => { host.removeEventListener("scroll", updateCurrentPage); cancelAnimationFrame(frame); };
  }, [pdf, scale]);

  return (
    <aside className="pdf-column" aria-label="پیش‌نمایش PDF">
      <div className="pdf-header">
        <div><b>پیش‌نمایش قطعی</b><span>{kind === "preview" ? "نسخهٔ ساخته‌شده از ویرایشگر" : "آخرین PDF پایان‌نامه"}</span></div>
        <div className="pdf-header-actions">{stale ? <span className="stale-badge"><FileWarning size={12} /> نیازمند تازه‌سازی</span> : null}<button onClick={onClose} aria-label="بستن پیش‌نمایش"><PanelLeftClose size={18} /></button></div>
      </div>
      <div className="pdf-tools">
        <button onClick={() => setZoom((value) => Math.max(.55, value - .1))} aria-label="کوچک‌نمایی"><ZoomOut size={15} /></button>
        <span>{toFa(Math.round(zoom * 100))}٪</span>
        <button onClick={() => setZoom((value) => Math.min(1.9, value + .1))} aria-label="بزرگ‌نمایی"><ZoomIn size={15} /></button>
        <i />
        <button onClick={() => goToPage(currentPage - 1)} disabled={currentPage <= 1} aria-label="صفحه قبل"><ChevronRight size={15} /></button>
        <label><input type="number" min={1} max={pdf?.numPages ?? 1} value={currentPage} onChange={(event) => goToPage(Number(event.target.value))} aria-label="شماره صفحه" /><span>از {toFa(pdf?.numPages ?? 0)}</span></label>
        <button onClick={() => goToPage(currentPage + 1)} disabled={!pdf || currentPage >= pdf.numPages} aria-label="صفحه بعد"><ChevronLeft size={15} /></button>
        <button className="sync-button" onClick={onSync} disabled={!canSync} title={canSync ? "بردن PDF به محل نشانگر" : "برای همگام‌سازی، ابتدا PDF را تازه‌سازی کنید"}><LocateFixed size={15} /> محل نشانگر</button>
      </div>
      <div className={`pdf-scroll ${status}`} ref={hostRef}>
        {status === "loading" ? <PdfMessage title="در حال باز کردن PDF…" detail="صفحه‌های پایان‌نامه آماده می‌شوند." /> : null}
        {status === "missing" ? <PdfMessage title="PDF در دسترس نیست" detail="پیش‌نمایش را تازه‌سازی کنید یا خروجی پایان‌نامه را بسازید." /> : null}
        {status === "error" ? <PdfMessage title="PDF نمایش داده نشد" detail={message || "خطای ناشناخته"} /> : null}
        {pdf ? <div className="pdf-pages">{pages.map((page) => <PdfPage key={`${revisionKey}:${page}`} pdf={pdf} pageNumber={page} scale={scale} shouldRender={shouldRenderPdfPage(page, currentPage)} register={(element) => { if (element) pageRefs.current.set(page, element); else pageRefs.current.delete(page); }} />)}</div> : null}
      </div>
    </aside>
  );
}

function PdfPage({pdf, pageNumber, scale, shouldRender, register}: {pdf: pdfjs.PDFDocumentProxy; pageNumber: number; scale: number; shouldRender: boolean; register: (element: HTMLDivElement | null) => void}) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const taskRef = useRef<ReturnType<pdfjs.PDFPageProxy["render"]> | null>(null);
  const [ratio, setRatio] = useState(1.4142);

  const setWrap = useCallback((element: HTMLDivElement | null) => { wrapRef.current = element; register(element); }, [register]);

  useEffect(() => {
    if (!shouldRender || !canvasRef.current) return;
    let disposed = false;
    void pdf.getPage(pageNumber).then((page) => {
      if (disposed || !canvasRef.current) return;
      const viewport = page.getViewport({scale});
      setRatio(viewport.height / viewport.width);
      const canvas = canvasRef.current;
      const outputScale = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.ceil(viewport.width * outputScale);
      canvas.height = Math.ceil(viewport.height * outputScale);
      canvas.style.width = `${Math.ceil(viewport.width)}px`;
      canvas.style.height = `${Math.ceil(viewport.height)}px`;
      const context = canvas.getContext("2d", {alpha: false});
      if (!context) return;
      taskRef.current?.cancel();
      const task = page.render({canvasContext: context, viewport, transform: outputScale === 1 ? undefined : [outputScale, 0, 0, outputScale, 0, 0]});
      taskRef.current = task;
      void task.promise.catch((error: unknown) => { if (!(error instanceof Error) || error.name !== "RenderingCancelledException") console.error(error); });
    });
    return () => { disposed = true; taskRef.current?.cancel(); };
  }, [pdf, pageNumber, scale, shouldRender]);

  return <div className="pdf-page" ref={setWrap} style={{aspectRatio: `1 / ${ratio}`}} data-page={pageNumber}>{shouldRender ? <canvas ref={canvasRef} /> : null}<span>{toFa(pageNumber)}</span></div>;
}

function PdfMessage({title, detail}: {title: string; detail: string}) { return <div className="pdf-message"><strong>{title}</strong><span>{detail}</span></div>; }
const FA = "۰۱۲۳۴۵۶۷۸۹";
function toFa(value: number | string) { return String(value).replace(/\d/g, (digit) => FA[Number(digit)]); }
