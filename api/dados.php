<?php
/**
 * ==============================================================================
 * RIOS – GESTÃO DE ESCALAS | API DE ARMAZENAMENTO E PERSISTÊNCIA HOSTINGER
 * ==============================================================================
 * Permite salvar, carregar e sincronizar automaticamente todas as informações
 * do sistema (Turmas, Professores, Escolas, Matrizes, Histórico, Aulas e Usuários)
 * diretamente no servidor Hostinger (Apache/LiteSpeed + PHP).
 */

// 1. Cabeçalhos de Segurança e CORS
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Content-Type: application/json; charset=utf-8');

// Trata requisições OPTIONS (pre-flight)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// 2. Diretório seguro de dados (protegido contra acesso web direto)
$dataDir = __DIR__ . '/data';
if (!is_dir($dataDir)) {
    @mkdir($dataDir, 0755, true);
}

// Garante proteção via .htaccess dentro da pasta data
$htaccessFile = $dataDir . '/.htaccess';
if (!file_exists($htaccessFile)) {
    $htaccessContent = "# Bloqueio de segurança Hostinger: proíbe acesso HTTP direto aos arquivos JSON\n" .
                       "<IfModule !mod_authz_core.c>\n" .
                       "    Deny from all\n" .
                       "</IfModule>\n" .
                       "<IfModule mod_authz_core.c>\n" .
                       "    Require all denied\n" .
                       "</IfModule>\n";
    @file_put_contents($htaccessFile, $htaccessContent);
}

$dbFile = $dataDir . '/rios_database.json';
$backupFile = $dataDir . '/rios_database_backup.json';

// Função auxiliar para ler banco
function lerBanco($caminho) {
    if (!file_exists($caminho)) {
        return null;
    }
    $conteudo = @file_get_contents($caminho);
    if (!$conteudo) {
        return null;
    }
    $dados = json_decode($conteudo, true);
    return is_array($dados) ? $dados : null;
}

// Função auxiliar para gravar banco atomicamente com backup
function gravarBanco($caminho, $backupCaminho, $dados) {
    $json = json_encode($dados, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if ($json === false) {
        return false;
    }
    
    // Faz backup da versão anterior se ela existir
    if (file_exists($caminho)) {
        @copy($caminho, $backupCaminho);
    }
    
    // Grava atomicamente
    $tempFile = $caminho . '.tmp.' . uniqid();
    if (@file_put_contents($tempFile, $json, LOCK_EX) !== false) {
        if (@rename($tempFile, $caminho)) {
            return true;
        }
    }
    @unlink($tempFile);
    return (@file_put_contents($caminho, $json, LOCK_EX) !== false);
}

// Processa requisições GET (Carregar Dados ou Status)
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $action = isset($_GET['action']) ? $_GET['action'] : 'load';
    
    if ($action === 'status') {
        $existe = file_exists($dbFile);
        $tamanho = $existe ? filesize($dbFile) : 0;
        $modificado = $existe ? date('c', filemtime($dbFile)) : null;
        $dados = $existe ? lerBanco($dbFile) : null;
        
        echo json_encode([
            'success' => true,
            'status' => 'online',
            'server' => 'Hostinger',
            'storageFileExists' => $existe,
            'fileSizeBytes' => $tamanho,
            'lastUpdated' => $modificado,
            'stats' => [
                'totalTurmas' => isset($dados['turmas']) && is_array($dados['turmas']) ? count($dados['turmas']) : 0,
                'totalProfessores' => isset($dados['professores']) && is_array($dados['professores']) ? count($dados['professores']) : 0,
                'totalEscolas' => isset($dados['escolas']) && is_array($dados['escolas']) ? count($dados['escolas']) : 0,
                'totalMatrizes' => isset($dados['matrizes']) && is_array($dados['matrizes']) ? count($dados['matrizes']) : 0,
                'totalAulasMinistradas' => isset($dados['aulasMinistradas']) && is_array($dados['aulasMinistradas']) ? count($dados['aulasMinistradas']) : 0,
            ]
        ]);
        exit;
    }
    
    if ($action === 'download_backup') {
        if (!file_exists($dbFile)) {
            http_response_code(404);
            echo json_encode(['success' => false, 'error' => 'Nenhum dado salvo ainda na Hostinger.']);
            exit;
        }
        header('Content-Disposition: attachment; filename="rios_backup_hostinger_' . date('Y-m-d_His') . '.json"');
        readfile($dbFile);
        exit;
    }
    
    // Ação padrão: load
    $banco = lerBanco($dbFile);
    if ($banco === null) {
        echo json_encode([
            'success' => true,
            'exists' => false,
            'data' => null,
            'message' => 'Nenhum dado anterior encontrado na Hostinger. Pronto para inicializar.'
        ]);
        exit;
    }
    
    echo json_encode([
        'success' => true,
        'exists' => true,
        'data' => $banco,
        'lastUpdated' => date('c', filemtime($dbFile))
    ]);
    exit;
}

