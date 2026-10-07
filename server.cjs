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
var portArgIndex = process.argv.indexOf("--port");
var argPort = portArgIndex !== -1 && process.argv[portArgIndex + 1] ? parseInt(process.argv[portArgIndex + 1], 10) : null;
var isDev = process.env.NODE_ENV !== "production";
var PORT = argPort || (isDev ? 3e3 : process.env.PORT ? parseInt(process.env.PORT, 10) : 3e3);
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
app.use("/api/ai/ask", (req, res, next) => {
  if (req.get("Authorization")) {
    return requireRoles(["ADMIN", "GESTOR", "COORDENADOR"])(req, res, next);
  }
  next();
});
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
    geminiClient = new import_genai.GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build"
        }
      }
    });
  }
  return geminiClient;
}
async function askOpenAI(apiKey, systemPrompt, userPrompt) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Pergunta do Gestor: "${userPrompt}"` }
      ],
      temperature: 0.7
    })
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API error (${response.status}): ${errorText}`);
  }
  const data = await response.json();
  return data.choices?.[0]?.message?.content || "Sem resposta gerada pela OpenAI.";
}
app.get("/api/health", (_req, res) => {
  const hasGemini = !!process.env.GEMINI_API_KEY;
  const hasOpenAI = !!process.env.OPENAI_API_KEY;
  res.json({
    status: "ok",
    hasApiKey: hasGemini || hasOpenAI,
    providers: {
      openai: hasOpenAI,
      gemini: hasGemini
    },
    activeProvider: hasOpenAI ? "OpenAI (gpt-4o-mini)" : hasGemini ? "Gemini (gemini-3.8-flash)" : "Motor Local",
    system: "RIOS \u2013 Gest\xE3o de Escalas"
  });
});
var storageDir = import_path.default.join(process.cwd(), "public", "api", "data");
if (!import_fs.default.existsSync(storageDir)) {
  import_fs.default.mkdirSync(storageDir, { recursive: true });
}
var dbFilePath = import_path.default.join(storageDir, "rios_database.json");
var dbBackupPath = import_path.default.join(storageDir, "rios_database_backup.json");
function readDatabase() {
  if (!import_fs.default.existsSync(dbFilePath)) return null;
  try {
    return JSON.parse(import_fs.default.readFileSync(dbFilePath, "utf8"));
  } catch {
    return null;
  }
}
function writeDatabase(data) {
  try {
    if (import_fs.default.existsSync(dbFilePath)) {
      import_fs.default.copyFileSync(dbFilePath, dbBackupPath);
    }
    const tempFile = `${dbFilePath}.tmp.${Date.now()}`;
    import_fs.default.writeFileSync(tempFile, JSON.stringify(data, null, 2), "utf8");
    import_fs.default.renameSync(tempFile, dbFilePath);
    return true;
  } catch (err) {
    console.error("[Storage] Erro ao gravar banco:", err);
    return false;
  }
}
var handleGetDados = (req, res) => {
  const action = req.query.action || "load";
  if (action === "status") {
    const exists = import_fs.default.existsSync(dbFilePath);
    const data = exists ? readDatabase() : null;
    const stat = exists ? import_fs.default.statSync(dbFilePath) : null;
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
        totalAulasMinistradas: Array.isArray(data?.aulasMinistradas) ? data.aulasMinistradas.length : 0
      }
    });
  }
  if (action === "download_backup") {
    if (!import_fs.default.existsSync(dbFilePath)) {
      return res.status(404).json({ success: false, error: "Nenhum dado salvo ainda." });
    }
    res.setHeader("Content-Disposition", `attachment; filename="rios_backup_${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}.json"`);
    return res.sendFile(dbFilePath);
  }
  const database = readDatabase();
  return res.json({
    success: true,
    exists: !!database,
    data: database,
    lastUpdated: import_fs.default.existsSync(dbFilePath) ? import_fs.default.statSync(dbFilePath).mtime.toISOString() : null
  });
};
var handlePostDados = (req, res) => {
  const payload = req.body;
  if (!payload || typeof payload !== "object") {
    return res.status(400).json({ success: false, error: "Corpo inv\xE1lido." });
  }
  const action = payload.action || req.query.action || "save_all";
  if (action === "save_doc") {
    const { collection, doc } = payload;
    if (!collection || !doc || !doc.id) {
      return res.status(400).json({ success: false, error: "Par\xE2metros inv\xE1lidos para save_doc." });
    }
    const current = readDatabase() || {
      turmas: [],
      professores: [],
      escolas: [],
      matrizes: [],
      historico: [],
      aulasMinistradas: [],
      usuarios: [],
      auditoria: []
    };
    if (!Array.isArray(current[collection])) {
      current[collection] = [];
    }
    const idx = current[collection].findIndex((item) => String(item.id) === String(doc.id));
    if (idx >= 0) {
      current[collection][idx] = { ...current[collection][idx], ...doc };
    } else {
      current[collection].push(doc);
    }
    current.ultimaAtualizacao = (/* @__PURE__ */ new Date()).toISOString();
    writeDatabase(current);
    return res.json({ success: true, message: `Documento salvo em ${collection}!`, timestamp: current.ultimaAtualizacao });
  }
  if (action === "delete_doc") {
    const { collection, id } = payload;
    if (!collection || !id) {
      return res.status(400).json({ success: false, error: "Par\xE2metros inv\xE1lidos para delete_doc." });
    }
    const current = readDatabase();
    if (current && Array.isArray(current[collection])) {
      current[collection] = current[collection].filter((item) => String(item.id) !== String(id));
      current.ultimaAtualizacao = (/* @__PURE__ */ new Date()).toISOString();
      writeDatabase(current);
    }
    return res.json({ success: true, message: `Documento removido de ${collection}!` });
  }
  const dataToSave = payload.data && typeof payload.data === "object" ? payload.data : { ...payload };
  delete dataToSave.action;
  dataToSave.ultimaAtualizacao = (/* @__PURE__ */ new Date()).toISOString();
  dataToSave.servidorOrigem = "Hostinger esc.riossistem.com.br";
  writeDatabase(dataToSave);
  return res.json({
    success: true,
    message: "Todas as informa\xE7\xF5es foram salvas com sucesso no servidor Hostinger!",
    timestamp: dataToSave.ultimaAtualizacao
  });
};
app.get("/api/dados", handleGetDados);
app.get("/api/dados.php", handleGetDados);
app.get("/api/storage.php", handleGetDados);
app.post("/api/dados", handlePostDados);
app.post("/api/dados.php", handlePostDados);
app.post("/api/storage.php", handlePostDados);
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
    const openaiKey = process.env.OPENAI_API_KEY;
    const geminiKey = process.env.GEMINI_API_KEY;
    if (!openaiKey && !geminiKey) {
      return res.json({
        fallback: true,
        answer: null,
        message: "Nenhuma chave de IA (OPENAI_API_KEY ou GEMINI_API_KEY) configurada. Ativando motor de regras nativo."
      });
    }
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
    if (openaiKey) {
      try {
        const answer = await askOpenAI(openaiKey, systemPrompt, prompt);
        return res.json({ answer, provider: "openai", fallback: false });
      } catch (err) {
        console.warn("[RIOS] Erro ao consultar OpenAI:", err.message);
        if (!geminiKey) {
          throw err;
        }
        console.log("[RIOS] Alternando para fallback Gemini...");
      }
    }
    if (geminiKey) {
      const ai = getGeminiClient();
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
      return res.json({ answer, provider: "gemini", fallback: false });
    }
    return res.json({
      fallback: true,
      answer: null,
      message: "Falha ao consultar os provedores de IA configurados."
    });
  } catch (error) {
    console.error("AI Assistant server error:", error);
    return res.json({
      fallback: true,
      error: error?.message || "Erro de conex\xE3o com a IA.",
      answer: null
    });
  }
});
app.post("/api/ai/parse-ementa", async (req, res) => {
  try {
    const { texto, instrucoes } = req.body;
    if (!texto || typeof texto !== "string" || !texto.trim()) {
      return res.status(400).json({ error: "Texto da ementa \xE9 obrigat\xF3rio." });
    }
    const openaiKey = process.env.OPENAI_API_KEY;
    const geminiKey = process.env.GEMINI_API_KEY;
    const systemPrompt = `Voc\xEA \xE9 um coordenador pedag\xF3gico e especialista em diretrizes curriculares do MEC e do Cat\xE1logo Nacional de Cursos T\xE9cnicos (CNCT).
Sua miss\xE3o \xE9 analisar textos brutos de ementas, projetos pedag\xF3gicos (PPC), planos de cursos ou grades curriculares e extrair um plano curricular completo e estruturado.

Voc\xEA DEVE responder EXCLUSIVAMENTE em formato JSON com o seguinte formato exato:
{
  "nome": "Nome oficial do curso (ex: T\xE9cnico em Enfermagem)",
  "sigla": "Sigla de 2 a 5 letras mai\xFAsculas (ex: ENF)",
  "modalidade": "Modalidade de ensino (ex: Concomitante e Subsequente)",
  "descricao": "Breve descri\xE7\xE3o do curso e perfil profissional da matriz (m\xE1x 150 caracteres)",
  "cargaHorariaTotal": 800,
  "unidades": [
    {
      "nome": "Nome padronizado da disciplina",
      "cargaHoraria": 40
    }
  ],
  "resumoIA": "Resumo pedag\xF3gico das disciplinas identificadas e distribui\xE7\xE3o da carga hor\xE1ria"
}

REGRAS:
1. Extraia e padronize todas as disciplinas e unidades curriculares identificadas no texto.
2. Cada disciplina DEVE ter uma carga hor\xE1ria em horas (n\xFAmero inteiro positivo, tipicamente 20, 40, 60, 80 ou 100 horas). Se o texto indicar horas (ex: '40h', '60 horas'), use o valor indicado. Se n\xE3o indicar, atribua uma carga coerente para atingir a soma total (ex: 800h ou 1000h).
3. Ordene as disciplinas na sequ\xEAncia pedag\xF3gica recomendada (introdu\xE7\xE3o e fundamenta\xE7\xE3o primeiro, espec\xEDficas depois, pr\xE1ticas/est\xE1gio ao final).
4. Forne\xE7a uma sigla coerente com o nome do curso.
5. Retorne APENAS o JSON puro sem marcadores Markdown.`;
    if (geminiKey) {
      try {
        const ai = getGeminiClient();
        const response = await ai.models.generateContent({
          model: "gemini-3.8-flash",
          contents: [
            {
              role: "user",
              parts: [{ text: `${systemPrompt}

Instru\xE7\xF5es adicionais do usu\xE1rio: ${instrucoes || "Nenhuma"}

TEXTO DA EMENTA A SER ANALISADA:
"""
${texto}
"""` }]
            }
          ],
          config: {
            responseMimeType: "application/json"
          }
        });
        const raw = (response.text || "").trim();
        const jsonMatch = raw.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return res.json({
            success: true,
            provider: "gemini",
            curso: parsed
          });
        }
      } catch (err) {
        console.warn("[RIOS] Erro ao consultar Gemini para ementa:", err.message);
      }
    }
    if (openaiKey) {
      try {
        const aiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${openaiKey}`
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            response_format: { type: "json_object" },
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: `Instru\xE7\xF5es: ${instrucoes || "Nenhuma"}

TEXTO DA EMENTA:
"""
${texto}
"""` }
            ],
            temperature: 0.3
          })
        });
        if (aiResponse.ok) {
          const data = await aiResponse.json();
          const content = data.choices?.[0]?.message?.content;
          if (content) {
            const parsed = JSON.parse(content);
            return res.json({
              success: true,
              provider: "openai",
              curso: parsed
            });
          }
        }
      } catch (err) {
        console.warn("[RIOS] Erro ao consultar OpenAI para ementa:", err.message);
      }
    }
    return res.status(503).json({
      success: false,
      message: "Provedores de IA indispon\xEDveis no momento."
    });
  } catch (error) {
    console.error("[RIOS] Erro ao processar ementa com IA:", error);
    return res.status(500).json({
      success: false,
      error: error?.message || "Erro interno ao processar ementa."
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
