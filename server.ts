import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import type { RequestHandler } from "express";
import { initializeApp as initializeAdminApp, getApps as getAdminApps, applicationDefault } from "firebase-admin/app";
import { getAuth as getAdminAuth } from "firebase-admin/auth";
import { getFirestore as getAdminFirestore } from "firebase-admin/firestore";

const firebaseConfigFile = path.join(process.cwd(), "firebase-applet-config.json");
const firebaseConfig = fs.existsSync(firebaseConfigFile)
  ? JSON.parse(fs.readFileSync(firebaseConfigFile, "utf8"))
  : {};

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: "5mb" }));

// Every protected request verifies identity and the current, server-side access profile.
function requireRoles(roles: string[]): RequestHandler {
  return async (req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    const match = /^Bearer ([^\s]+)$/i.exec(req.get("Authorization") || "");
    if (!match || match[1].length > 8192) {
      res.status(401).json({ error: "Entre novamente para acessar este recurso." });
      return;
    }
    try {
      const adminApp = getAdminApps().find(a => a.name === "rios-server") || initializeAdminApp({
        credential: applicationDefault(), projectId: firebaseConfig.projectId,
      }, "rios-server");
      const identity = await getAdminAuth(adminApp).verifyIdToken(match[1], true);
      const database = getAdminFirestore(adminApp, firebaseConfig.firestoreDatabaseId || "(default)");
      const profile = await database.collection("usuarios").doc(identity.uid).get();
      const data = profile.data();
      if (!profile.exists || data?.ativo !== true || !roles.includes(data?.perfil)) {
        res.status(403).json({ error: "Sua conta não possui autorização para este recurso." });
        return;
      }
      res.locals.authUid = identity.uid;
      next();
    } catch (error: any) {
      const code = String(error?.code || "");
      const invalidToken = ["auth/argument-error", "auth/invalid-id-token", "auth/id-token-expired", "auth/id-token-revoked", "auth/user-disabled", "auth/user-not-found"].includes(code);
      console.error("[RIOS] Falha de autorização do servidor:", code || "configuration-unavailable");
      res.status(invalidToken ? 401 : 503).json({ error: invalidToken
        ? "Sessão inválida ou expirada. Entre novamente."
        : "Autorização do servidor indisponível. Configure as credenciais Firebase Admin e o acesso ao banco do projeto." });
    }
  };
}
app.use("/api/download", requireRoles(["ADMIN"]));
app.use("/api/ai", requireRoles(["ADMIN", "GESTOR", "COORDENADOR"]));

// ZIP packages are available only through the authenticated API, never static URLs.
app.use((req, res, next) => {
  let requestedPath = req.path;
  try {
    for (let i = 0; i < 3; i++) {
      const decoded = decodeURIComponent(requestedPath);
      if (decoded === requestedPath) break;
      requestedPath = decoded;
    }
  } catch { res.status(400).end(); return; }
  if (/\.zip(?:$|[/?#])|^\/(?:private|artifacts)(?:\/|$)/i.test(requestedPath)) {
    res.status(404).end(); return;
  }
  next();
});


// Lazy init Gemini client
let geminiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!geminiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is required");
    }
    geminiClient = new GoogleGenAI({ apiKey });
  }
  return geminiClient;
}

