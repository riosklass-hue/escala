import os
import shutil
import zipfile
from pathlib import Path

project = Path.cwd().resolve()
dist = project / 'dist'
private = project / 'private' / 'packages'
private.mkdir(parents=True, exist_ok=True)
if not (dist / 'index.html').is_file():
    raise RuntimeError('Execute o build da interface antes de empacotar.')
# Retira artefatos antigos das pastas servidas, preservando cópia privada.
for folder in [project / 'public', dist]:
    if folder.exists():
        for old in folder.rglob('*.zip'):
            if old.is_symlink():
                raise RuntimeError('Pacote simbólico inesperado: ' + str(old))
            backup = private / 'legacy' / folder.name / old.relative_to(folder)
            backup.parent.mkdir(parents=True, exist_ok=True)
            shutil.move(str(old), str(backup))
output = private / 'hostinger_public_html.zip'
temporary = private / 'hostinger_public_html.tmp'
with zipfile.ZipFile(temporary, 'w', zipfile.ZIP_DEFLATED) as archive:
    for source in sorted(dist.rglob('*')):
        if not source.is_file() or source.is_symlink():
            continue
        relative = source.relative_to(dist)
        lower = source.name.lower()
        if lower.startswith('.env') or lower.startswith('server.') or source.suffix.lower() in ['.zip', '.map', '.pem', '.key', '.p12', '.pfx']:
            continue
        if any(part.startswith('.') and part != '.htaccess' for part in relative.parts):
            continue
        archive.write(source, relative.as_posix())
os.replace(temporary, output)
print('[Hostinger Packager] Pacote privado gerado:', output.name)
