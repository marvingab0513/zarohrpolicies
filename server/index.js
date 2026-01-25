import "dotenv/config";
import bcrypt from "bcryptjs";
import express from "express";
import session from "express-session";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SESSION_SECRET = process.env.SESSION_SECRET || "dev-session-secret";
const PORT = Number(process.env.PORT || 5173);
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_CHAT_MODEL = process.env.GEMINI_CHAT_MODEL || "gemini-2.5-flash-lite";
const GEMINI_EMBED_MODEL = process.env.GEMINI_EMBED_MODEL || "text-embedding-004";

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const app = express();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
    },
  })
);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
app.use(express.static(rootDir));

const requireAuth = (req, res, next) => {
  if (!req.session?.user) {
    return res.status(401).send("Not authenticated.");
  }
  return next();
};

const requireAdmin = (req, res, next) => {
  if (!req.session?.user) {
    return res.status(401).send("Not authenticated.");
  }
  if (req.session.user.role !== "admin") {
    return res.status(403).send("Admin access required.");
  }
  return next();
};

const sanitizeFilename = (name = "") => name.replace(/[^a-zA-Z0-9._-]/g, "_");
const sanitizeText = (value = "") => String(value).replace(/\s+/g, " ").trim();

const chunkText = (text, { chunkSize = 180, overlap = 24 } = {}) => {
  const cleaned = sanitizeText(text);
  if (!cleaned) return [];
  const sentences = cleaned.split(/(?<=[.!?])\s+/);
  const chunks = [];
  let current = [];
  let currentWords = 0;

  const pushChunk = () => {
    if (!current.length) return;
    chunks.push(current.join(" "));
    if (overlap > 0) {
      const overlapWords = current.join(" ").split(/\s+/).slice(-overlap);
      current = overlapWords.length ? [overlapWords.join(" ")] : [];
      currentWords = overlapWords.length;
    } else {
      current = [];
      currentWords = 0;
    }
  };

  for (const sentence of sentences) {
    const words = sentence.split(/\s+/).filter(Boolean);
    if (!words.length) continue;
    if (currentWords + words.length > chunkSize && currentWords > 0) {
      pushChunk();
    }
    current.push(sentence);
    currentWords += words.length;
  }
  pushChunk();
  return chunks;
};

const fetchGemini = async (path, payload) => {
  if (!GEMINI_API_KEY) {
    throw new Error("Missing GEMINI_API_KEY in environment.");
  }
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${path}?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  );
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Gemini request failed.");
  }
  return response.json();
};

const embedText = async (text) => {
  const result = await fetchGemini(`${GEMINI_EMBED_MODEL}:embedContent`, {
    content: { parts: [{ text }] },
  });
  return result?.embedding?.values || [];
};

const chatWithGemini = async (prompt) => {
  const result = await fetchGemini(`${GEMINI_CHAT_MODEL}:generateContent`, {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
  });
  return result?.candidates?.[0]?.content?.parts?.[0]?.text || "";
};

const ensureDemoCompany = async () => {
  const { data: existing, error: lookupError } = await supabase
    .from("companies")
    .select("id")
    .eq("slug", "demo-company")
    .maybeSingle();
  if (lookupError) throw lookupError;
  if (existing) return existing.id;

  const { data: created, error: createError } = await supabase
    .from("companies")
    .insert({ name: "Demo Company", slug: "demo-company" })
    .select("id")
    .single();
  if (createError) throw createError;
  return created.id;
};

const extractTextFromFile = async (file) => {
  if (!file) return "";
  const mime = file.mimetype || "";
  if (mime === "application/pdf") {
    const { default: pdfParse } = await import("pdf-parse");
    const result = await pdfParse(file.buffer);
    return result.text || "";
  }
  if (mime.includes("word") || mime.includes("officedocument")) {
    const { default: mammoth } = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer: file.buffer });
    return result.value || "";
  }
  if (mime.startsWith("text/")) {
    return file.buffer.toString("utf-8");
  }
  return "";
};

