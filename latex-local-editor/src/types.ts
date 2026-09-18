export type EditorMode = "visual" | "source";
export type SaveState = "clean" | "dirty" | "saving" | "conflict" | "error";

export type OutlineItem = {
  id: string;
  kind: "chapter" | "section" | "subsection" | "subsubsection";
  level: number;
  title: string;
  line: number;
  from: number;
  to: number;
};

export type ThesisFile = {
  path: string;
  fileName: string;
  title: string;
  group: string;
  visual: boolean;
  outline: OutlineItem[];
};

export type ThesisGroup = {id: string; title: string; files: ThesisFile[]};
export type ThesisResources = {citations: string[]; glossary: string[]; labels: string[]};
export type ThesisIndex = {generatedAt: string; groups: ThesisGroup[]; resources: ThesisResources; fileCount: number};

export type FileBuffer = {
  path: string;
  content: string;
  savedContent: string;
  diskHash: string;
  visual: boolean;
  saveState: SaveState;
  serverContent?: string;
  serverHash?: string;
  error?: string;
};

export type BuildDiagnostic = {path: string | null; line: number | null; message: string};
export type PreviewStatus = {
  phase: "idle" | "running" | "succeeded" | "failed";
  revision: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  log: string[];
  diagnostics: BuildDiagnostic[];
  error?: string;
};

export type Health = {
  ok: boolean;
  workspace: string;
  sourcePdf: {available: boolean; modifiedAt?: string; size?: number};
  preview: {revision: string; finishedAt: string} | null;
  toolchain: {
    latexmk: boolean;
    xelatex: boolean;
    biber: boolean;
    synctex: boolean;
    missingPackages: string[];
    exactPreviewReady: boolean;
  };
};
