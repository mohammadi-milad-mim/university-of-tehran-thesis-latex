import {autocompletion, type CompletionContext, type CompletionResult} from "@codemirror/autocomplete";
import {StreamLanguage, syntaxHighlighting, HighlightStyle} from "@codemirror/language";
import {EditorState, RangeSetBuilder, StateField} from "@codemirror/state";
import {Decoration, Direction, EditorView, ViewPlugin, WidgetType, type DecorationSet, type ViewUpdate} from "@codemirror/view";
import {stex} from "@codemirror/legacy-modes/mode/stex";
import {tags} from "@lezer/highlight";

import {findHeadings, findInlineCommands, findProtectedEnvironments, firstStrongDirection} from "../../shared/latexParser.mjs";
import type {ThesisResources} from "../types";

const sourceHighlight = HighlightStyle.define([
  {tag: tags.keyword, color: "#226c64", fontWeight: "650"},
  {tag: tags.name, color: "#3c6074"},
  {tag: tags.string, color: "#8a5a35"},
  {tag: tags.comment, color: "#8a918b", fontStyle: "italic"},
  {tag: tags.bracket, color: "#83847f"},
  {tag: tags.meta, color: "#745f8d"},
]);

const editorTheme = EditorView.theme({
  "&": {height: "100%", backgroundColor: "transparent", color: "#30332f"},
  ".cm-scroller": {fontFamily: '"IRNazanin", "SFMono-Regular", Consolas, monospace', lineHeight: "1.92", overflow: "auto"},
  ".cm-content": {padding: "54px 64px 120px", fontSize: "18px", minHeight: "100%", caretColor: "#236b62"},
  ".cm-line": {unicodeBidi: "isolate", textAlign: "start", padding: "0 2px"},
  ".cm-gutters": {backgroundColor: "#f7f4ed", color: "#a09c93", border: "0", borderLeft: "1px solid #e0dbd0"},
  ".cm-activeLineGutter": {backgroundColor: "#e9eee9", color: "#236b62"},
  ".cm-activeLine": {backgroundColor: "rgba(35,107,98,.045)"},
  ".cm-selectionBackground, &.cm-focused .cm-selectionBackground, ::selection": {backgroundColor: "#cde0da !important"},
  ".cm-cursor, .cm-dropCursor": {borderLeftColor: "#236b62", borderLeftWidth: "2px"},
  ".cm-searchMatch": {backgroundColor: "#f6ddb1"},
  ".cm-panels": {backgroundColor: "#f5f2eb", color: "#30332f"},
  ".cm-tooltip": {border: "1px solid #d4cec2", backgroundColor: "#fffdf8", boxShadow: "0 8px 24px rgba(40,35,28,.12)"},
  ".cm-tooltip-autocomplete > ul > li[aria-selected]": {backgroundColor: "#236b62", color: "white"},
});

const visualTheme = EditorView.theme({
  "&": {backgroundColor: "#fffdf8"},
  ".cm-scroller": {fontFamily: '"IRNazanin", Tahoma, sans-serif', lineHeight: "2.05"},
  ".cm-content": {width: "min(760px, calc(100% - 44px))", minHeight: "940px", margin: "28px auto 80px", padding: "58px 72px 120px", backgroundColor: "#fffdf8", boxShadow: "0 4px 20px rgba(65,57,44,.12)", fontSize: "18px"},
  ".cm-gutters": {display: "none"},
  ".cm-activeLine": {backgroundColor: "rgba(35,107,98,.035)"},
  ".cm-visual-chapter": {fontSize: "28px", lineHeight: "1.7", fontWeight: "700", textAlign: "center", color: "#29312e", marginTop: "20px", marginBottom: "28px"},
  ".cm-visual-section": {fontSize: "21px", lineHeight: "1.8", fontWeight: "700", color: "#2b4843", marginTop: "22px", marginBottom: "6px"},
  ".cm-visual-subsection": {fontSize: "19px", lineHeight: "1.8", fontWeight: "700", color: "#36524d", marginTop: "16px"},
  ".cm-visual-subsubsection": {fontSize: "18px", lineHeight: "1.8", fontWeight: "700", color: "#435955", marginTop: "12px"},
  ".cm-visual-bold": {fontWeight: "700"},
  ".cm-visual-emphasis": {fontStyle: "italic"},
  ".cm-visual-ltr": {direction: "ltr", unicodeBidi: "isolate", fontFamily: '"TeX Gyre Termes", "Liberation Serif", serif'},
  ".cm-visual-chip": {display: "inline-flex", alignItems: "center", direction: "ltr", unicodeBidi: "isolate", padding: "1px 7px", margin: "0 2px", borderRadius: "999px", backgroundColor: "#e8f0f2", color: "#356173", border: "1px solid #d2e2e7", fontFamily: '"SFMono-Regular", monospace', fontSize: "11px", lineHeight: "1.7", cursor: "pointer", verticalAlign: "middle"},
  ".cm-protected-card": {direction: "rtl", margin: "14px 0", padding: "13px 15px", display: "flex", alignItems: "center", gap: "10px", border: "1px solid #d6d0c4", borderRadius: "9px", backgroundColor: "#f6f3ec", color: "#4f5651", cursor: "pointer"},
  ".cm-protected-card strong": {color: "#2e4c47", fontSize: "13px"},
  ".cm-protected-card small": {marginRight: "auto", color: "#8b8e88", fontFamily: '"SFMono-Regular", monospace', direction: "ltr"},
  ".cm-visual-bullet": {display: "inline-block", width: "18px", color: "#236b62", fontWeight: "700"},
  ".cm-visual-markup-line": {color: "#65716c"},
  "@media (max-width: 700px)": {".cm-content": {width: "calc(100% - 20px)", margin: "10px auto 40px", padding: "34px 25px 90px"}},
});

