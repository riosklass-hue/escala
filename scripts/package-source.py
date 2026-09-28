import os
import zipfile
from pathlib import Path

root = Path.cwd().resolve()
private = root / 'private' / 'packages'
private.mkdir(parents=True, exist_ok=True)
output = private / 'rios_codigo_fonte.zip'
temporary = private / 'rios_codigo_fonte.tmp'
files = ['index.html', 'package.json', 'package-lock.json', 'bun.lock', 'tsconfig.json', 'vite.config.ts', 'server.ts', 'HOSTINGER_DEPLOY.md', 'metadata.json', '.env.example', 'firestore.rules', 'firebase-applet-config.json', 'firebase-blueprint.json', 'firebase.json']
directories = ['src', 'public', 'scripts', 'tests']

def allowed(path):
    if not path.is_file() or path.is_symlink():
        return False
    relative = path.relative_to(root)
    lower = path.name.lower()
    if any(part in ['node_modules', '.git', 'private', 'dist'] for part in relative.parts):
        return False
    if lower.startswith('.env') and lower != '.env.example':
        return False
    if path.suffix.lower() in ['.zip', '.map', '.pem', '.key', '.p12', '.pfx', '.log']:
        return False
    if any(term in lower for term in ['service-account', 'serviceaccount', 'credential', 'secret']):
        return False
    if path.suffix.lower() in ['.json', '.ts', '.tsx', '.js', '.env', '.txt']:
        content = path.read_text(encoding='utf-8', errors='ignore')
        if '-----BEGIN PRIVATE KEY-----' in content or '-----BEGIN RSA PRIVATE KEY-----' in content or '"type": "service_account"' in content:
            raise RuntimeError('Credencial privada encontrada; empacotamento interrompido: ' + relative.as_posix())
    return True

candidates = [root / name for name in files]
for name in directories:
    folder = root / name
    if folder.exists():
        candidates.extend(folder.rglob('*'))
with zipfile.ZipFile(temporary, 'w', zipfile.ZIP_DEFLATED) as archive:
    for path in sorted(set(candidates)):
        if allowed(path):
            archive.write(path, path.relative_to(root).as_posix())
os.replace(temporary, output)
print('[Source Packager] Código-fonte gerado em diretório privado.')
