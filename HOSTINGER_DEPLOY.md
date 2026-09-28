# Publicação do RIOS – Gestão de Escalas

## O que cada pacote entrega

O pacote estático contém somente a interface. Colocar seus arquivos em public_html não executa o servidor Node.js: a IA externa e os downloads autenticados dependem das rotas /api no servidor. Os dados protegidos dependem de Firebase Auth, Firestore e das regras publicadas; não existe login administrativo simulado nem contingência local para esses dados.

## Preparação e validação

1. Instale as dependências com npm install em ambiente Node.js compatível com as versões do package.json. O empacotamento também exige python3.
2. Execute npm run lint e npm run build. Só publique após ambos terminarem com sucesso.
3. Os pacotes são gerados em private/packages/hostinger_public_html.zip e private/packages/rios_codigo_fonte.zip. O pacote de código inclui os scripts e testes disponíveis, mas exclui segredos e arquivos de ambiente reais.
4. ZIPs antigos encontrados em public ou dist são movidos pelo empacotador para private/packages/legacy. Nunca publique private, credenciais, .env, mapas de código ou ZIPs antigos.

## Servidor completo

Use hospedagem que execute Node.js. Execute npm start depois do build e configure NODE_ENV=production, PORT e GEMINI_API_KEY no ambiente do servidor. Mantenha as dependências de produção instaladas. A interface e /api devem ser atendidas pela mesma origem ou por proxy devidamente configurado.

Firebase Admin usa Application Default Credentials no servidor, com acesso ao projeto e ao banco nomeado em firebase-applet-config.json. Configure credenciais apropriadas no provedor, fora da pasta pública. Nunca coloque chaves administrativas no código da interface. Sem autorização do servidor, as rotas protegidas retornam erro e não liberam acesso por contingência.

Downloads exigem usuário ativo com perfil ADMIN. A IA exige usuário ativo ADMIN, GESTOR ou COORDENADOR. O cliente envia o token Firebase no cabeçalho Authorization; tokens não devem ser colocados em URLs.

## Firebase e primeiro administrador

Ative os provedores de login usados pelo aplicativo, confira os domínios autorizados e publique firestore.rules no banco correto. Uma conta nova recebe perfil PROFESSOR inativo e aguarda aprovação.

O responsável pelo projeto deve conferir o UID real no Firebase Authentication e autorizar conscientemente o primeiro administrador no documento usuarios/UID, com id igual ao UID, perfil ADMIN e ativo true. Não use identificadores de demonstração. Não armazene senhas no Firestore. Recuperação de senha deve usar Firebase Auth.

Documentos legados que contenham senhas exigem revisão e migração pelo responsável; a alteração do código não remove automaticamente campos antigos do banco.

## Verificação antes de disponibilizar

Teste login e logout, aprovação e revogação de acesso, isolamento dos dados de cada professor, gravação e leitura de turmas/aulas, IA e download com cada perfil. Confira respostas 401 sem sessão, 403 sem permissão e bloqueio de URLs públicas de ZIP. Execute os testes de regras no emulador configurado; a execução depende das ferramentas do Firebase e Java.

As últimas alterações manuais precisam passar novamente por lint, build e testes integrados. A tentativa anterior de validação no AI Studio foi interrompida por limite de cota; isso não equivale a aprovação dos testes.
