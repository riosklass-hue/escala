var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_fs = __toESM(require("fs"), 1);
var import_vite = require("vite");
var import_genai = require("@google/genai");
var import_dotenv = __toESM(require("dotenv"), 1);
var import_app = require("firebase-admin/app");
var import_auth = require("firebase-admin/auth");
var import_firestore = require("firebase-admin/firestore");
var firebaseConfigFile = import_path.default.join(process.cwd(), "firebase-applet-config.json");
var firebaseConfig = import_fs.default.existsSync(firebaseConfigFile) ? JSON.parse(import_fs.default.readFileSync(firebaseConfigFile, "utf8")) : {};
import_dotenv.default.config();
var app = (0, import_express.default)();
var PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3e3;
app.use(import_express.default.json({ limit: "5mb" }));
function requireRoles(roles) {
  return async (req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    const match = /^Bearer ([^\s]+)$/i.exec(req.get("Authorization") || "");
    if (!match || match[1].length > 8192) {
      res.status(401).json({ error: "Entre novamente para acessar este recurso." });
      return;
    }
    try {
      const adminApp = (0, import_app.getApps)().find((a) => a.name === "rios-server") || (0, import_app.initializeApp)({
        credential: (0, import_app.applicationDefault)(),
        projectId: firebaseConfig.projectId
      }, "rios-server");
      const identity = await (0, import_auth.getAuth)(adminApp).verifyIdToken(match[1], true);
      const database = (0, import_firestore.getFirestore)(adminApp, firebaseConfig.firestoreDatabaseId || "(default)");
      const profile = await database.collection("usuarios").doc(identity.uid).get();
      const data = profile.data();
      if (!profile.exists || data?.ativo !== true || !roles.includes(data?.perfil)) {
        res.status(403).json({ error: "Sua conta n\xE3o possui autoriza\xE7\xE3o para este recurso." });
        return;
      }
      res.locals.authUid = identity.uid;
      next();
    } catch (error) {
      const code = String(error?.code || "");
      const invalidToken = ["auth/argument-error", "auth/invalid-id-token", "auth/id-token-expired", "auth/id-token-revoked", "auth/user-disabled", "auth/user-not-found"].includes(code);
      console.error("[RIOS] Falha de autoriza\xE7\xE3o do servidor:", code || "configuration-unavailable");
      res.status(invalidToken ? 401 : 503).json({ error: invalidToken ? "Sess\xE3o inv\xE1lida ou expirada. Entre novamente." : "Autoriza\xE7\xE3o do servidor indispon\xEDvel. Configure as credenciais Firebase Admin e o acesso ao banco do projeto." });
    }
  };
}
app.use("/api/download", requireRoles(["ADMIN"]));
app.use("/api/ai", requireRoles(["ADMIN", "GESTOR", "COORDENADOR"]));
app.use((req, res, next) => {
  let requestedPath = req.path;
  try {
    for (let i = 0; i < 3; i++) {
      const decoded = decodeURIComponent(requestedPath);
      if (decoded === requestedPath) break;
      requestedPath = decoded;
    }
  } catch {
    res.status(400).end();
    return;
  }
  if (/\.zip(?:$|[/?#])|^\/(?:private|artifacts)(?:\/|$)/i.test(requestedPath)) {
    res.status(404).end();
    return;
  }
  next();
});
var geminiClient = null;
function getGeminiClient() {
  if (!geminiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is required");
    }
    geminiClient = new import_genai.GoogleGenAI({ apiKey });
  }
  return geminiClient;
}
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    hasApiKey: !!process.env.GEMINI_API_KEY,
    system: "RIOS \u2013 Gest\xE3o de Escalas"
  });
});
app.get("/api/download/hostinger-zip", (_req, res) => {
  const possiblePaths = [import_path.default.join(process.cwd(), "private", "packages", "hostinger_public_html.zip")];
  const zipPath = possiblePaths.find((p) => import_fs.default.existsSync(p));
  if (zipPath) {
    res.setHeader("Content-Disposition", 'attachment; filename="rios_hostinger_public_html.zip"');
    res.setHeader("Content-Type", "application/zip");
    return res.download(zipPath, "rios_hostinger_public_html.zip");
  }
  return res.status(404).json({ error: "Pacote Hostinger n\xE3o encontrado. Execute o build primeiro." });
});
app.get("/api/download/codigo-fonte-zip", (_req, res) => {
  const possiblePaths = [import_path.default.join(process.cwd(), "private", "packages", "rios_codigo_fonte.zip")];
  const zipPath = possiblePaths.find((p) => import_fs.default.existsSync(p));
  if (zipPath) {
    res.setHeader("Content-Disposition", 'attachment; filename="rios_codigo_fonte.zip"');
    res.setHeader("Content-Type", "application/zip");
    return res.download(zipPath, "rios_codigo_fonte.zip");
  }
  return res.status(404).json({ error: "Pacote de c\xF3digo-fonte n\xE3o encontrado." });
});
app.post("/api/ai/ask", async (req, res) => {
  try {
    const { prompt, riosSummary } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: "Prompt \xE9 obrigat\xF3rio." });
    }
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.json({
        fallback: true,
        answer: null,
        message: "Chave GEMINI_API_KEY n\xE3o configurada. Ativando motor de regras nativo."
      });
    }
    const ai = getGeminiClient();
    const systemPrompt = `Voc\xEA \xE9 a IA assistente oficial do sistema "RIOS \u2013 GEST\xC3O DE ESCALAS".
Seu papel exclusivo \xE9 ser o ASSISTENTE DE ALOCA\xC7\xC3O E SUBSTITUI\xC7\xC3O DE PROFESSORES.

===========================================================
REGRA DE OURO DO SISTEMA (ABSOLUTA E INVIOL\xC1VEL):
===========================================================
A TURMA \xC9 FIXA.
A ESCOLA \xC9 FIXA.
A SALA \xC9 FIXA.
O HOR\xC1RIO \xC9 FIXO.
O COMPONENTE CURRICULAR \xC9 FIXO.
O CURSO \xC9 FIXO.
O PROFESSOR \xC9 O ELEMENTO QUE PODE SER MOVIMENTADO.

Voc\xEA NUNCA deve reorganizar automaticamente as turmas.
Voc\xEA NUNCA deve mudar ou sugerir mudar escolas, salas, hor\xE1rios, dias, turmas, cursos ou componentes.
Voc\xEA deve recomendar e analisar SOMENTE altera\xE7\xF5es e aloca\xE7\xF5es relativas ao PROFESSOR.

Responda sempre em portugu\xEAs brasileiro de forma direta, clara, profissional e objetiva para o gestor escolar.

===========================================================
DADOS ATUAIS DO SISTEMA RIOS:
===========================================================
${riosSummary || "Dados padr\xF5es do sistema RIOS carregados."}
`;
    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: [
        {
          role: "user",
          parts: [{ text: `${systemPrompt}

Pergunta do Gestor: "${prompt}"` }]
        }
      ]
    });
    const answer = response.text || "Sem resposta gerada.";
    return res.json({ answer, fallback: false });
  } catch (error) {
    console.error("Gemini server error:", error);
    return res.json({
      fallback: true,
      error: error?.message || "Erro de conex\xE3o com a IA.",
      answer: null
    });
  }
});
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[RIOS] Servidor operacional executando na porta ${PORT}`);
  });
}
startServer().catch((err) => {
  console.error("[RIOS] Erro fatal ao iniciar o servidor:", err);
});
//# sourceMappingURL=server.cjs.map
