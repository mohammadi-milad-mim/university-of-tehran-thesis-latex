import {MergeView} from "@codemirror/merge";
import {EditorState} from "@codemirror/state";
import {basicSetup} from "codemirror";
import {baseEditorExtensions} from "../editor/extensions";
import {useEffect, useRef} from "react";
import {AlertTriangle, X} from "lucide-react";

import type {FileBuffer} from "../types";

type Props = {
  buffer: FileBuffer;
  onCancel: () => void;
  onReloadDisk: () => void;
  onKeepMine: () => void;
  onMerge: (content: string) => void;
};

export function ConflictDialog({buffer, onCancel, onReloadDisk, onKeepMine, onMerge}: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const mergeRef = useRef<MergeView | null>(null);
  useEffect(() => {
    if (!hostRef.current) return;
    const merge = new MergeView({
      parent: hostRef.current,
      a: {doc: buffer.content, extensions: [basicSetup, baseEditorExtensions()]},
      b: {doc: buffer.serverContent ?? "", extensions: [basicSetup, baseEditorExtensions(), EditorState.readOnly.of(true)]},
      orientation: "a-b",
      highlightChanges: true,
      gutter: true,
    });
    mergeRef.current = merge;
    return () => { merge.destroy(); mergeRef.current = null; };
  }, [buffer.content, buffer.serverContent]);
  return (
    <div className="dialog-backdrop" role="presentation">
      <section className="conflict-dialog" role="dialog" aria-modal="true" aria-labelledby="conflict-title">
        <header><div><AlertTriangle size={19} /><div><strong id="conflict-title">این فایل بیرون از ویرایشگر تغییر کرده است</strong><span>سمت چپ نسخهٔ شما و سمت راست نسخهٔ فعلی دیسک است. هیچ نسخه‌ای خودکار حذف نمی‌شود.</span></div></div><button onClick={onCancel} aria-label="بستن"><X size={19} /></button></header>
        <div className="merge-labels"><span>نسخهٔ شما — قابل ویرایش</span><span>نسخهٔ دیسک — فقط خواندنی</span></div>
        <div className="merge-host" ref={hostRef} />
        <footer><button onClick={onReloadDisk}>بارگذاری نسخهٔ دیسک</button><button onClick={onKeepMine}>نگه‌داشتن نسخهٔ من</button><button className="primary" onClick={() => onMerge(mergeRef.current?.a.state.doc.toString() ?? buffer.content)}>پذیرش ادغام و ادامه</button></footer>
      </section>
    </div>
  );
}