// Processa requisições POST (Salvar Dados, Salvar Documento, Deletar)
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = file_get_contents('php://input');
    if (empty($input)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Corpo da requisição vazio.']);
        exit;
    }
    
    $payload = json_decode($input, true);
    if (!is_array($payload)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Formato JSON inválido.']);
        exit;
    }
    
    $action = isset($payload['action']) ? $payload['action'] : (isset($_GET['action']) ? $_GET['action'] : 'save_all');
    
    // 1. Salvar documento individual (ex: turma atualizada, professor editado)
    if ($action === 'save_doc') {
        $collection = isset($payload['collection']) ? trim($payload['collection']) : '';
        $doc = isset($payload['doc']) && is_array($payload['doc']) ? $payload['doc'] : null;
        
        if (empty($collection) || !$doc || empty($doc['id'])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Parâmetros inválidos para save_doc (requer collection e doc com id).']);
            exit;
        }
        
        $banco = lerBanco($dbFile);
        if (!is_array($banco)) {
            $banco = [
                'turmas' => [],
                'professores' => [],
                'escolas' => [],
                'matrizes' => [],
                'historico' => [],
                'aulasMinistradas' => [],
                'usuarios' => [],
                'auditoria' => []
            ];
        }
        
        if (!isset($banco[$collection]) || !is_array($banco[$collection])) {
            $banco[$collection] = [];
        }
        
        // Atualiza ou insere o documento na coleção
        $docId = (string)$doc['id'];
        $encontrado = false;
        foreach ($banco[$collection] as $idx => $item) {
            if (isset($item['id']) && (string)$item['id'] === $docId) {
                $banco[$collection][$idx] = array_merge($item, $doc);
                $encontrado = true;
                break;
            }
        }
        if (!$encontrado) {
            $banco[$collection][] = $doc;
        }
        $banco['ultimaAtualizacao'] = date('c');
        
        if (gravarBanco($dbFile, $backupFile, $banco)) {
            echo json_encode([
                'success' => true,
                'message' => "Documento {$docId} salvo com sucesso na Hostinger em {$collection}!",
                'timestamp' => date('c')
            ]);
            exit;
        } else {
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => 'Falha ao gravar arquivo de banco na Hostinger.']);
            exit;
        }
    }
    
    // 2. Deletar documento individual
    if ($action === 'delete_doc') {
        $collection = isset($payload['collection']) ? trim($payload['collection']) : '';
        $docId = isset($payload['id']) ? (string)$payload['id'] : '';
        
        if (empty($collection) || empty($docId)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Parâmetros inválidos para delete_doc.']);
            exit;
        }
        
        $banco = lerBanco($dbFile);
        if (is_array($banco) && isset($banco[$collection]) && is_array($banco[$collection])) {
            $banco[$collection] = array_values(array_filter($banco[$collection], function($item) use ($docId) {
                return isset($item['id']) && (string)$item['id'] !== $docId;
            }));
            $banco['ultimaAtualizacao'] = date('c');
            gravarBanco($dbFile, $backupFile, $banco);
        }
        
        echo json_encode(['success' => true, 'message' => "Item {$docId} removido da Hostinger."]);
        exit;
    }
    
    // 3. Salvar tudo (save_all / snapshot completo do sistema)
    $dadosParaSalvar = isset($payload['data']) && is_array($payload['data']) ? $payload['data'] : $payload;
    // Remove campo de ação se tiver entrado junto
    unset($dadosParaSalvar['action']);
    
    $dadosParaSalvar['ultimaAtualizacao'] = date('c');
    $dadosParaSalvar['servidorOrigem'] = 'Hostinger esc.riossistem.com.br';
    
    if (gravarBanco($dbFile, $backupFile, $dadosParaSalvar)) {
        echo json_encode([
            'success' => true,
            'message' => 'Todas as informações do sistema foram salvas com sucesso na Hostinger!',
            'timestamp' => date('c'),
            'recordsSaved' => [
                'turmas' => isset($dadosParaSalvar['turmas']) ? count($dadosParaSalvar['turmas']) : 0,
                'professores' => isset($dadosParaSalvar['professores']) ? count($dadosParaSalvar['professores']) : 0,
                'escolas' => isset($dadosParaSalvar['escolas']) ? count($dadosParaSalvar['escolas']) : 0,
                'matrizes' => isset($dadosParaSalvar['matrizes']) ? count($dadosParaSalvar['matrizes']) : 0,
                'aulasMinistradas' => isset($dadosParaSalvar['aulasMinistradas']) ? count($dadosParaSalvar['aulasMinistradas']) : 0,
            ]
        ]);
        exit;
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Erro ao salvar informações no disco da Hostinger.']);
        exit;
    }
}

http_response_code(405);
echo json_encode(['success' => false, 'error' => 'Método HTTP não suportado.']);
