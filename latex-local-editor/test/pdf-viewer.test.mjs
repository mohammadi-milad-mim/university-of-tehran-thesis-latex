import test from "node:test";
import assert from "node:assert/strict";

import {exactPdfDocumentOptions, shouldRenderPdfPage} from "../shared/pdfViewer.mjs";

test("PDF.js draws embedded XeLaTeX Persian glyphs without browser reshaping", () => {
  assert.deepEqual(exactPdfDocumentOptions("/api/pdf?revision=test"), {
    url: "/api/pdf?revision=test",
    disableFontFace: true,
    useSystemFonts: false,
  });
});

test("continuous PDF view renders only the current page and its neighbors", () => {
  assert.equal(shouldRenderPdfPage(8, 10), true);
  assert.equal(shouldRenderPdfPage(10, 10), true);
  assert.equal(shouldRenderPdfPage(12, 10), true);
  assert.equal(shouldRenderPdfPage(13, 10), false);
});