export function baseEditorExtensions() {
  return [
    StreamLanguage.define(stex),
    syntaxHighlighting(sourceHighlight),
    editorTheme,
    EditorView.lineWrapping,
    EditorView.perLineTextDirection.of(true),
    lineDirectionPlugin,
    ltrIsolationPlugin,
    EditorView.bidiIsolatedRanges.of((view) => view.plugin(ltrIsolationPlugin)?.decorations ?? Decoration.none),
  ];
}

export function sourceModeExtensions(resources: ThesisResources) {
  return [resourceAutocomplete(resources)];
}

export function visualModeExtensions(resources: ThesisResources) {
  return [visualTheme, visualDecorations, resourceAutocomplete(resources)];
}

const lineDirectionPlugin = ViewPlugin.fromClass(class {
  decorations: DecorationSet;
  constructor(view: EditorView) { this.decorations = lineDirections(view); }
  update(update: ViewUpdate) { if (update.docChanged || update.viewportChanged) this.decorations = lineDirections(update.view); }
}, {decorations: (plugin) => plugin.decorations});

function lineDirections(view: EditorView) {
  const builder = new RangeSetBuilder<Decoration>();
  for (const range of view.visibleRanges) {
    let position = range.from;
    while (position <= range.to) {
      const line = view.state.doc.lineAt(position);
      builder.add(line.from, line.from, Decoration.line({attributes: {dir: firstStrongDirection(line.text)}}));
      if (line.to >= range.to || line.number === view.state.doc.lines) break;
      position = line.to + 1;
    }
  }
  return builder.finish();
}

const ltrIsolationPlugin = ViewPlugin.fromClass(class {
  decorations: DecorationSet;
  constructor(view: EditorView) { this.decorations = ltrTokenDecorations(view); }
  update(update: ViewUpdate) { if (update.docChanged || update.viewportChanged) this.decorations = ltrTokenDecorations(update.view); }
}, {decorations: (plugin) => plugin.decorations});

function ltrTokenDecorations(view: EditorView) {
  const builder = new RangeSetBuilder<Decoration>();
  const pattern = /\\(?:cite|ref|label|gls|lr)\{[^}\n]+\}|\$[^$\n]+\$|\\[A-Za-z@]+\*?/g;
  const text = view.state.doc.toString();
  const ranges: Array<{from: number; to: number}> = [];
  let match;
  while ((match = pattern.exec(text))) ranges.push({from: match.index, to: match.index + match[0].length});
  for (const range of ranges) builder.add(range.from, range.to, Decoration.mark({attributes: {dir: "ltr"}, bidiIsolate: Direction.LTR}));
  return builder.finish();
}

const visualDecorations = StateField.define<DecorationSet>({
  create(state) { return buildVisualDecorations(state); },
  update(decorations, transaction) {
    return transaction.docChanged || transaction.selection ? buildVisualDecorations(transaction.state) : decorations;
  },
  provide: (field) => EditorView.decorations.from(field),
});

