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

// Health check
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    hasApiKey: !!process.env.GEMINI_API_KEY,
    system: "RIOS – Gestão de Escalas",
  });
});

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

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.json({
        fallback: true,
        answer: null,
        message: "Chave GEMINI_API_KEY não configurada. Ativando motor de regras nativo.",
      });
    }

    const ai = getGeminiClient();

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
    return res.json({ answer, fallback: false });
  } catch (error: any) {
    console.error("Gemini server error:", error);
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
