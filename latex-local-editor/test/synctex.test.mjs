import test from "node:test";
import assert from "node:assert/strict";

import {parseSynctexView} from "../server/synctex.mjs";
import {parseDiagnostics} from "../server/buildRunner.mjs";

test("SyncTeX view output maps a source cursor to a PDF page", () => {
  const output = "SyncTeX result begin\nOutput:main.pdf\nPage:17\nx:82.4\ny:123.2\nh:12\nv:456.7\nSyncTeX result end\n";
  assert.deepEqual(parseSynctexView(output), {page: 17, x: 82.4, y: 123.2, h: 12, v: 456.7});
  assert.equal(parseSynctexView("SyncTeX ERROR"), null);
});

test("build diagnostics expose author locations and missing packages", () => {
  const diagnostics = parseDiagnostics([
    "./chapters/02-method.tex:41: Undefined control sequence.",
    "! LaTeX Error: File `multirow.sty' not found.",
  ]);
  assert.deepEqual(diagnostics[0], {path: "chapters/02-method.tex", line: 41, message: "Undefined control sequence."});
  assert.match(diagnostics[1].message, /multirow\.sty/);
});
