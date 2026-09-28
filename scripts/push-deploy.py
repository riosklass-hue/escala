import os
import shutil
import subprocess
from pathlib import Path

def run(cmd, cwd=None):
    print(f"Executando: {cmd}")
    res = subprocess.run(cmd, shell=True, cwd=cwd, capture_output=True, text=True)
    if res.stdout:
        print(res.stdout)
    if res.stderr:
        print(res.stderr)
    if res.returncode != 0:
        raise RuntimeError(f"Comando falhou com código {res.returncode}: {cmd}")

def main():
    root = Path.cwd()
    dist = root / "dist"
    worktree_dir = Path("/tmp/deploy_worktree")
    
    if worktree_dir.exists():
        run(f"git worktree remove -f {worktree_dir} || rm -rf {worktree_dir}")
        
    print("Criando worktree para o branch deploy...")
    run(f"git worktree add -B deploy {worktree_dir} origin/deploy")
    
    print("Limpando arquivos antigos do worktree...")
    for item in worktree_dir.iterdir():
        if item.name == ".git":
            continue
        if item.is_dir():
            shutil.rmtree(item)
        else:
            item.unlink()
            
    print("Copiando arquivos compilados de dist/ para o worktree...")
    for item in dist.iterdir():
        dest = worktree_dir / item.name
        if item.is_dir():
            shutil.copytree(item, dest)
        else:
            shutil.copy2(item, dest)
            
    # Garante cópia do .htaccess se presente em dist ou public
    htaccess_dist = dist / ".htaccess"
    if htaccess_dist.is_file():
        shutil.copy2(htaccess_dist, worktree_dir / ".htaccess")
        
    print("Comitando e enviando branch deploy para o GitHub...")
    run("git add -A", cwd=str(worktree_dir))
    run('git commit -m "deploy: build atualizado com suporte a persistencia no servidor Hostinger (API PHP e JSON seguro)"', cwd=str(worktree_dir))
    run("git push origin deploy", cwd=str(worktree_dir))
    
    print("Removendo worktree temporário...")
    run(f"git worktree remove -f {worktree_dir}")
    print("Branch deploy atualizado com sucesso no GitHub!")

if __name__ == "__main__":
    main()