// Suporte oficial para integração com OpenAI API (Hostinger Node.js & class.riossistem.com.br)
async function askOpenAI(apiKey: string, systemPrompt: string, userPrompt: string): Promise<string> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Pergunta do Gestor: "${userPrompt}"` },
      ],
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "Sem resposta gerada pela OpenAI.";
}

// Health check
app.get("/api/health", (_req, res) => {
  const hasGemini = !!process.env.GEMINI_API_KEY;
  const hasOpenAI = !!process.env.OPENAI_API_KEY;

  res.json({
    status: "ok",
    hasApiKey: hasGemini || hasOpenAI,
    providers: {
      openai: hasOpenAI,
      gemini: hasGemini,
    },
    activeProvider: hasOpenAI ? "OpenAI (gpt-4o-mini)" : hasGemini ? "Gemini (gemini-3.8-flash)" : "Motor Local",
    system: "RIOS – Gestão de Escalas",
  });
});

// ==============================================================================
// Hostinger & Local Storage Engine (Persistência no Servidor)
// ==============================================================================
const storageDir = path.join(process.cwd(), "public", "api", "data");
if (!fs.existsSync(storageDir)) {
  fs.mkdirSync(storageDir, { recursive: true });
}
const dbFilePath = path.join(storageDir, "rios_database.json");
const dbBackupPath = path.join(storageDir, "rios_database_backup.json");

function readDatabase(): any {
  if (!fs.existsSync(dbFilePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(dbFilePath, "utf8"));
  } catch {
    return null;
  }
}

function writeDatabase(data: any): boolean {
  try {
    if (fs.existsSync(dbFilePath)) {
      fs.copyFileSync(dbFilePath, dbBackupPath);
    }
    const tempFile = `${dbFilePath}.tmp.${Date.now()}`;
    fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), "utf8");
    fs.renameSync(tempFile, dbFilePath);
    return true;
  } catch (err) {
    console.error("[Storage] Erro ao gravar banco:", err);
    return false;
  }
}

const handleGetDados: RequestHandler = (req, res) => {
  const action = req.query.action || "load";
  if (action === "status") {
    const exists = fs.existsSync(dbFilePath);
    const data = exists ? readDatabase() : null;
    const stat = exists ? fs.statSync(dbFilePath) : null;
    return res.json({
      success: true,
      status: "online",
      server: "Hostinger / Local Server",
      storageFileExists: exists,
      fileSizeBytes: stat ? stat.size : 0,
      lastUpdated: stat ? stat.mtime.toISOString() : null,
      stats: {
        totalTurmas: Array.isArray(data?.turmas) ? data.turmas.length : 0,
        totalProfessores: Array.isArray(data?.professores) ? data.professores.length : 0,
        totalEscolas: Array.isArray(data?.escolas) ? data.escolas.length : 0,
        totalMatrizes: Array.isArray(data?.matrizes) ? data.matrizes.length : 0,
        totalAulasMinistradas: Array.isArray(data?.aulasMinistradas) ? data.aulasMinistradas.length : 0,
      },
    });
  }

  if (action === "download_backup") {
    if (!fs.existsSync(dbFilePath)) {
      return res.status(404).json({ success: false, error: "Nenhum dado salvo ainda." });
    }
    res.setHeader("Content-Disposition", `attachment; filename="rios_backup_${new Date().toISOString().slice(0, 10)}.json"`);
    return res.sendFile(dbFilePath);
  }

  const database = readDatabase();
  return res.json({
    success: true,
    exists: !!database,
    data: database,
    lastUpdated: fs.existsSync(dbFilePath) ? fs.statSync(dbFilePath).mtime.toISOString() : null,
  });
};

const handlePostDados: RequestHandler = (req, res) => {
  const payload = req.body;
  if (!payload || typeof payload !== "object") {
    return res.status(400).json({ success: false, error: "Corpo inválido." });
  }

  const action = payload.action || req.query.action || "save_all";

  if (action === "save_doc") {
    const { collection, doc } = payload;
    if (!collection || !doc || !doc.id) {
      return res.status(400).json({ success: false, error: "Parâmetros inválidos para save_doc." });
    }
    const current = readDatabase() || {
      turmas: [],
      professores: [],
      escolas: [],
      matrizes: [],
      historico: [],
      aulasMinistradas: [],
      usuarios: [],
      auditoria: [],
    };
    if (!Array.isArray(current[collection])) {
      current[collection] = [];
    }
    const idx = current[collection].findIndex((item: any) => String(item.id) === String(doc.id));
    if (idx >= 0) {
      current[collection][idx] = { ...current[collection][idx], ...doc };
    } else {
      current[collection].push(doc);
    }
    current.ultimaAtualizacao = new Date().toISOString();
    writeDatabase(current);
    return res.json({ success: true, message: `Documento salvo em ${collection}!`, timestamp: current.ultimaAtualizacao });
  }

  if (action === "delete_doc") {
    const { collection, id } = payload;
    if (!collection || !id) {
      return res.status(400).json({ success: false, error: "Parâmetros inválidos para delete_doc." });
    }
    const current = readDatabase();
    if (current && Array.isArray(current[collection])) {
      current[collection] = current[collection].filter((item: any) => String(item.id) !== String(id));
      current.ultimaAtualizacao = new Date().toISOString();
      writeDatabase(current);
    }
    return res.json({ success: true, message: `Documento removido de ${collection}!` });
  }

  // save_all
  const dataToSave = payload.data && typeof payload.data === "object" ? payload.data : { ...payload };
  delete dataToSave.action;
  dataToSave.ultimaAtualizacao = new Date().toISOString();
  dataToSave.servidorOrigem = "Hostinger esc.riossistem.com.br";
  writeDatabase(dataToSave);
  return res.json({
    success: true,
    message: "Todas as informações foram salvas com sucesso no servidor Hostinger!",
    timestamp: dataToSave.ultimaAtualizacao,
  });
};

app.get("/api/dados", handleGetDados);
app.get("/api/dados.php", handleGetDados);
app.get("/api/storage.php", handleGetDados);
app.post("/api/dados", handlePostDados);
app.post("/api/dados.php", handlePostDados);
app.post("/api/storage.php", handlePostDados);

// Download ready-to-use Hostinger public_html.zip
app.get("/api/download/hostinger-zip", (_req, res) => {
  const possiblePaths = [path.join(process.cwd(), "private", "packages", "hostinger_public_html.zip")];
  const zipPath = possiblePaths.find((p) => fs.existsSync(p));
  if (zipPath) {
    res.setHeader("Content-Disposition", 'attachment; filename="rios_hostinger_public_html.zip"');
    res.setHeader("Content-Type", "application/zip");
    return res.download(zipPath, "rios_hostinger_public_html.zip");
  }
  return res.status(404).json({ error: "Pacote Hostinger não encontrado. Execute o build primeiro." });
});

// Download full project source code (.zip)
app.get("/api/download/codigo-fonte-zip", (_req, res) => {
  const possiblePaths = [path.join(process.cwd(), "private", "packages", "rios_codigo_fonte.zip")];
  const zipPath = possiblePaths.find((p) => fs.existsSync(p));
  if (zipPath) {
    res.setHeader("Content-Disposition", 'attachment; filename="rios_codigo_fonte.zip"');
    res.setHeader("Content-Type", "application/zip");
    return res.download(zipPath, "rios_codigo_fonte.zip");
  }
  return res.status(404).json({ error: "Pacote de código-fonte não encontrado." });
});

// API Route for AI Assistant (Grounded in RIOS Golden Rule)
app.post("/api/ai/ask", async (req, res) => {
  try {
    const { prompt, riosSummary } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: "Prompt é obrigatório." });
    }

    const openaiKey = process.env.OPENAI_API_KEY;
    const geminiKey = process.env.GEMINI_API_KEY;

    if (!openaiKey && !geminiKey) {
      return res.json({
        fallback: true,
        answer: null,
        message: "Nenhuma chave de IA (OPENAI_API_KEY ou GEMINI_API_KEY) configurada. Ativando motor de regras nativo.",
      });
    }

    const systemPrompt = `Você é a IA assistente oficial do sistema "RIOS – GESTÃO DE ESCALAS".
