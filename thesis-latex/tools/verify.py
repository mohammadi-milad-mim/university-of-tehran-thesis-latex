"""Structural QA for the distributed sample; run after make pdf."""
from pathlib import Path
import re, subprocess
root = Path(__file__).resolve().parents[1]
log = (root / '.build/main.log').read_text()
assert not re.search(r'(?:undefined references|Citation .* undefined|Reference .* undefined|Overfull \\hbox|Missing character:)', log), 'Unresolved references, overflow, or missing glyphs'
lof = (root / '.build/main.lof').read_text()
assert 'مراحل نمونه' in lof and 'این توضیح بلند' not in lof
assert 'مقایسه ساختگی' in lof and 'نباید نتیجه' not in lof
registry = (root / 'glossary/preliminary-acronyms.tex').read_text()
assert 'en-dataset' in registry and 'acr-user-interface' in registry
assert 'unused-term' not in registry and '\\glsadd{dataset}' not in registry
bbl = (root / '.build/main.bbl').read_text()
assert 'lamport1994' in bbl and 'knuth1984' in bbl
pdf = root / 'output/thesis.pdf'
info = subprocess.check_output(['pdfinfo', str(pdf)], text=True)
assert 'Student Name' in info and 'A Sample Thesis Title' in info
assert re.search(r'Pages:\s+([2-9]\d|[1-9]\d{2,})', info)
fonts = subprocess.check_output(['pdffonts', str(pdf)], text=True)
assert 'IRNazanin' in fonts and 'TeXGyreTermes' in fonts
assert all('yes' in line for line in fonts.splitlines()[2:] if line.strip()), 'Fonts must be embedded'
assert (root / '.build/main.synctex.gz').exists()
print('PASS: sample metadata, bibliography, used terminology, short captions, fonts, references, SyncTeX.')
