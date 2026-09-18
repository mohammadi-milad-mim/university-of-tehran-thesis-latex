import {forwardRef, useEffect, useImperativeHandle, useRef} from "react";
import {basicSetup} from "codemirror";
import {Compartment, EditorSelection, EditorState, Transaction} from "@codemirror/state";
import {EditorView, keymap} from "@codemirror/view";
import {indentWithTab, isolateHistory} from "@codemirror/commands";
import {openSearchPanel} from "@codemirror/search";

import {baseEditorExtensions, sourceModeExtensions, visualModeExtensions} from "./extensions";
import type {EditorMode, FileBuffer, ThesisResources} from "../types";
import {makeItemize, setLatexBlock, wrapLatexCommand} from "../../shared/sourceTransforms.mjs";

export type CursorPosition = {line: number; column: number};
export type EditorHandle = {
  wrapSelection: (command: string) => void;
  insertMacro: (command: "cite" | "ref" | "gls" | "lr") => void;
  setBlock: (command: "section" | "subsection" | "subsubsection") => void;
  toggleList: () => void;
  jumpToLine: (line: number) => void;
  selectRange: (from: number, to: number) => void;
  focus: () => void;
  search: () => void;
};

type Props = {
  buffer: FileBuffer | null;
  mode: EditorMode;
  resources: ThesisResources;
  onChange: (content: string) => void;
  onSave: () => void;
  onRefreshPdf: () => void;
  onCursor: (position: CursorPosition) => void;
  onProtectedRange: (from: number, to: number) => void;
};

const modeCompartment = new Compartment();