Seu papel exclusivo é ser o ASSISTENTE DE ALOCAÇÃO E SUBSTITUIÇÃO DE PROFESSORES.

===========================================================
REGRA DE OURO DO SISTEMA (ABSOLUTA E INVIOLÁVEL):
===========================================================
A TURMA É FIXA.
A ESCOLA É FIXA.
A SALA É FIXA.
O HORÁRIO É FIXO.
O COMPONENTE CURRICULAR É FIXO.
O CURSO É FIXO.
O PROFESSOR É O ELEMENTO QUE PODE SER MOVIMENTADO.

Você NUNCA deve reorganizar automaticamente as turmas.
Você NUNCA deve mudar ou sugerir mudar escolas, salas, horários, dias, turmas, cursos ou componentes.
Você deve recomendar e analisar SOMENTE alterações e alocações relativas ao PROFESSOR.

Responda sempre em português brasileiro de forma direta, clara, profissional e objetiva para o gestor escolar.

===========================================================
DADOS ATUAIS DO SISTEMA RIOS:
===========================================================
${riosSummary || "Dados padrões do sistema RIOS carregados."}
`;

    // 1. Tenta OpenAI se a chave estiver configurada (padrão Hostinger Node.js)
    if (openaiKey) {
      try {
        const answer = await askOpenAI(openaiKey, systemPrompt, prompt);
        return res.json({ answer, provider: "openai", fallback: false });
      } catch (err: any) {
        console.warn("[RIOS] Erro ao consultar OpenAI:", err.message);
        if (!geminiKey) {
          throw err;
        }
        console.log("[RIOS] Alternando para fallback Gemini...");
      }
    }

    // 2. Utiliza Gemini
    if (geminiKey) {
      const ai = getGeminiClient();
      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: [
          {
            role: "user",
            parts: [{ text: `${systemPrompt}\n\nPergunta do Gestor: "${prompt}"` }],
          },
        ],
      });

      const answer = response.text || "Sem resposta gerada.";
      return res.json({ answer, provider: "gemini", fallback: false });
    }

    return res.json({
      fallback: true,
      answer: null,
      message: "Falha ao consultar os provedores de IA configurados.",
    });
  } catch (error: any) {
    console.error("AI Assistant server error:", error);
    return res.json({
      fallback: true,
      error: error?.message || "Erro de conexão com a IA.",
      answer: null,
    });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[RIOS] Servidor operacional executando na porta ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("[RIOS] Erro fatal ao iniciar o servidor:", err);
});
