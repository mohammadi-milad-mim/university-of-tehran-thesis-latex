import shutil, subprocess, sys
required = ['xelatex','latexmk','biber','synctex','python3']
missing = [tool for tool in required if not shutil.which(tool)]
for package in ['xepersian.sty','ieee.bbx','glossaries.sty','multirow.sty']:
    if shutil.which('kpsewhich') and not subprocess.run(['kpsewhich',package],capture_output=True).stdout.strip(): missing.append(package)
if missing: sys.exit('Missing dependencies: ' + ', '.join(missing))
print('Thesis toolchain available.')
