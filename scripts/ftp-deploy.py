import os
import sys
import ftplib
from pathlib import Path

def upload_dir(ftp, local_dir, remote_dir):
    print(f"Sincronizando diretório: {local_dir} -> {remote_dir}")
    try:
        ftp.cwd(remote_dir)
    except ftplib.error_perm:
        try:
            ftp.mkd(remote_dir)
            ftp.cwd(remote_dir)
        except Exception as e:
            print(f"Erro ao criar/acessar {remote_dir}: {e}")

    for item in os.listdir(local_dir):
        local_path = os.path.join(local_dir, item)
        if os.path.isfile(local_path):
            print(f"  Enviando arquivo: {item} ...", end=" ", flush=True)
            with open(local_path, "rb") as f:
                ftp.storbinary(f"STOR {item}", f)
            print("OK")
        elif os.path.isdir(local_path):
            upload_dir(ftp, local_path, f"{remote_dir}/{item}")
            ftp.cwd(remote_dir)

def main():
    if len(sys.argv) < 2 and not os.environ.get("FTP_PASSWORD"):
        print("Uso: python3 scripts/ftp-deploy.py <SENHA_FTP>")
        sys.exit(1)

    password = sys.argv[1] if len(sys.argv) >= 2 else os.environ.get("FTP_PASSWORD")
    host = os.environ.get("FTP_HOST", "82.25.73.226")
    user = os.environ.get("FTP_USER", "u895085077.esc.riossistem.com.br")
    port = int(os.environ.get("FTP_PORT", 21))
    target_dir = os.environ.get("FTP_TARGET_DIR", "public_html")

    dist_dir = os.path.join(os.getcwd(), "dist")
    if not os.path.isdir(dist_dir):
        print("Erro: pasta dist/ não encontrada. Execute npm run build primeiro.")
        sys.exit(1)

    print(f"Conectando via FTP a {host}:{port} com usuário {user}...")
    ftp = ftplib.FTP()
    ftp.connect(host, port, timeout=30)
    ftp.login(user, password)
    ftp.set_pasv(True)
    print("Conexão e autenticação FTP estabelecidas com sucesso!")

    # Verifica lista inicial de arquivos no destino
    print(f"Navegando para pasta: {target_dir}")
    try:
        ftp.cwd(target_dir)
    except Exception as e:
        print(f"Tentando acessar/criar {target_dir}: {e}")

    print("Iniciando envio dos arquivos atualizados...")
    upload_dir(ftp, dist_dir, target_dir)

    ftp.quit()
    print("Deploy via FTP concluído com sucesso!")

if __name__ == "__main__":
    main()