app.post("/api/login", async (req, res) => {
  const { userid, password } = req.body || {};
  const identifier = String(userid || "").trim();
  if (!identifier || !password) {
    return res.status(400).send("User ID and password are required.");
  }

  if (identifier === "hrdemo" && password === "Policy@2025") {
    let demoCompanyId = null;
    try {
      demoCompanyId = await ensureDemoCompany();
    } catch (error) {
      console.error("Demo company setup failed:", error);
      return res.status(500).send("Login failed.");
    }
    const { data: demoUser, error: demoError } = await supabase
      .from("user_profiles")
      .select("id, employee_id, role, is_active, company_id")
      .eq("employee_id", identifier)
      .maybeSingle();

    if (demoError) {
      console.error("Demo login lookup failed:", demoError);
      return res.status(500).send("Login failed.");
    }

    let user = demoUser;
    if (!user) {
      const passwordHash = await bcrypt.hash(password, 10);
      const { data: created, error: createError } = await supabase
        .from("user_profiles")
        .insert({
          employee_id: identifier,
          password_hash: passwordHash,
          role: "admin",
          is_active: true,
          company_id: demoCompanyId,
        })
        .select("id, employee_id, role, is_active, company_id")
        .single();

      if (createError) {
        console.error("Demo user create failed:", createError);
        return res.status(500).send("Login failed.");
      }
      user = created;
    }

    if (user.is_active === false) {
      return res.status(401).send("Invalid credentials.");
    }

    const companyId = user.company_id || demoCompanyId;
    if (!user.company_id && companyId) {
      await supabase.from("user_profiles").update({ company_id: companyId }).eq("id", user.id);
    }
    req.session.user = { id: user.id, employeeId: user.employee_id, role: user.role, companyId };
    return res.json({ role: user.role, employeeId: user.employee_id, companyId });
  }

  const { data, error } = await supabase
    .from("user_profiles")
    .select("id, employee_id, role, password_hash, is_active, company_id")
    .eq("employee_id", identifier)
    .maybeSingle();

  if (error) {
    console.error("Login lookup failed:", error);
    return res.status(500).send("Login failed.");
  }

  if (!data || data.is_active === false) {
    return res.status(401).send("Invalid credentials.");
  }

  const isValid = await bcrypt.compare(password, data.password_hash);
  if (!isValid) {
    return res.status(401).send("Invalid credentials.");
  }

  req.session.user = {
    id: data.id,
    employeeId: data.employee_id,
    role: data.role,
    companyId: data.company_id,
  };
  return res.json({ role: data.role, employeeId: data.employee_id, companyId: data.company_id });
});

app.get("/api/session", (req, res) => {
  if (!req.session?.user) {
    return res.status(401).send("Not authenticated.");
  }
  return res.json(req.session.user);
});

app.post("/api/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ ok: true });
  });
});

app.post("/api/upload", requireAdmin, upload.single("file"), async (req, res) => {
  const { policyId } = req.body || {};
  const file = req.file;
  if (!policyId) {
    return res.status(400).send("Missing policy ID.");
  }
  if (!file) {
    return res.status(400).send("Missing file.");
  }

  const timestamp = Date.now();
  const safeName = sanitizeFilename(file.originalname);
  const filePath = `private/${policyId}/${timestamp}-${safeName}`;

  const { data: uploadData, error: uploadError } = await supabase.storage
    .from("policy-files")
    .upload(filePath, file.buffer, { contentType: file.mimetype, upsert: false });

  if (uploadError) {
    console.error("Storage upload failed:", uploadError);
    return res.status(500).send(uploadError.message || "Upload failed.");
  }

  const storedPath = uploadData?.path || filePath;
  const { data: documentRow, error: insertError } = await supabase
    .from("policy_documents")
    .insert({
      policy_id: policyId,
      file_path: storedPath,
      uploaded_by: req.session.user.id,
      company_id: req.session.user.companyId,
    })
    .select("id")
    .single();

  if (insertError) {
    console.error("Insert failed:", insertError);
    return res.status(500).send(insertError.message || "Upload failed.");
  }

  try {
    const extracted = sanitizeText(await extractTextFromFile(file));
    if (extracted) {
      const chunks = chunkText(extracted);
      const embeddings = [];
      for (const chunk of chunks) {
        const embedding = await embedText(chunk);
        embeddings.push({ chunk, embedding });
      }
      const payload = embeddings.map(({ chunk, embedding }) => ({
        policy_id: policyId,
        company_id: req.session.user.companyId,
        document_id: documentRow.id,
        chunk_text: chunk,
        embedding,
      }));
      if (payload.length) {
        const { error: chunkError } = await supabase.from("policy_chunks").insert(payload);
        if (chunkError) {
          console.error("Chunk insert failed:", chunkError);
        }
      }
    }
  } catch (error) {
    console.error("Document indexing failed:", error);
  }

  return res.json({ filePath: storedPath });
});

app.get("/api/policy-documents", requireAuth, async (req, res) => {
  const policyId = req.query.policyId;
  if (!policyId) {
    return res.status(400).send("Missing policy ID.");
  }

  const { data, error } = await supabase
    .from("policy_documents")
    .select("file_path, uploaded_at")
    .eq("policy_id", policyId)
    .eq("company_id", req.session.user.companyId)
    .order("uploaded_at", { ascending: false });

  if (error) {
    console.error("Policy documents fetch failed:", error);
    return res.status(500).send("Failed to load policy files.");
  }

  const files = data || [];
  const signedFiles = await Promise.all(
    files.map(async (file) => {
      if (!file.file_path) return { ...file, url: null };
      const { data: signed, error: signedError } = await supabase.storage
        .from("policy-files")
        .createSignedUrl(file.file_path, 60 * 10);
      if (signedError) {
        console.error("Signed URL error:", signedError);
        return { ...file, url: null };
      }
      return { ...file, url: signed?.signedUrl || null };
    })
  );

  return res.json(signedFiles);
});