function buildVisualDecorations(state: EditorState) {
  const doc = state.doc;
  const text = doc.toString();
  const activeLine = doc.lineAt(state.selection.main.head);
  const protectedRanges = findProtectedEnvironments(text);
  const decorations: Array<{from: number; to: number; decoration: Decoration}> = [];
  const covered = (from: number, to: number) => protectedRanges.some((range) => range.from <= from && range.to >= to);

  for (const range of protectedRanges) {
    const from = doc.lineAt(range.from).from;
    const to = doc.lineAt(Math.max(range.from, range.to - 1)).to;
    decorations.push({from, to, decoration: Decoration.replace({block: true, widget: new ProtectedWidget(range.environment, range.title, range.label, range.from, range.to)})});
  }

  for (const heading of findHeadings(text)) {
    if (covered(heading.from, heading.to)) continue;
    const line = doc.lineAt(heading.from);
    decorations.push({from: line.from, to: line.from, decoration: Decoration.line({class: `cm-visual-${heading.command}`})});
    if (line.number === activeLine.number) continue;
    decorations.push({from: heading.from, to: heading.contentFrom, decoration: Decoration.replace({})});
    decorations.push({from: heading.contentTo, to: heading.to, decoration: Decoration.replace({})});
  }

  for (const command of findInlineCommands(text)) {
    if (covered(command.from, command.to)) continue;
    const line = doc.lineAt(command.from);
    if (line.number === activeLine.number) continue;
    if (["cite", "ref", "gls"].includes(command.command)) {
      decorations.push({from: command.from, to: command.to, decoration: Decoration.replace({widget: new ChipWidget(command.command, command.value, command.from)})});
      continue;
    }
    decorations.push({from: command.from, to: command.contentFrom, decoration: Decoration.replace({})});
    decorations.push({from: command.contentTo, to: command.to, decoration: Decoration.replace({})});
    const className = command.command === "textbf" ? "cm-visual-bold" : command.command === "emph" ? "cm-visual-emphasis" : command.command === "lr" ? "cm-visual-ltr" : "";
    if (className) decorations.push({from: command.contentFrom, to: command.contentTo, decoration: Decoration.mark({class: className})});
  }

  const itemPattern = /\\item(?:\s+|$)/gm;
  let item;
  while ((item = itemPattern.exec(text))) {
    if (covered(item.index, itemPattern.lastIndex) || doc.lineAt(item.index).number === activeLine.number) continue;
    decorations.push({from: item.index, to: itemPattern.lastIndex, decoration: Decoration.replace({widget: new BulletWidget()})});
  }

  decorations.sort((a, b) => a.from - b.from || a.to - b.to || a.decoration.startSide - b.decoration.startSide);
  const builder = new RangeSetBuilder<Decoration>();
  let lastProtectedEnd = -1;
  for (const item of decorations) {
    if (item.from < lastProtectedEnd) continue;
    builder.add(item.from, item.to, item.decoration);
    if (item.decoration.spec.block) lastProtectedEnd = item.to;
  }
  return builder.finish();
}

class ChipWidget extends WidgetType {
  constructor(readonly command: string, readonly value: string, readonly from: number) { super(); }
  eq(other: ChipWidget) { return other.command === this.command && other.value === this.value && other.from === this.from; }
  toDOM(view: EditorView) {
    const element = document.createElement("span");
    const labels: Record<string, string> = {cite: "منبع", ref: "ارجاع", gls: "واژه"};
    element.className = "cm-visual-chip";
    element.textContent = `${labels[this.command]} · ${this.value}`;
    element.title = "برای ویرایش کلیک کنید";
    element.addEventListener("mousedown", (event) => {
      event.preventDefault();
      view.dispatch({selection: {anchor: this.from + 1}, scrollIntoView: true});
      view.focus();
    });
    return element;
  }
}

class ProtectedWidget extends WidgetType {
  constructor(readonly environment: string, readonly title: string, readonly label: string | null, readonly from: number, readonly to: number) { super(); }
  eq(other: ProtectedWidget) { return other.from === this.from && other.to === this.to && other.title === this.title; }
  toDOM(view: EditorView) {
    const element = document.createElement("button");
    element.type = "button";
    element.className = "cm-protected-card";
    element.innerHTML = `<span aria-hidden="true">◇</span><strong>${escapeHtml(this.title)}</strong><span>برای ویرایش، کد لاتک را باز کنید</span><small>${escapeHtml(this.environment)}</small>`;
    element.addEventListener("click", () => view.dom.dispatchEvent(new CustomEvent("open-protected-source", {bubbles: true, detail: {from: this.from, to: this.to}})));
    return element;
  }
  ignoreEvent() { return false; }
}

class BulletWidget extends WidgetType {
  toDOM() { const span = document.createElement("span"); span.className = "cm-visual-bullet"; span.textContent = "•"; return span; }
}

function resourceAutocomplete(resources: ThesisResources) {
  return autocompletion({override: [(context) => completionSource(context, resources)], activateOnTyping: true});
}

function completionSource(context: CompletionContext, resources: ThesisResources): CompletionResult | null {
  const macro = context.matchBefore(/\\(cite|ref|gls)\{[A-Za-z0-9_.:-]*$/);
  if (macro) {
    const command = macro.text.match(/^\\(cite|ref|gls)/)?.[1] as "cite" | "ref" | "gls";
    const values = command === "cite" ? resources.citations : command === "ref" ? resources.labels : resources.glossary;
    const from = macro.from + macro.text.lastIndexOf("{") + 1;
    return {from, options: values.map((value) => ({label: value, type: command === "cite" ? "reference" : "variable", detail: command === "cite" ? "منبع" : command === "ref" ? "برچسب" : "واژه‌نامه"}))};
  }
  const command = context.matchBefore(/\\[A-Za-z@]*$/);
  if (!command || (!context.explicit && command.text.length < 2)) return null;
  return {from: command.from, options: ["chapter", "section", "subsection", "subsubsection", "textbf", "emph", "lr", "cite", "ref", "gls", "begin", "end", "label", "includegraphics"].map((label) => ({label: `\\${label}`, type: "keyword"}))};
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"})[character]!);
}
