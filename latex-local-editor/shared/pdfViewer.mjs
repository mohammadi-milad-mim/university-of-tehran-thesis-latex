export function exactPdfDocumentOptions(url) {
  return Object.freeze({url, disableFontFace: true, useSystemFonts: false});
}

export function shouldRenderPdfPage(pageNumber, currentPage, overscan = 2) {
  return Math.abs(pageNumber - currentPage) <= overscan;
}
