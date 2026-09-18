# Dependencies

Native: Python 3.10+, GNU Make (or invoke latexmk directly), XeLaTeX, latexmk, Biber, SyncTeX, and Poppler (`pdfinfo`, `pdffonts`, `pdftotext`, `pdftoppm`). Fonts are bundled and loaded by relative path.

TeX packages: xepersian, bidi, fontspec, biblatex, biblatex-ieee, glossaries, datatool, amsmath, amssymb, amsthm, geometry, graphicx, float, xcolor, array, longtable, tabularx, booktabs, multirow, calc, etoolbox, pdflscape, multicol, enumitem, rotating, tikz, fancyhdr, setspace, caption, titlesec, hyperref, xurl.

On Debian/Ubuntu install `texlive-xetex texlive-lang-arabic texlive-latex-extra texlive-bibtex-extra texlive-fonts-recommended biber latexmk python3 poppler-utils make`. Keep Biber and BibLaTeX from the same TeX distribution. Docker supplies the complete pinned environment.

Run `make doctor` to check the essential binaries/packages, then `make verify` for the actual sample build. A successful doctor check alone does not validate every TeX package.