export const EditorPane = forwardRef<EditorHandle, Props>(function EditorPane({buffer, mode, resources, onChange, onSave, onRefreshPdf, onCursor, onProtectedRange}, ref) {
  const hostRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const pathRef = useRef<string | null>(null);
  const stateByPath = useRef(new Map<string, EditorState>());
  const callbacks = useRef({onChange, onSave, onRefreshPdf, onCursor, onProtectedRange});
  callbacks.current = {onChange, onSave, onRefreshPdf, onCursor, onProtectedRange};

  function modeExtensions(nextMode: EditorMode) {
    return nextMode === "visual" ? visualModeExtensions(resources) : sourceModeExtensions(resources);
  }

  useEffect(() => {
    if (!hostRef.current) return;
    const view = new EditorView({
      parent: hostRef.current,
      state: EditorState.create({
        doc: "",
        extensions: [
          basicSetup,
          baseEditorExtensions(),
          modeCompartment.of(modeExtensions(mode)),
          keymap.of([indentWithTab]),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) callbacks.current.onChange(update.state.doc.toString());
            if (update.selectionSet || update.docChanged) {
              const head = update.state.selection.main.head;
              const line = update.state.doc.lineAt(head);
              callbacks.current.onCursor({line: line.number, column: head - line.from + 1});
            }
          }),
          EditorView.domEventHandlers({
            keydown(event) {
              if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") { event.preventDefault(); callbacks.current.onSave(); return true; }
              if ((event.metaKey || event.ctrlKey) && event.key === "Enter") { event.preventDefault(); callbacks.current.onRefreshPdf(); return true; }
              return false;
            },
          }),
        ],
      }),
    });
    const protectedHandler = (event: Event) => {
      const detail = (event as CustomEvent<{from: number; to: number}>).detail;
      callbacks.current.onProtectedRange(detail.from, detail.to);
    };
    view.dom.addEventListener("open-protected-source", protectedHandler);
    viewRef.current = view;
    return () => { view.dom.removeEventListener("open-protected-source", protectedHandler); view.destroy(); viewRef.current = null; };
    // The editor view is intentionally mounted once; dynamic state is reconfigured below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    view.dispatch({effects: modeCompartment.reconfigure(modeExtensions(mode))});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, resources]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const previousPath = pathRef.current;
    if (previousPath) stateByPath.current.set(previousPath, view.state);
    if (buffer?.saveState === "clean") view.dispatch({annotations: isolateHistory.of("full")});
    if (!buffer) {
      pathRef.current = null;
      view.setState(createState("", modeExtensions(mode)));
      return;
    }
    if (previousPath !== buffer.path) {
      pathRef.current = buffer.path;
      const stored = stateByPath.current.get(buffer.path);
      if (stored && stored.doc.toString() === buffer.content) view.setState(stored);
      else view.setState(createState(buffer.content, modeExtensions(mode)));
      view.dispatch({effects: modeCompartment.reconfigure(modeExtensions(mode))});
      return;
    }
    if (view.state.doc.toString() !== buffer.content && buffer.saveState !== "dirty" && buffer.saveState !== "saving") {
      view.dispatch({changes: {from: 0, to: view.state.doc.length, insert: buffer.content}, annotations: Transaction.addToHistory.of(false)});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buffer?.path, buffer?.content, buffer?.saveState]);

  function createState(content: string, modeExtension: unknown) {
    return EditorState.create({
      doc: content,
      extensions: [
        basicSetup,
        baseEditorExtensions(),
        modeCompartment.of(modeExtension as never),
        keymap.of([indentWithTab]),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) callbacks.current.onChange(update.state.doc.toString());
          if (update.selectionSet || update.docChanged) {
            const head = update.state.selection.main.head;
            const line = update.state.doc.lineAt(head);
            callbacks.current.onCursor({line: line.number, column: head - line.from + 1});
          }
        }),
        EditorView.domEventHandlers({keydown(event) {
          if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") { event.preventDefault(); callbacks.current.onSave(); return true; }
          if ((event.metaKey || event.ctrlKey) && event.key === "Enter") { event.preventDefault(); callbacks.current.onRefreshPdf(); return true; }
          return false;
        }}),
      ],
    });
  }

  useImperativeHandle(ref, () => ({
    wrapSelection(command) {
      const view = viewRef.current; if (!view) return;
      const range = view.state.selection.main;
      const change = wrapLatexCommand(view.state.doc.toString(), range.from, range.to, command);
      view.dispatch({changes: {from: change.from, to: change.to, insert: change.insert}, selection: {anchor: change.cursor}, scrollIntoView: true}); view.focus();
    },
    insertMacro(command) {
      const view = viewRef.current; if (!view) return;
      const range = view.state.selection.main;
      const change = wrapLatexCommand(view.state.doc.toString(), range.from, range.to, command);
      view.dispatch({changes: {from: change.from, to: change.to, insert: change.insert}, selection: {anchor: change.cursor}, scrollIntoView: true}); view.focus();
    },
    setBlock(command) {
      const view = viewRef.current; if (!view) return;
      const change = setLatexBlock(view.state.doc.toString(), view.state.selection.main.head, command);
      view.dispatch({changes: {from: change.from, to: change.to, insert: change.insert}, selection: {anchor: change.cursor}, scrollIntoView: true}); view.focus();
    },
    toggleList() {
      const view = viewRef.current; if (!view) return;
      const range = view.state.selection.main;
      const change = makeItemize(view.state.doc.toString(), range.from, range.to);
      view.dispatch({changes: {from: change.from, to: change.to, insert: change.insert}, selection: {anchor: change.cursor}, scrollIntoView: true}); view.focus();
    },
    jumpToLine(lineNumber) {
      const view = viewRef.current; if (!view) return;
      const line = view.state.doc.line(Math.max(1, Math.min(view.state.doc.lines, lineNumber)));
      view.dispatch({selection: EditorSelection.cursor(line.from), effects: EditorView.scrollIntoView(line.from, {y: "start", yMargin: 36})}); view.focus();
    },
    selectRange(from, to) {
      const view = viewRef.current; if (!view) return;
      view.dispatch({selection: EditorSelection.range(Math.max(0, from), Math.min(view.state.doc.length, to)), effects: EditorView.scrollIntoView(from, {y: "center"})}); view.focus();
    },
    focus() { viewRef.current?.focus(); },
    search() { if (viewRef.current) openSearchPanel(viewRef.current); },
  }), []);

  return <div className={`editor-host ${mode === "visual" ? "visual" : "source"}`} ref={hostRef} aria-label={mode === "visual" ? "ویرایشگر نوشتاری پایان‌نامه" : "ویرایشگر کد لاتک"} />;
});