app.delete("/api/policy-documents", requireAdmin, async (req, res) => {
  const { policyId, filePath } = req.body || {};
  if (!policyId || !filePath) {
    return res.status(400).send("Missing policy ID or file path.");
  }

  const { data: documentRow } = await supabase
    .from("policy_documents")
    .select("id")
    .eq("policy_id", policyId)
    .eq("file_path", filePath)
    .eq("company_id", req.session.user.companyId)
    .maybeSingle();

  if (documentRow?.id) {
    const { error: chunkDeleteError } = await supabase
      .from("policy_chunks")
      .delete()
      .eq("document_id", documentRow.id);
    if (chunkDeleteError) {
      console.error("Chunk delete failed:", chunkDeleteError);
      return res.status(500).send("Failed to delete file.");
    }
  }

  const { error: storageError } = await supabase.storage.from("policy-files").remove([filePath]);
  if (storageError) {
    console.error("Storage delete failed:", storageError);
    return res.status(500).send(storageError.message || "Failed to delete file.");
  }

  const { error: deleteError } = await supabase
    .from("policy_documents")
    .delete()
    .eq("policy_id", policyId)
    .eq("file_path", filePath)
    .eq("company_id", req.session.user.companyId);

  if (deleteError) {
    console.error("Document delete failed:", deleteError);
    return res.status(500).send(deleteError.message || "Failed to delete file record.");
  }

  return res.json({ success: true });
});

app.post("/api/policy-documents/delete", requireAdmin, async (req, res) => {
  const { policyId, filePath } = req.body || {};
  if (!policyId || !filePath) {
    return res.status(400).send("Missing policy ID or file path.");
  }

  const { data: documentRow } = await supabase
    .from("policy_documents")
    .select("id")
    .eq("policy_id", policyId)
    .eq("file_path", filePath)
    .eq("company_id", req.session.user.companyId)
    .maybeSingle();

  if (documentRow?.id) {
    const { error: chunkDeleteError } = await supabase
      .from("policy_chunks")
      .delete()
      .eq("document_id", documentRow.id);
    if (chunkDeleteError) {
      console.error("Chunk delete failed:", chunkDeleteError);
      return res.status(500).send("Failed to delete file.");
    }
  }

  const { error: storageError } = await supabase.storage.from("policy-files").remove([filePath]);
  if (storageError) {
    console.error("Storage delete failed:", storageError);
    return res.status(500).send(storageError.message || "Failed to delete file.");
  }

  const { error: deleteError } = await supabase
    .from("policy_documents")
    .delete()
    .eq("policy_id", policyId)
    .eq("file_path", filePath)
    .eq("company_id", req.session.user.companyId);

  if (deleteError) {
    console.error("Document delete failed:", deleteError);
    return res.status(500).send(deleteError.message || "Failed to delete file record.");
  }

  return res.json({ success: true });
});

app.post("/api/chat", requireAuth, async (req, res) => {
  const question = sanitizeText(req.body?.question || "");
  if (!question) {
    return res.status(400).send("Question is required.");
  }
  if (!req.session.user.companyId) {
    return res.status(400).send("Company not configured.");
  }

  try {
    const queryEmbedding = await embedText(question);
    if (!queryEmbedding.length) {
      return res.status(500).send("Embedding failed.");
    }
    const { data: matches, error: matchError } = await supabase.rpc("match_policy_chunks", {
      query_embedding: queryEmbedding,
      match_count: 12,
      filter_company: req.session.user.companyId,
    });
    if (matchError) {
      console.error("Chunk match failed:", matchError);
      return res.status(500).send("Unable to search policies.");
    }

    const filtered = (matches || []).filter((row) => (row.similarity || 0) >= 0.15);
    const context = filtered
      .slice(0, 5)
      .map((row, index) => `Source ${index + 1}:\n${row.chunk_text.slice(0, 800)}`)
      .join("\n\n");

    const hasSources = Boolean(context);
    const systemPrompt =
      "You are an HR policy assistant.\n\n" +
      "STRICT OUTPUT RULES:\n" +
      "- Answer ONLY from the provided sources.\n" +
      "- Respond in ONE format ONLY:\n" +
      "  • Exactly 3 bullet points (max), OR\n" +
      "  • 2–3 short sentences (max).\n" +
      "- No headings, no explanations, no source references.\n" +
      "- Ignore exceptions unless explicitly asked.\n" +
      "- Write for an employee reading on a small screen.\n\n" +
      'If the information is not clearly present, respond with:\n"Not mentioned in the policy."';
    const prompt = `System:\n${systemPrompt}\n\nSources:\n${context || "None"}\n\nQuestion:\n${question}\n\nAnswer:`;
    const answer = await chatWithGemini(prompt);

    return res.json({
      answer: answer || "I don't have enough information to answer that.",
      sources: matches || [],
    });
  } catch (error) {
    console.error("Chat failed:", error);
    return res.status(500).send("Unable to answer question.");
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
