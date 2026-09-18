PYTHON ?= python3
.PHONY: pdf doctor verify clean poster
pdf: doctor
	latexmk -r latexmkrc main.tex
	mkdir -p output
	cp .build/main.pdf output/thesis.pdf
doctor:
	$(PYTHON) tools/doctor.py
verify: pdf
	$(PYTHON) tools/verify.py
poster:
	latexmk -r ../defense-poster-template/latexmkrc ../defense-poster-template/defense-announcement.tex
	mkdir -p ../defense-poster-template/output
	cp .build/defense-announcement.pdf ../defense-poster-template/output/defense-announcement.pdf
clean:
	latexmk -r latexmkrc -C main.tex
	latexmk -r ../defense-poster-template/latexmkrc -C ../defense-poster-template/defense-announcement.tex
